import { useEffect, useState, useCallback } from 'react'
import { useSocket } from './useSocket'
import { notificationApi } from '../lib/api/notification.api'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  pinned: boolean
  archived: boolean
  priority: string
  category: string
  actionUrl: string | null
  createdAt: string
}

export function useNotifications() {
  const socket = useSocket()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    notificationApi.list({ limit: 30 }).then((res) => {
      setNotifications(res.data.items ?? [])
      setUnreadCount(res.data.unreadCount ?? 0)
    }).catch(() => null)
  }, [])

  useEffect(() => {
    const onNew = (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev])
      setUnreadCount((c) => c + 1)
    }
    socket.on('notification:new', onNew)
    return () => { socket.off('notification:new', onNew) }
  }, [socket])

  const markRead = useCallback(async (id: string) => {
    await notificationApi.markRead(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await notificationApi.markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, markRead, markAllRead }
}
