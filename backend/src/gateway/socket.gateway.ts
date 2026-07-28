import { Server as HTTPServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { presenceService } from '../services/presence/presence.service'
import { messageService } from '../services/messaging/message.service'
import { conversationService } from '../services/messaging/conversation.service'
import type { UserRole } from '@prisma/client'

interface AuthPayload {
  userId: string
  email: string
  role: UserRole
  institutionId: string | null
  roleSlug: string
}

interface AuthenticatedSocket extends Socket {
  user: AuthPayload
}

// Rate limiting: track message counts per socket
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const MAX_MESSAGES_PER_WINDOW = 30
const RATE_WINDOW_MS = 10_000

function checkRateLimit(socketId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(socketId)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(socketId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_MESSAGES_PER_WINDOW) return false
  entry.count++
  return true
}

// Typing state: conversationId -> Map<userId, timeout>
const typingTimers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>()

export function createSocketGateway(httpServer: HTTPServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: env.FRONTEND_URL ?? '*', credentials: true },
    pingInterval: 25_000,
    pingTimeout: 20_000,
    transports: ['websocket', 'polling'],
  })

  // JWT authentication middleware
  io.use((socket: Socket, next) => {
    const token =
      (socket.handshake.auth as Record<string, string>).token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '')

    if (!token) return next(new Error('AUTH_REQUIRED'))

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload
      ;(socket as AuthenticatedSocket).user = payload
      next()
    } catch {
      next(new Error('INVALID_TOKEN'))
    }
  })

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket
    const { userId, institutionId } = socket.user

    // Join personal and institution rooms
    socket.join(`user:${userId}`)
    if (institutionId) socket.join(`institution:${institutionId}`)

    presenceService.heartbeat(userId).catch(() => null)

    // Broadcast presence to institution
    if (institutionId) {
      socket.to(`institution:${institutionId}`).emit('presence:update', {
        userId,
        status: 'ONLINE',
        lastSeenAt: new Date(),
      })
    }

    // ── Heartbeat ──────────────────────────────────────────────────
    socket.on('heartbeat', () => {
      presenceService.heartbeat(userId).catch(() => null)
      socket.emit('heartbeat:ack', { ts: Date.now() })
    })

    // ── Presence ───────────────────────────────────────────────────
    socket.on('presence:set', async ({ status, statusText }) => {
      await presenceService.setPresence(userId, status, statusText).catch(() => null)
      if (institutionId) {
        io.to(`institution:${institutionId}`).emit('presence:update', { userId, status, statusText, lastSeenAt: new Date() })
      }
    })

    // ── Conversation rooms ─────────────────────────────────────────
    socket.on('conversation:join', async ({ conversationId }: { conversationId: string }) => {
      socket.join(`conv:${conversationId}`)
      socket.emit('conversation:joined', { conversationId })
    })

    socket.on('conversation:leave', ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conv:${conversationId}`)
    })

    // ── Messaging ─────────────────────────────────────────────────
    socket.on('message:send', async (data: {
      conversationId: string; content: string; messageType?: string; attachments?: unknown[]; threadId?: string
    }) => {
      if (!checkRateLimit(socket.id)) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many messages' })
        return
      }

      try {
        const message = await messageService.send({
          conversationId: data.conversationId,
          senderId: userId,
          content: data.content,
          messageType: data.messageType as never,
          attachments: data.attachments,
          threadId: data.threadId,
        })

        io.to(`conv:${data.conversationId}`).emit('message:new', message)
      } catch (err: unknown) {
        const e = err as Error
        socket.emit('error', { code: 'MESSAGE_FAILED', message: e.message })
      }
    })

    socket.on('message:edit', async ({ messageId, content }: { messageId: string; content: string }) => {
      try {
        const message = await messageService.edit(messageId, userId, content)
        io.to(`conv:${message.conversationId}`).emit('message:edited', message)
      } catch (err: unknown) {
        const e = err as Error
        socket.emit('error', { code: 'EDIT_FAILED', message: e.message })
      }
    })

    socket.on('message:delete', async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      try {
        await messageService.delete(messageId, userId)
        io.to(`conv:${conversationId}`).emit('message:deleted', { messageId, conversationId })
      } catch (err: unknown) {
        const e = err as Error
        socket.emit('error', { code: 'DELETE_FAILED', message: e.message })
      }
    })

    socket.on('message:react', async ({ messageId, emoji, conversationId }: { messageId: string; emoji: string; conversationId: string }) => {
      try {
        const result = await messageService.react(messageId, userId, emoji)
        io.to(`conv:${conversationId}`).emit('message:reaction', { messageId, userId, emoji, action: result.action })
      } catch {
        // non-fatal
      }
    })

    socket.on('message:read', async ({ conversationId }: { conversationId: string }) => {
      try {
        await conversationService.markRead(conversationId, userId)
        socket.to(`conv:${conversationId}`).emit('message:read', { conversationId, userId, readAt: new Date() })
      } catch {
        // non-fatal
      }
    })

    // ── Typing indicators ──────────────────────────────────────────
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', { conversationId, userId })

      if (!typingTimers.has(conversationId)) typingTimers.set(conversationId, new Map())
      const convTimers = typingTimers.get(conversationId)!
      const existing = convTimers.get(userId)
      if (existing) clearTimeout(existing)

      convTimers.set(userId, setTimeout(() => {
        io.to(`conv:${conversationId}`).emit('typing:stop', { conversationId, userId })
        convTimers.delete(userId)
      }, 5000))
    })

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      const convTimers = typingTimers.get(conversationId)
      if (convTimers) {
        const t = convTimers.get(userId)
        if (t) clearTimeout(t)
        convTimers.delete(userId)
      }
      socket.to(`conv:${conversationId}`).emit('typing:stop', { conversationId, userId })
    })

    // ── Workspace rooms ────────────────────────────────────────────
    socket.on('workspace:join', ({ workspaceId }: { workspaceId: string }) => {
      socket.join(`workspace:${workspaceId}`)
      socket.emit('workspace:joined', { workspaceId })
    })

    socket.on('workspace:leave', ({ workspaceId }: { workspaceId: string }) => {
      socket.leave(`workspace:${workspaceId}`)
    })

    // ── Disconnect ─────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      rateLimits.delete(socket.id)
      await presenceService.setOffline(userId).catch(() => null)
      if (institutionId) {
        io.to(`institution:${institutionId}`).emit('presence:update', {
          userId,
          status: 'OFFLINE',
          lastSeenAt: new Date(),
        })
      }
    })
  })

  // Stale presence sweep every 2 minutes
  setInterval(() => presenceService.sweepStale().catch(() => null), 2 * 60 * 1000)

  return io
}

// Helper to emit notifications to a specific user's socket room
export function emitToUser(io: SocketServer, userId: string, event: string, data: unknown) {
  io.to(`user:${userId}`).emit(event, data)
}

export function emitToInstitution(io: SocketServer, institutionId: string, event: string, data: unknown) {
  io.to(`institution:${institutionId}`).emit(event, data)
}

export function emitToConversation(io: SocketServer, conversationId: string, event: string, data: unknown) {
  io.to(`conv:${conversationId}`).emit(event, data)
}
