import { useState } from 'react'
import { useNotifications } from '../../../hooks/useNotifications'
import { notificationApi } from '../../../lib/api/notification.api'
import { formatDate } from '../../../lib/utils/format'

const CATEGORIES = ['ALL', 'MESSAGES', 'DOCUMENTS', 'APPROVALS', 'AI', 'BILLING', 'CALENDAR', 'SYSTEM']

const priorityColor = (p: string) =>
  p === 'URGENT' ? 'bg-red-100 text-red-700' : p === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [category, setCategory] = useState('ALL')
  const [archiving, setArchiving] = useState<string | null>(null)

  const filtered = category === 'ALL' ? notifications : notifications.filter((n) => n.category === category)

  const handleArchive = async (id: string) => {
    setArchiving(id)
    await notificationApi.archive(id).catch(() => null)
    setArchiving(null)
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-indigo-600 font-medium hover:underline">
            Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${category === c ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">No notifications in this category.</div>
        )}
        {filtered.map((notif) => (
          <div
            key={notif.id}
            className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${!notif.isRead ? 'border-indigo-200 bg-indigo-50/30' : ''}`}
          >
            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.isRead ? 'bg-gray-200' : 'bg-indigo-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-900">{notif.title}</span>
                {notif.pinned && <span className="text-xs text-amber-600">Pinned</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(notif.priority)}`}>{notif.priority}</span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-gray-400">{formatDate(notif.createdAt)}</span>
                {notif.actionUrl && (
                  <a href={notif.actionUrl} className="text-xs text-indigo-600 hover:underline">View</a>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!notif.isRead && (
                <button onClick={() => markRead(notif.id)} className="text-xs text-indigo-600 hover:underline">Read</button>
              )}
              <button
                onClick={() => handleArchive(notif.id)}
                disabled={archiving === notif.id}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
