import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { workspaceApi } from '../../../lib/api/workspace.api'
import { formatDate } from '../../../lib/utils/format'
import { ROUTES } from '../../../constants/routes'

interface ActivityItem {
  id: string
  action: string
  entityTitle: string | null
  createdAt: string
  actor: { id: string; name: string; avatarUrl: string | null }
}

interface CalendarEvent {
  id: string
  title: string
  eventType: string
  startAt: string
}

interface Dashboard {
  workspace: { id: string; name: string; description: string | null; owner: { name: string } }
  recentActivity: ActivityItem[]
  upcomingEvents: CalendarEvent[]
  memberCount: number
}

export default function WorkspaceDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    workspaceApi.getDashboard(id)
      .then((res) => setData(res.data.data))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  if (!data) return <div className="text-center py-16 text-gray-400">Workspace not found.</div>

  const actionLabel = (action: string) =>
    action.split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl font-bold text-indigo-600">
          {data.workspace.name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.workspace.name}</h1>
          {data.workspace.description && <p className="text-sm text-gray-500">{data.workspace.description}</p>}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => navigate(ROUTES.MESSAGES)}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Messages
          </button>
          <button
            onClick={() => navigate(ROUTES.CALENDAR)}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Calendar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{data.memberCount}</div>
          <div className="text-sm text-gray-500 mt-1">Members</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{data.recentActivity.length}</div>
          <div className="text-sm text-gray-500 mt-1">Recent Activities</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{data.upcomingEvents.length}</div>
          <div className="text-sm text-gray-500 mt-1">Upcoming Events</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.recentActivity.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                    {item.actor.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-gray-800">{item.actor.name}</span>
                    <span className="text-sm text-gray-500"> {actionLabel(item.action)}</span>
                    {item.entityTitle && <span className="text-sm font-medium text-gray-700"> "{item.entityTitle}"</span>}
                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(item.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Upcoming Events</h2>
          {data.upcomingEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming events.</p>
          ) : (
            <ul className="space-y-3">
              {data.upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{event.title}</div>
                    <div className="text-xs text-gray-400">{formatDate(event.startAt)}</div>
                  </div>
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    {event.eventType}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
