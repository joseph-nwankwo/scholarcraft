import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Megaphone, FileText, CalendarDays, BarChart2,
  Loader2, Pin, MapPin, Video, Clock, CheckCircle2, BookOpen,
  ClipboardCheck, Star, UserCheck, Zap, Copy, Check,
  MessageSquare, CheckCheck, Trash2, Plus,
} from 'lucide-react'
import { classConnectApi, type LCDiscussionThread, type LCDiscussionReply } from '@/lib/api/lecturecraft.api'
import { cn } from '@/lib/utils'

type Tab = 'announcements' | 'materials' | 'schedule' | 'polls' | 'assignments' | 'grades' | 'attendance' | 'discussions' | 'ai-boost'

export default function ClassDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const [tab, setTab] = useState<Tab>('announcements')

  const { data: announcements = [], isLoading: loadingAnnos } = useQuery({
    queryKey: ['lc-announcements', courseId],
    queryFn:  () => classConnectApi.getAnnouncements(courseId!),
    enabled:  !!courseId,
  })

  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ['lc-materials', courseId],
    queryFn:  () => classConnectApi.getMaterials(courseId!),
    enabled:  !!courseId,
  })

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['lc-sessions', courseId],
    queryFn:  () => classConnectApi.getSessions(courseId!),
    enabled:  !!courseId,
  })

  const { data: polls = [], isLoading: loadingPolls } = useQuery({
    queryKey: ['lc-polls', courseId],
    queryFn:  () => classConnectApi.getPolls(courseId!),
    enabled:  !!courseId,
  })

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['lc-assignments', courseId],
    queryFn:  () => classConnectApi.getAssignments(courseId!),
    enabled:  !!courseId,
  })

  const { data: attendanceEntries = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['lc-attendance', courseId],
    queryFn:  () => classConnectApi.getAttendance(courseId!),
    enabled:  !!courseId,
  })

  const respondMutation = useMutation({
    mutationFn: ({ pollId, option }: { pollId: string; option: number }) =>
      classConnectApi.respondToPoll(courseId!, pollId, option),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['lc-polls', courseId] }),
  })

  const submitMutation = useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: string; payload: { submissionUrl?: string; textContent?: string } }) =>
      classConnectApi.submitAssignment(courseId!, assignmentId, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['lc-assignments', courseId] }),
  })

  const [embeddedSessionId, setEmbeddedSessionId] = useState<string | null>(null)
  const [submittingId, setSubmittingId]           = useState<string | null>(null)
  const [submissionInputs, setSubmissionInputs] = useState<Record<string, { url: string; text: string }>>({})
  const [showSubmitForm, setShowSubmitForm]     = useState<string | null>(null)
  const [copied, setCopied]                     = useState(false)
  const [boostActive, setBoostActive]           = useState(() => localStorage.getItem('sc_ai_boost_courseId') === courseId)

  // Discussion board state
  const [discussions, setDiscussions]           = useState<LCDiscussionThread[]>([])
  const [loadingDisc, setLoadingDisc]           = useState(false)
  const [discLoaded, setDiscLoaded]             = useState(false)
  const [expandedThread, setExpandedThread]     = useState<string | null>(null)
  const [threadReplies, setThreadReplies]       = useState<Record<string, LCDiscussionReply[]>>({})
  const [loadingReplies, setLoadingReplies]     = useState<string | null>(null)
  const [replyInputs, setReplyInputs]           = useState<Record<string, string>>({})
  const [savingReply, setSavingReply]           = useState<string | null>(null)
  const [showThreadForm, setShowThreadForm]     = useState(false)
  const [threadTitle, setThreadTitle]           = useState('')
  const [threadBody, setThreadBody]             = useState('')
  const [savingThread, setSavingThread]         = useState(false)

  async function loadDiscussions() {
    if (!courseId || discLoaded) return
    setLoadingDisc(true)
    try {
      const data = await classConnectApi.getDiscussions(courseId)
      setDiscussions(data)
      setDiscLoaded(true)
    } catch { /* silent */ }
    finally { setLoadingDisc(false) }
  }

  async function handleCreateThread() {
    if (!courseId || !threadTitle.trim() || !threadBody.trim()) return
    setSavingThread(true)
    try {
      const item = await classConnectApi.createDiscussion(courseId, { title: threadTitle.trim(), body: threadBody.trim() })
      setDiscussions((prev) => [item, ...prev])
      setThreadTitle(''); setThreadBody(''); setShowThreadForm(false)
    } catch { /* silent */ }
    finally { setSavingThread(false) }
  }

  async function handleDeleteThread(threadId: string) {
    if (!courseId || !confirm('Delete this thread?')) return
    await classConnectApi.deleteDiscussion(courseId, threadId)
    setDiscussions((prev) => prev.filter((t) => t.id !== threadId))
    if (expandedThread === threadId) setExpandedThread(null)
  }

  async function handleExpandThread(threadId: string) {
    if (expandedThread === threadId) { setExpandedThread(null); return }
    setExpandedThread(threadId)
    if (threadReplies[threadId]) return
    setLoadingReplies(threadId)
    try {
      const replies = await classConnectApi.getThreadReplies(courseId!, threadId)
      setThreadReplies((prev) => ({ ...prev, [threadId]: replies }))
    } catch { /* silent */ }
    finally { setLoadingReplies(null) }
  }

  async function handleReply(threadId: string) {
    if (!courseId) return
    const body = (replyInputs[threadId] ?? '').trim()
    if (!body) return
    setSavingReply(threadId)
    try {
      const reply = await classConnectApi.addReply(courseId, threadId, body)
      setThreadReplies((prev) => ({ ...prev, [threadId]: [...(prev[threadId] ?? []), reply] }))
      setDiscussions((prev) => prev.map((t) => t.id === threadId ? { ...t, _count: { replies: t._count.replies + 1 } } : t))
      setReplyInputs((prev) => ({ ...prev, [threadId]: '' }))
    } catch { /* silent */ }
    finally { setSavingReply(null) }
  }

  async function handleDeleteReply(threadId: string, replyId: string) {
    if (!courseId || !confirm('Delete this reply?')) return
    await classConnectApi.deleteReply(courseId, threadId, replyId)
    setThreadReplies((prev) => ({ ...prev, [threadId]: (prev[threadId] ?? []).filter((r) => r.id !== replyId) }))
    setDiscussions((prev) => prev.map((t) => t.id === threadId ? { ...t, _count: { replies: Math.max(0, t._count.replies - 1) } } : t))
  }

  function buildAiContext() {
    const lines: string[] = [`=== Class Context: ${courseId} ===`]
    if (announcements.length > 0) {
      lines.push('\n[Announcements]')
      announcements.slice(0, 3).forEach((a) => lines.push(`• ${a.title}: ${a.content.slice(0, 200)}`))
    }
    if (assignments.length > 0) {
      lines.push('\n[Assignments]')
      assignments.forEach((a) => lines.push(`• ${a.title}${a.dueDate ? ` (due ${new Date(a.dueDate).toLocaleDateString()})` : ''}${a.totalMarks ? ` — ${a.totalMarks} marks` : ''}${a.description ? `: ${a.description.slice(0, 150)}` : ''}`))
    }
    if (materials.length > 0) {
      lines.push('\n[Materials]')
      materials.forEach((m) => lines.push(`• ${m.title} (${m.type?.toLowerCase().replace('_', ' ')})`))
    }
    if (sessions.length > 0) {
      const upcoming = sessions.filter((s) => new Date(s.scheduledAt) >= new Date())
      if (upcoming.length > 0) {
        lines.push('\n[Upcoming Sessions]')
        upcoming.slice(0, 3).forEach((s) => lines.push(`• ${s.title} — ${new Date(s.scheduledAt).toLocaleString()}`))
      }
    }
    return lines.join('\n')
  }

  async function handleCopyContext() {
    await navigator.clipboard.writeText(buildAiContext())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleToggleBoost() {
    if (boostActive) {
      localStorage.removeItem('sc_ai_boost_courseId')
      localStorage.removeItem('sc_ai_boost_context')
      setBoostActive(false)
    } else {
      localStorage.setItem('sc_ai_boost_courseId', courseId!)
      localStorage.setItem('sc_ai_boost_context', buildAiContext())
      setBoostActive(true)
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" />,       count: announcements.length },
    { key: 'assignments',   label: 'Assignments',   icon: <ClipboardCheck className="h-4 w-4" />,  count: assignments.length },
    { key: 'discussions',   label: 'Discussion',    icon: <MessageSquare className="h-4 w-4" />,   count: discussions.length },
    { key: 'grades',        label: 'Grades',        icon: <Star className="h-4 w-4" />,             count: assignments.filter((a) => a.submissions[0]?.grade !== null && a.submissions[0]?.grade !== undefined).length },
    { key: 'materials',     label: 'Materials',     icon: <FileText className="h-4 w-4" />,         count: materials.length },
    { key: 'schedule',      label: 'Schedule',      icon: <CalendarDays className="h-4 w-4" />,     count: sessions.length },
    { key: 'polls',         label: 'Polls',         icon: <BarChart2 className="h-4 w-4" />,        count: polls.length },
    { key: 'attendance',    label: 'Attendance',    icon: <UserCheck className="h-4 w-4" />,         count: attendanceEntries.length },
    { key: 'ai-boost',      label: 'AI Boost',      icon: <Zap className="h-4 w-4" />,              count: 0 },
  ]

  const isLoading = loadingAnnos || loadingMaterials || loadingSessions || loadingPolls || loadingAssignments || loadingAttendance

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to classes
      </button>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading class…
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-0 border-b border-border mb-6 overflow-x-auto">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'discussions') void loadDiscussions() }}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
                  tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}>
                {t.icon} {t.label}
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full', tab === t.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Announcements */}
          {tab === 'announcements' && (
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <Empty icon={<Megaphone className="h-8 w-8 opacity-30" />} label="No announcements yet" sub="Your lecturer hasn't posted anything yet" />
              ) : announcements.map((a) => (
                <div key={a.id} className={cn('rounded-xl border bg-card p-4', a.isPinned ? 'border-primary/40' : 'border-border')}>
                  <div className="flex items-center gap-2 mb-1">
                    {a.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                    <p className="font-semibold text-sm text-foreground">{a.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleString()} · {a.author.name}</p>
                </div>
              ))}
            </div>
          )}

          {/* Materials */}
          {tab === 'materials' && (
            <div className="space-y-2">
              {materials.length === 0 ? (
                <Empty icon={<BookOpen className="h-8 w-8 opacity-30" />} label="No materials yet" sub="Your lecturer hasn't shared any documents yet" />
              ) : materials.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.type?.toLowerCase().replace('_', ' ')} · {new Date(m.createdAt).toLocaleDateString()}</p>
                  </div>
                  {m.fileUrl && (
                    <a href={m.fileUrl} target="_blank" rel="noreferrer"
                      className="shrink-0 text-xs text-primary hover:underline font-medium">
                      Open
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Schedule */}
          {tab === 'schedule' && (
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <Empty icon={<CalendarDays className="h-8 w-8 opacity-30" />} label="No sessions scheduled" sub="Your lecturer hasn't added any sessions yet" />
              ) : sessions.map((s) => {
                const isPast  = new Date(s.scheduledAt) < new Date()
                const isJitsi = !!s.meetLink?.includes('meet.jit.si')
                const isOpen  = embeddedSessionId === s.id
                return (
                  <div key={s.id} className={cn('bg-card border rounded-xl overflow-hidden', isPast ? 'border-border opacity-60' : 'border-border')}>
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        {s.isOnline ? <Video className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{s.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(s.scheduledAt).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.durationMins} min</span>
                          {s.isOnline && s.meetLink && !isJitsi && (
                            <a href={s.meetLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">Join ↗</a>
                          )}
                          {s.isOnline && isJitsi && (
                            <button onClick={() => setEmbeddedSessionId(isOpen ? null : s.id)}
                              className="text-primary hover:underline">
                              {isOpen ? 'Leave room' : 'Join room'}
                            </button>
                          )}
                          {!s.isOnline && s.location && <span>{s.location}</span>}
                        </div>
                      </div>
                      {isPast && <span className="text-xs text-muted-foreground shrink-0">Past</span>}
                    </div>
                    {isOpen && s.meetLink && (
                      <div className="border-t border-border">
                        <iframe
                          src={s.meetLink}
                          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                          className="w-full"
                          style={{ height: '520px', border: 'none' }}
                          title={s.title}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Assignments */}
          {tab === 'assignments' && (
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <Empty icon={<ClipboardCheck className="h-8 w-8 opacity-30" />} label="No assignments yet" sub="Your lecturer hasn't posted any assignments yet" />
              ) : assignments.map((a) => {
                const sub = a.submissions[0]
                const hasSubmitted = !!sub
                const isOpen = showSubmitForm === a.id
                const inputs = submissionInputs[a.id] ?? { url: '', text: '' }
                const isPastDue = a.dueDate ? new Date(a.dueDate) < new Date() : false

                return (
                  <div key={a.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{a.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          {a.dueDate && (
                            <span className={cn('flex items-center gap-1', isPastDue ? 'text-red-500' : '')}>
                              <Clock className="h-3 w-3" />Due {new Date(a.dueDate).toLocaleString()}
                            </span>
                          )}
                          {a.totalMarks && <span>{a.totalMarks} marks</span>}
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                        {a.attachmentUrl && (
                          <a href={a.attachmentUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                            <FileText className="h-3 w-3" /> View attachment
                          </a>
                        )}
                      </div>
                      {hasSubmitted ? (
                        <span className="shrink-0 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                        </span>
                      ) : (
                        <button onClick={() => setShowSubmitForm(isOpen ? null : a.id)}
                          className="shrink-0 text-xs text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/5 transition-colors">
                          {isOpen ? 'Cancel' : 'Submit'}
                        </button>
                      )}
                    </div>

                    {hasSubmitted && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/30 text-xs space-y-1">
                        {sub.submissionUrl && <a href={sub.submissionUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline block truncate">{sub.submissionUrl}</a>}
                        {sub.textContent && <p className="text-muted-foreground line-clamp-2">{sub.textContent}</p>}
                        {sub.grade !== null && (
                          <p className="text-green-600 dark:text-green-400 font-medium">
                            Grade: {sub.grade}{a.totalMarks ? `/${a.totalMarks}` : ''}
                            {sub.feedback ? ` — ${sub.feedback}` : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {isOpen && !hasSubmitted && (
                      <div className="mt-3 space-y-2">
                        <input value={inputs.url} onChange={(e) => setSubmissionInputs((p) => ({ ...p, [a.id]: { ...inputs, url: e.target.value } }))}
                          placeholder="Submission link (Google Drive, GitHub, etc.)"
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                        <p className="text-xs text-muted-foreground text-center">or</p>
                        <textarea value={inputs.text} onChange={(e) => setSubmissionInputs((p) => ({ ...p, [a.id]: { ...inputs, text: e.target.value } }))}
                          placeholder="Write your answer here…" rows={3}
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setSubmittingId(a.id)
                              submitMutation.mutate(
                                { assignmentId: a.id, payload: { submissionUrl: inputs.url || undefined, textContent: inputs.text || undefined } },
                                { onSettled: () => setSubmittingId(null) },
                              )
                              setShowSubmitForm(null)
                            }}
                            disabled={submittingId === a.id || (!inputs.url.trim() && !inputs.text.trim())}
                            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                            {submittingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Submit'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Grades */}
          {tab === 'grades' && (
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <Empty icon={<Star className="h-8 w-8 opacity-30" />} label="No assignments yet" sub="Grades will appear here once your lecturer posts assignments" />
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {assignments.map((a) => {
                      const sub = a.submissions[0]
                      const graded = sub?.grade !== null && sub?.grade !== undefined
                      return (
                        <div key={a.id} className="flex items-start gap-3 p-4">
                          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                            graded ? 'bg-green-100 dark:bg-green-950/30' : sub ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-muted')}>
                            {graded ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            : sub ? <Clock className="h-4 w-4 text-amber-600" />
                            : <ClipboardCheck className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{a.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {graded ? `Grade: ${sub!.grade}${a.totalMarks ? `/${a.totalMarks}` : ''}` :
                               sub ? 'Submitted — awaiting grade' :
                               'Not submitted'}
                            </p>
                            {graded && sub!.feedback && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">"{sub!.feedback}"</p>
                            )}
                          </div>
                          {graded && a.totalMarks && (
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-foreground">{Math.round((sub!.grade! / a.totalMarks) * 100)}%</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {assignments.some((a) => a.submissions[0]?.grade !== null && a.submissions[0]?.grade !== undefined && a.totalMarks) && (
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Average score</p>
                      <p className="text-2xl font-bold text-foreground">
                        {Math.round(
                          assignments.filter((a) => a.submissions[0]?.grade !== null && a.submissions[0]?.grade !== undefined && a.totalMarks)
                            .reduce((sum, a) => sum + (a.submissions[0]!.grade! / a.totalMarks!) * 100, 0) /
                          assignments.filter((a) => a.submissions[0]?.grade !== null && a.submissions[0]?.grade !== undefined && a.totalMarks).length
                        )}%
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Attendance */}
          {tab === 'attendance' && (
            <div className="space-y-3">
              {attendanceEntries.length === 0 ? (
                <Empty icon={<UserCheck className="h-8 w-8 opacity-30" />} label="No attendance records yet" sub="Records will appear here once your lecturer takes attendance" />
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {(['PRESENT', 'LATE', 'EXCUSED', 'ABSENT'] as const).map((s) => {
                      const count = attendanceEntries.filter((e) => e.status === s).length
                      return (
                        <div key={s} className={cn('rounded-xl border p-3 text-center',
                          s === 'PRESENT' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
                          : s === 'LATE'    ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20'
                          : s === 'EXCUSED' ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20')}>
                          <p className="text-xl font-bold text-foreground">{count}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.toLowerCase()}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {attendanceEntries.map((e) => (
                      <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground flex-1">{new Date(e.record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                          e.status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : e.status === 'LATE'    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : e.status === 'EXCUSED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300')}>
                          {e.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Discussion Board */}
          {tab === 'discussions' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">Ask questions, share ideas, or discuss course topics with your classmates and lecturer.</p>
                <button onClick={() => setShowThreadForm((v) => !v)}
                  className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shrink-0 ml-4">
                  <Plus className="h-3.5 w-3.5" /> New thread
                </button>
              </div>

              {showThreadForm && (
                <div className="mb-5 p-4 bg-card border border-border rounded-xl space-y-3">
                  <input
                    value={threadTitle}
                    onChange={(e) => setThreadTitle(e.target.value)}
                    placeholder="Thread title…"
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <textarea
                    value={threadBody}
                    onChange={(e) => setThreadBody(e.target.value)}
                    placeholder="Describe your question or topic…"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowThreadForm(false); setThreadTitle(''); setThreadBody('') }}
                      className="text-sm px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => void handleCreateThread()} disabled={savingThread || !threadTitle.trim() || !threadBody.trim()}
                      className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {savingThread ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Post
                    </button>
                  </div>
                </div>
              )}

              {loadingDisc ? (
                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : discussions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                  <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-30" />
                  <p className="font-medium text-sm">No discussion threads yet</p>
                  <button onClick={() => setShowThreadForm(true)} className="mt-2 text-sm text-primary hover:underline">
                    Start the first thread
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...discussions].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((t) => (
                    <div key={t.id} className={cn('bg-card border rounded-xl overflow-hidden', t.isPinned ? 'border-primary/40' : 'border-border')}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {t.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                              {t.isResolved && <CheckCheck className="h-3 w-3 text-green-500 shrink-0" />}
                              <span className="text-sm font-semibold text-foreground">{t.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t.author.name} · {new Date(t.createdAt).toLocaleDateString()} · {t._count.replies} {t._count.replies === 1 ? 'reply' : 'replies'}
                            </p>
                          </div>
                          <button onClick={() => void handleDeleteThread(t.id)} title="Delete thread"
                            className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md transition-colors shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-foreground/80 line-clamp-2">{t.body}</p>
                        <button onClick={() => void handleExpandThread(t.id)}
                          className="mt-2 text-xs text-primary hover:underline">
                          {expandedThread === t.id ? 'Hide replies' : `View replies (${t._count.replies})`}
                        </button>
                      </div>

                      {expandedThread === t.id && (
                        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                          {loadingReplies === t.id ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                          ) : (threadReplies[t.id] ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">No replies yet — be the first!</p>
                          ) : (
                            (threadReplies[t.id] ?? []).map((r) => (
                              <div key={r.id} className="flex items-start gap-2">
                                <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-foreground">{r.author.name}</span>
                                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-sm text-foreground/80 mt-1">{r.body}</p>
                                </div>
                                <button onClick={() => void handleDeleteReply(t.id, r.id)}
                                  className="p-1.5 text-muted-foreground hover:text-red-500 shrink-0 transition-colors mt-1">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          )}

                          <div className="flex gap-2">
                            <input
                              value={replyInputs[t.id] ?? ''}
                              onChange={(e) => setReplyInputs((prev) => ({ ...prev, [t.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleReply(t.id) } }}
                              placeholder="Write a reply…"
                              className="flex-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button onClick={() => void handleReply(t.id)} disabled={savingReply === t.id || !(replyInputs[t.id] ?? '').trim()}
                              className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0">
                              {savingReply === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reply'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Context Boost */}
          {tab === 'ai-boost' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-foreground">AI Context Boost</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Paste your class context into any AI chat for course-specific answers</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => void handleCopyContext()}
                      className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors text-foreground">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={handleToggleBoost}
                      className={cn(
                        'flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors font-medium',
                        boostActive ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-muted',
                      )}>
                      <Zap className="h-3.5 w-3.5" />
                      {boostActive ? 'Boost active' : 'Activate boost'}
                    </button>
                  </div>
                </div>
                {boostActive && (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3">
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                    AI Boost is active — your class context is loaded for AI-assisted study sessions
                  </div>
                )}
                <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-muted-foreground max-h-64 overflow-y-auto">
                  {buildAiContext()}
                </pre>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-foreground mb-2">How to use</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Click <strong className="text-foreground">Copy</strong> to copy the class context</li>
                  <li>Open any AI assistant (Claude, ChatGPT, etc.)</li>
                  <li>Paste the context at the start of your prompt</li>
                  <li>Ask your question — the AI now has your course context</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-3">
                  Or click <strong className="text-foreground">Activate boost</strong> to automatically include context when using ScholarCraft AI study tools.
                </p>
              </div>
            </div>
          )}

          {/* Polls */}
          {tab === 'polls' && (
            <div className="space-y-4">
              {polls.length === 0 ? (
                <Empty icon={<BarChart2 className="h-8 w-8 opacity-30" />} label="No polls yet" sub="Your lecturer hasn't launched any polls yet" />
              ) : polls.map((p) => {
                const opts = p.options as string[]
                const myResponse = p.responses[0]
                const hasVoted   = myResponse !== undefined
                const total      = p._count.responses
                const counts     = opts.map((_, i) => p.responses.filter((r) => r.selectedOption === i).length)

                return (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="font-semibold text-sm text-foreground">{p.question}</p>
                      <span className={cn('text-xs shrink-0 font-medium', p.isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
                        {p.isActive ? 'Live' : 'Closed'}
                      </span>
                    </div>

                    {!hasVoted && p.isActive ? (
                      <div className="space-y-2">
                        {opts.map((opt, i) => (
                          <button key={i}
                            onClick={() => respondMutation.mutate({ pollId: p.id, option: i })}
                            disabled={respondMutation.isPending}
                            className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50">
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {opts.map((opt, i) => {
                          const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0
                          const isMyVote = hasVoted && myResponse.selectedOption === i
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className={cn('flex items-center gap-1', isMyVote ? 'text-primary font-medium' : 'text-foreground')}>
                                  {isMyVote && <CheckCircle2 className="h-3 w-3" />}{opt}
                                </span>
                                <span className="text-muted-foreground">{counts[i]} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full transition-all', isMyVote ? 'bg-primary' : 'bg-muted-foreground/40')}
                                  style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                        <p className="text-xs text-muted-foreground mt-1">{total} response{total !== 1 ? 's' : ''}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Empty({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="font-medium text-sm">{label}</p>
      <p className="text-xs mt-1">{sub}</p>
    </div>
  )
}
