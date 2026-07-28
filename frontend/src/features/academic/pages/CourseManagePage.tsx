import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BookOpen, Users, Target, Clock, FileText, ArrowLeft,
  Plus, Trash2, UserPlus,
} from 'lucide-react'
import {
  courseApi, type CourseAssignment, type CourseOutcome, type TeachingSchedule,
  type CourseMaterial, type BloomLevel, type AssignRole, type DayOfWeek, type WeekPattern,
} from '@/lib/api/academic.api'
import { useAsync, useErrorMsg } from '../hooks/useAcademic'
import { AcademicDialog } from '../components/AcademicDialog'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'assignments' | 'outcomes' | 'schedule' | 'materials'

const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview',     label: 'Overview',     icon: BookOpen },
  { id: 'assignments',  label: 'Lecturers',    icon: Users    },
  { id: 'outcomes',     label: 'Outcomes',     icon: Target   },
  { id: 'schedule',     label: 'Schedule',     icon: Clock    },
  { id: 'materials',    label: 'Materials',    icon: FileText },
]

const BLOOM_BADGE: Record<BloomLevel, 'default' | 'success' | 'warning' | 'error'> = {
  REMEMBER: 'default', UNDERSTAND: 'default', APPLY: 'success',
  ANALYSE: 'warning', EVALUATE: 'warning', CREATE: 'error',
}
const DAYS: DayOfWeek[]    = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
const PATTERNS: WeekPattern[] = ['EVERY_WEEK','ODD_WEEKS','EVEN_WEEKS']
const ROLES: AssignRole[]  = ['LEAD','ASSISTANT','SUPERVISOR']
const BLOOMS: BloomLevel[] = ['REMEMBER','UNDERSTAND','APPLY','ANALYSE','EVALUATE','CREATE']

export default function CourseManagePage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: res, loading, error, reload } = useAsync(() => courseApi.get(id!), [id])
  const course = res?.data

  // ── Outcome dialog ───────────────────────────────────────────────────────────
  const [outcomeDialog, setOutcomeDialog] = useState(false)
  const [outcomeForm, setOutcomeForm]     = useState({ outcomeCode: '', description: '', bloomLevel: 'REMEMBER' as BloomLevel })
  const [outcomeSaving, setOutcomeSaving] = useState(false)
  const [outcomeErr, setOutcomeErr]       = useState('')

  async function saveOutcome(e: React.FormEvent) {
    e.preventDefault()
    if (!outcomeForm.outcomeCode || !outcomeForm.description) { setOutcomeErr('Code and description required'); return }
    setOutcomeSaving(true); setOutcomeErr('')
    try { await courseApi.upsertOutcome(id!, outcomeForm); setOutcomeDialog(false); reload() }
    catch (err) { setOutcomeErr(useErrorMsg(err)) }
    finally { setOutcomeSaving(false) }
  }

  // ── Schedule dialog ──────────────────────────────────────────────────────────
  const [schedDialog, setSchedDialog] = useState(false)
  const [schedForm, setSchedForm]     = useState({ day: 'MONDAY' as DayOfWeek, startTime: '08:00', endTime: '10:00', venue: '', weekPattern: 'EVERY_WEEK' as WeekPattern, lecturerId: '' })
  const [schedSaving, setSchedSaving] = useState(false)
  const [schedErr, setSchedErr]       = useState('')

  async function saveSchedule(e: React.FormEvent) {
    e.preventDefault()
    setSchedSaving(true); setSchedErr('')
    try { await courseApi.addSchedule(id!, schedForm); setSchedDialog(false); reload() }
    catch (err) { setSchedErr(useErrorMsg(err)) }
    finally { setSchedSaving(false) }
  }

  // ── Assignment dialog ────────────────────────────────────────────────────────
  const [assignDialog, setAssignDialog] = useState(false)
  const [assignForm, setAssignForm]     = useState({ lecturerId: '', academicSessionId: '', role: 'LEAD' as AssignRole })
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignErr, setAssignErr]       = useState('')

  async function saveAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!assignForm.lecturerId || !assignForm.academicSessionId) { setAssignErr('Lecturer and session are required'); return }
    setAssignSaving(true); setAssignErr('')
    try { await courseApi.assignLecturer(id!, assignForm); setAssignDialog(false); reload() }
    catch (err) { setAssignErr(useErrorMsg(err)) }
    finally { setAssignSaving(false) }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-8 w-80 rounded-lg" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Alert variant="error" description={error ?? 'Course not found'} />
        <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(ROUTES.ACADEMIC_COURSES)} className="mt-4">Back to courses</Button>
      </div>
    )
  }

  const assignments: CourseAssignment[]  = res?.data?.assignments ?? []
  const outcomes: CourseOutcome[]        = res?.data?.outcomes ?? []
  const schedules: TeachingSchedule[]    = res?.data?.schedules ?? []
  const materials: CourseMaterial[]      = res?.data?.materials ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(ROUTES.ACADEMIC_COURSES)} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-primary">{course.code}</span>
            <Badge variant={course.active ? 'success' : 'default'} size="sm">{course.active ? 'Active' : 'Inactive'}</Badge>
            <Badge variant="default" size="sm">{course.level}</Badge>
            <Badge variant={course.courseType === 'COMPULSORY' ? 'error' : 'default'} size="sm">{course.courseType}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">{course.title}</h1>
          <p className="text-sm text-muted-foreground">{course.department?.name} · {course.creditUnits} credit units · {course.deliveryMode.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => setTab(tid)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === tid ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {course.description && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{course.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Lecturers', assignments.length],
              ['Outcomes', outcomes.length],
              ['Schedules', schedules.length],
              ['Materials', materials.length],
            ].map(([label, val]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-primary">{val}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
          {course.semester && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Semester</p>
              <p className="text-sm font-medium">{course.semester.name} — {course.semester.academicSession?.name}</p>
            </div>
          )}
        </div>
      )}

      {/* Assignments */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Assigned Lecturers ({assignments.length})</h2>
            <Button variant="primary" size="sm" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setAssignDialog(true)}>Assign Lecturer</Button>
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lecturers assigned to this course yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{a.lecturer?.name ?? a.lecturerId}</p>
                    <p className="text-xs text-muted-foreground">{a.lecturer?.email} · {a.academicSession?.name} {a.semester?.name && `· ${a.semester.name}`}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={a.role === 'LEAD' ? 'success' : 'default'} size="sm">{a.role}</Badge>
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={async () => { await courseApi.removeAssignment(id!, a.id); reload() }}
                      className="text-destructive hover:text-destructive"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outcomes */}
      {tab === 'outcomes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Learning Outcomes ({outcomes.length})</h2>
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setOutcomeForm({ outcomeCode: '', description: '', bloomLevel: 'REMEMBER' }); setOutcomeDialog(true) }}>
              Add Outcome
            </Button>
          </div>
          {outcomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No learning outcomes defined yet.</p>
          ) : (
            <div className="space-y-2">
              {outcomes.map((o) => (
                <div key={o.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 font-mono text-xs font-bold text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded">
                      {o.outcomeCode}
                    </span>
                    <p className="text-sm text-foreground">{o.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={BLOOM_BADGE[o.bloomLevel]} size="sm">{o.bloomLevel}</Badge>
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={async () => { await courseApi.deleteOutcome(id!, o.id); reload() }}
                      className="text-destructive hover:text-destructive"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Teaching Schedule ({schedules.length})</h2>
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setSchedForm({ day: 'MONDAY', startTime: '08:00', endTime: '10:00', venue: '', weekPattern: 'EVERY_WEEK', lecturerId: '' }); setSchedDialog(true) }}>
              Add Slot
            </Button>
          </div>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teaching schedule set.</p>
          ) : (
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{s.day} · {s.startTime}–{s.endTime}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.venue && `${s.venue} · `}{s.weekPattern.replace('_', ' ')}
                      {s.lecturer && ` · ${s.lecturer.name}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={async () => { await courseApi.deleteSchedule(id!, s.id); reload() }}
                    className="text-destructive hover:text-destructive"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Materials */}
      {tab === 'materials' && (
        <div className="space-y-4">
          <h2 className="font-semibold">Course Materials ({materials.length})</h2>
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No materials uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.fileType} · {m.uploader?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="default" size="sm">{m.visibility}</Badge>
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={async () => { await courseApi.deleteMaterial(id!, m.id); reload() }}
                      className="text-destructive hover:text-destructive"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outcome dialog */}
      <AcademicDialog open={outcomeDialog} onClose={() => setOutcomeDialog(false)} title="Add Learning Outcome" size="sm">
        <form onSubmit={saveOutcome} className="space-y-4">
          {outcomeErr && <Alert variant="error" description={outcomeErr} />}
          <TextField label="Outcome code" value={outcomeForm.outcomeCode}
            onChange={(e) => setOutcomeForm((p) => ({ ...p, outcomeCode: e.target.value }))}
            placeholder="LO1" required disabled={outcomeSaving} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
            <textarea value={outcomeForm.description} rows={3}
              onChange={(e) => setOutcomeForm((p) => ({ ...p, description: e.target.value }))}
              disabled={outcomeSaving}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bloom's level</label>
            <select value={outcomeForm.bloomLevel} onChange={(e) => setOutcomeForm((p) => ({ ...p, bloomLevel: e.target.value as BloomLevel }))} disabled={outcomeSaving}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {BLOOMS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOutcomeDialog(false)} disabled={outcomeSaving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={outcomeSaving} loadingText="Saving…">Save outcome</Button>
          </div>
        </form>
      </AcademicDialog>

      {/* Schedule dialog */}
      <AcademicDialog open={schedDialog} onClose={() => setSchedDialog(false)} title="Add Teaching Slot" size="sm">
        <form onSubmit={saveSchedule} className="space-y-4">
          {schedErr && <Alert variant="error" description={schedErr} />}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Day</label>
              <select value={schedForm.day} onChange={(e) => setSchedForm((p) => ({ ...p, day: e.target.value as DayOfWeek }))} disabled={schedSaving}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Week pattern</label>
              <select value={schedForm.weekPattern} onChange={(e) => setSchedForm((p) => ({ ...p, weekPattern: e.target.value as WeekPattern }))} disabled={schedSaving}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {PATTERNS.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Start time" type="time" value={schedForm.startTime}
              onChange={(e) => setSchedForm((p) => ({ ...p, startTime: e.target.value }))} disabled={schedSaving} />
            <TextField label="End time" type="time" value={schedForm.endTime}
              onChange={(e) => setSchedForm((p) => ({ ...p, endTime: e.target.value }))} disabled={schedSaving} />
          </div>
          <TextField label="Venue (optional)" value={schedForm.venue}
            onChange={(e) => setSchedForm((p) => ({ ...p, venue: e.target.value }))}
            placeholder="LT1, Zoom link, etc." disabled={schedSaving} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setSchedDialog(false)} disabled={schedSaving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={schedSaving} loadingText="Saving…">Save slot</Button>
          </div>
        </form>
      </AcademicDialog>

      {/* Assign lecturer dialog */}
      <AcademicDialog open={assignDialog} onClose={() => setAssignDialog(false)} title="Assign Lecturer" size="sm">
        <form onSubmit={saveAssignment} className="space-y-4">
          {assignErr && <Alert variant="error" description={assignErr} />}
          <TextField label="Lecturer ID" value={assignForm.lecturerId}
            onChange={(e) => setAssignForm((p) => ({ ...p, lecturerId: e.target.value }))}
            placeholder="User ID of lecturer" required disabled={assignSaving} />
          <TextField label="Academic Session ID" value={assignForm.academicSessionId}
            onChange={(e) => setAssignForm((p) => ({ ...p, academicSessionId: e.target.value }))}
            placeholder="Session ID" required disabled={assignSaving} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <select value={assignForm.role} onChange={(e) => setAssignForm((p) => ({ ...p, role: e.target.value as AssignRole }))} disabled={assignSaving}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setAssignDialog(false)} disabled={assignSaving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={assignSaving} loadingText="Assigning…">Assign</Button>
          </div>
        </form>
      </AcademicDialog>
    </div>
  )
}
