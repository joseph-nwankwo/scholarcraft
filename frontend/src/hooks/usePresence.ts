import { useEffect, useState } from 'react'
import { useSocket } from './useSocket'

type PresenceStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'

interface PresenceUpdate {
  userId: string
  status: PresenceStatus
  statusText?: string
  lastSeenAt: string
}

export function usePresence(userIds: string[]): Map<string, PresenceStatus> {
  const socket = useSocket()
  const [presence, setPresence] = useState<Map<string, PresenceStatus>>(new Map())

  useEffect(() => {
    const handler = (update: PresenceUpdate) => {
      if (userIds.includes(update.userId)) {
        setPresence((prev) => new Map(prev).set(update.userId, update.status))
      }
    }
    socket.on('presence:update', handler)
    return () => { socket.off('presence:update', handler) }
  }, [socket, userIds.join(',')])

  return presence
}

export function useMyPresence() {
  const socket = useSocket()

  const setStatus = (status: PresenceStatus, statusText?: string) => {
    socket.emit('presence:set', { status, statusText })
  }

  return { setStatus }
}
