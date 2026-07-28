import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { calendarApi } from '../../../lib/api/calendar.api'
import { formatDate } from '../../../lib/utils/format'

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  eventType: string
  startAt: string
  endAt: string
  allDay: boolean
  location: string | null
  meetingUrl: string | null
  color: string | null
  creator: { id: string; name: string; avatarUrl: string | null }
}

const EVENT_TYPES = ['MEETING', 'LECTURE', 'DEADLINE', 'APPROVAL', 'ASSIGNMENT', 'REMINDER', 'OTHER']

const typeColor = (t: string) => ({
  MEETING: 'bg-blue-100 text-blue-700',
  LECTURE: 'bg-indigo-100 text-indigo-700',
  DEADLINE: 'bg-red-100 text-red-700',
  APPROVAL: 'bg-amber-100 text-amber-700',
  ASSIGNMENT: 'bg-green-100 text-green-700',
  REMINDER: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-600',
} as Record<string, string>)[t] ?? 'bg-gray-100 text-gray-600'

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', eventType: 'MEETING',
    startAt: '', endAt: '', location: '', meetingUrl: '', allDay: false,
  })

  const load = () => {
    calendarApi.list().then((res) => setEvents(res.data.data ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await calendarApi.create({
        ...form,
        eventType: form.eventType,
      })
      setShowCreate(false)
      setForm({ title: '', description: '', eventType: 'MEETING', startAt: '', endAt: '', location: '', meetingUrl: '', allDay: false })
      load()
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return
    await calendarApi.delete(id).catch(() => null)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    const date = new Date(ev.startAt).toDateString()
    ;(acc[date] ??= []).push(ev)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          + New Event
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Create Event</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" required
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm" required
                    value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm" required
                    value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
                  {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting URL (optional)</label>
                <input type="url" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg px-4 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl text-gray-400">
          No events scheduled. Create your first event.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">{date}</h2>
              <div className="space-y-2">
                {dayEvents.map((ev) => (
                  <div key={ev.id} className="bg-white border rounded-xl p-4 flex items-start gap-4">
                    <div className={`w-2 h-full min-h-[2rem] rounded-full flex-shrink-0 ${ev.color ?? 'bg-indigo-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{ev.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor(ev.eventType)}`}>{ev.eventType}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {ev.allDay ? 'All day' : `${formatDate(ev.startAt)} – ${formatDate(ev.endAt)}`}
                      </div>
                      {ev.location && <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><MapPin className="h-3 w-3 shrink-0" />{ev.location}</div>}
                      {ev.meetingUrl && (
                        <a href={ev.meetingUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline mt-0.5 block">Join meeting</a>
                      )}
                      {ev.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ev.description}</p>}
                    </div>
                    <button onClick={() => handleDelete(ev.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
