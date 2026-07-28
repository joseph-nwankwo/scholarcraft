import { useEffect, useState, useCallback } from 'react'
import { useSocket } from './useSocket'
import { messagingApi } from '../lib/api/messaging.api'

interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  messageType: string
  edited: boolean
  deleted: boolean
  threadId: string | null
  createdAt: string
  updatedAt: string
  sender: { id: string; name: string; avatarUrl: string | null }
  reactions: unknown[]
}

export function useMessages(conversationId: string) {
  const socket = useSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    messagingApi.getMessages(conversationId, { limit: 50 })
      .then((res) => setMessages(res.data.data ?? []))
      .catch(() => null)
      .finally(() => setLoading(false))

    socket.emit('conversation:join', { conversationId })

    return () => {
      socket.emit('conversation:leave', { conversationId })
    }
  }, [conversationId])

  useEffect(() => {
    const onNew = (msg: Message) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg])
      }
    }

    const onEdited = (msg: Message) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)))
      }
    }

    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }

    const onTypingStart = ({ userId }: { userId: string; conversationId: string }) => {
      setTypingUsers((prev) => new Set(prev).add(userId))
    }

    const onTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => { const s = new Set(prev); s.delete(userId); return s })
    }

    socket.on('message:new', onNew)
    socket.on('message:edited', onEdited)
    socket.on('message:deleted', onDeleted)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)

    return () => {
      socket.off('message:new', onNew)
      socket.off('message:edited', onEdited)
      socket.off('message:deleted', onDeleted)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
    }
  }, [socket, conversationId])

  const sendMessage = useCallback((content: string, opts?: { threadId?: string; attachments?: unknown[] }) => {
    socket.emit('message:send', { conversationId, content, ...opts })
  }, [socket, conversationId])

  const startTyping = useCallback(() => {
    socket.emit('typing:start', { conversationId })
  }, [socket, conversationId])

  const stopTyping = useCallback(() => {
    socket.emit('typing:stop', { conversationId })
  }, [socket, conversationId])

  const markRead = useCallback(() => {
    socket.emit('message:read', { conversationId })
    messagingApi.markRead(conversationId).catch(() => null)
  }, [socket, conversationId])

  return { messages, loading, typingUsers, sendMessage, startTyping, stopTyping, markRead }
}
