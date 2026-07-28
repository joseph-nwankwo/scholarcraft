import { useMemo, useState } from 'react'
import { Plus, GraduationCap, RotateCcw } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { StatCard } from '@/components/design-system/cards/StatCard'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { ConfirmDialog } from '@/components/design-system/feedback/ConfirmDialog'
import { SkeletonCard } from '@/components/design-system/feedback/Skeleton'
import { Modal } from '@/components/design-system/overlay/Modal'
import { cn } from '@/lib/utils'
import { useGpaSemesters } from '../hooks/useGpaSemesters'
import type { GpaSemester, GpaCourse } from '@/lib/api/gpa.api'

type Scale = 'FIVE_POINT' | 'FOUR_POINT'
const SCALE_KEY = 'sp_gpa_scale'
const UNIVERSITY_PASS_MARK   = 40
const POLYTECHNIC_PASS_MARK  = 45

const UNIVERSITY_BANDS = [
  { min: 4.5, label: 'First Class' },
  { min: 3.5, label: 'Second Class (Upper)' },
  { min: 2.4, label: 'Second Class (Lower)' },
  { min: 1.5, label: 'Third Class' },
  { min: 0,   label: 'Pass' },
]
const POLYTECHNIC_BANDS = [
  { min: 4.5, label: 'Distinction' },
  { min: 3.5, label: 'Upper Credit' },
  { min: 2.4, label: 'Lower Credit' },
  { min: 1.5, label: 'Pass' },
  { min: 0,   label: 'Below Pass' },
]

/**
 * Derives a letter grade + point value from a raw score, given the course's own
 * pass mark (below it is an automatic fail), the active grading scale, and whether
 * the institution grades on the polytechnic/NBTE convention (no E grade — the lowest
 * pass is D at 45%) rather than the university convention (E grade from 40-44%).
 */
function computeGrade(score: number, passMark: number, scale: Scale, isPolytechnicStyle: boolean): { letter: string; points: number } {
  if (score < passMark) return { letter: 'F', points: 0 }
  if (score >= 70) return { letter: 'A', points: scale === 'FIVE_POINT' ? 5 : 4 }
  if (score >= 60) return { letter: 'B', points: scale === 'FIVE_POINT' ? 4 : 3 }
  if (score >= 50) return { letter: 'C', points: scale === 'FIVE_POINT' ? 3 : 2 }
  if (scale === 'FIVE_POINT' && score >= 45) return { letter: 'D', points: 2 }
  if (scale === 'FIVE_POINT' && !isPolytechnicStyle) return { letter: 'E', points: 1 }
  return { letter: 'D', points: scale === 'FIVE_POINT' ? 2 : 1 }
}

function semesterStats(courses: GpaCourse[], scale: Scale, isPolytechnicStyle: boolean) {
  const totalUnits  = courses.reduce((sum, c) => sum + c.creditUnits, 0)
  const totalPoints = courses.reduce((sum, c) => sum + c.creditUnits * computeGrade(c.score, c.passMark, scale, isPolytechnicStyle).points, 0)
  return { totalUnits, gpa: totalUnits ? totalPoints / totalUnits : 0 }
}

export function CgpaTab() {
  const { user, institution } = useAuth()
  const { semesters, loading, error, createSemester, renameSemester, setSemesterSession, removeSemester, addCourse, updateCourse, removeCourse } = useGpaSemesters()

  const [scaleOverride, setScaleOverride] = useState<Scale | null>(() => {
    const saved = localStorage.getItem(SCALE_KEY)
    return saved === 'FIVE_POINT' || saved === 'FOUR_POINT' ? saved : null
  })
  const scale = scaleOverride ?? 'FIVE_POINT'

  function setScale(next: Scale) {
    setScaleOverride(next)
    localStorage.setItem(SCALE_KEY, next)
  }

  const institutionType = user?.personalInstitutionType ?? institution?.institutionType ?? null
  const isPolytechnicStyle = institutionType === 'POLYTECHNIC' || institutionType === 'MONOTECHNIC' || institutionType === 'VOCATIONAL_INSTITUTION'

  const [newSemesterName, setNewSemesterName]     = useState('')
  const [newSemesterSession, setNewSemesterSession] = useState('')
  const [addingSemester, setAddingSemester]       = useState(false)
  const [deletingSemesterId, setDeletingSemesterId] = useState<string | null>(null)

  const overall = useMemo(() => {
    const allCourses = semesters.flatMap((s) => s.courses)
    return semesterStats(allCourses, scale, isPolytechnicStyle)
  }, [semesters, scale, isPolytechnicStyle])

  const groupedSemesters = useMemo(() => {
    const groups = new Map<string, GpaSemester[]>()
    for (const semester of semesters) {
      const key = semester.session?.trim() || ''
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(semester)
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (!a) return 1
      if (!b) return -1
      return a.localeCompare(b)
    })
  }, [semesters])

  const classification = useMemo(() => {
    if (scale !== 'FIVE_POINT' || overall.totalUnits === 0) return null
    const bands = isPolytechnicStyle ? POLYTECHNIC_BANDS : UNIVERSITY_BANDS
    return bands.find((b) => overall.gpa >= b.min)?.label ?? null
  }, [scale, overall, isPolytechnicStyle])

  const carryoverCourses = useMemo(() => semesters.flatMap((s) =>
    s.courses
      .filter((c) => computeGrade(c.score, c.passMark, scale, isPolytechnicStyle).letter === 'F')
      .map((c) => ({ ...c, semesterName: s.name, semesterSession: s.session }))
  ), [semesters, scale, isPolytechnicStyle])
  const carryoverUnits = carryoverCourses.reduce((sum, c) => sum + c.creditUnits, 0)
  const [showCarryoverModal, setShowCarryoverModal] = useState(false)

  async function handleAddSemester(e: React.FormEvent) {
    e.preventDefault()
    if (!newSemesterName.trim()) return
    await createSemester({ name: newSemesterName.trim(), session: newSemesterSession.trim() || null })
    setNewSemesterName('')
    setNewSemesterSession('')
    setAddingSemester(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="warning" description={error} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">CGPA Calculator</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track your semester grades and cumulative GPA.</p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted shrink-0">
          {(['FIVE_POINT', 'FOUR_POINT'] as Scale[]).map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                scale === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s === 'FIVE_POINT' ? '5.0 scale' : '4.0 scale'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="CGPA" value={overall.gpa.toFixed(2)} icon={<GraduationCap className="h-5 w-5" />} color="primary" />
        <StatCard label="Total Credit Units" value={overall.totalUnits} />
        <StatCard label="Semesters" value={semesters.length} />
        <StatCard
          label="Carryover Units"
          value={carryoverUnits}
          icon={<RotateCcw className="h-5 w-5" />}
          color={carryoverUnits > 0 ? 'error' : 'default'}
          onClick={carryoverUnits > 0 ? () => setShowCarryoverModal(true) : undefined}
          description={carryoverUnits > 0 ? 'Click to view' : undefined}
        />
        <StatCard label="Classification" value={classification ?? '—'} />
      </div>

      <Modal
        open={showCarryoverModal}
        onClose={() => setShowCarryoverModal(false)}
        title="Carryover Courses"
        size="lg"
      >
        {carryoverCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No carryover courses — nice work!</p>
        ) : (
          <ul className="divide-y divide-border -mx-6">
            {carryoverCourses.map((course) => (
              <li key={course.id} className="flex items-center gap-3 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{course.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {course.semesterSession ? `${course.semesterSession} · ` : ''}{course.semesterName}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{course.creditUnits} units</span>
                <span className="text-xs text-muted-foreground shrink-0">Score: {course.score}%</span>
                <span className="text-xs font-semibold text-error shrink-0">F</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {semesters.length === 0 && !addingSemester ? (
        <EmptyState
          icon={<GraduationCap className="h-7 w-7" />}
          title="No semesters yet"
          description="Add a semester and start logging your course scores to calculate your CGPA."
          action={{ label: 'Add Semester', onClick: () => setAddingSemester(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <div className="space-y-6">
          {groupedSemesters.map(([session, group]) => (
            <div key={session || '__none__'} className="space-y-4">
              {session && (
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{session}</h3>
              )}
              {group.map((semester) => (
                <SemesterCard
                  key={semester.id}
                  semester={semester}
                  scale={scale}
                  isPolytechnicStyle={isPolytechnicStyle}
                  onRename={(name) => renameSemester(semester.id, name)}
                  onSetSession={(value) => setSemesterSession(semester.id, value)}
                  onDeleteRequest={() => setDeletingSemesterId(semester.id)}
                  onAddCourse={(data) => addCourse(semester.id, data)}
                  onUpdateCourse={(courseId, data) => updateCourse(semester.id, courseId, data)}
                  onRemoveCourse={(courseId) => removeCourse(semester.id, courseId)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {addingSemester ? (
        <form onSubmit={handleAddSemester} className="rounded-xl border bg-card p-5 shadow-card flex flex-col sm:flex-row gap-3 sm:items-end">
          <TextField
            label="Session"
            value={newSemesterSession}
            onChange={(e) => setNewSemesterSession(e.target.value)}
            placeholder="e.g. 2023/2024"
            fieldClassName="sm:w-40"
          />
          <div className="flex-1">
            <TextField
              label="Semester name"
              value={newSemesterName}
              onChange={(e) => setNewSemesterName(e.target.value)}
              placeholder="e.g. First Semester"
              required
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit">Add</Button>
            <Button type="button" variant="secondary" onClick={() => { setAddingSemester(false); setNewSemesterName(''); setNewSemesterSession('') }}>Cancel</Button>
          </div>
        </form>
      ) : semesters.length > 0 && (
        <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAddingSemester(true)}>
          Add Semester
        </Button>
      )}

      <ConfirmDialog
        open={!!deletingSemesterId}
        onOpenChange={(open) => !open && setDeletingSemesterId(null)}
        title="Delete this semester?"
        description="This will remove the semester and all its courses. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingSemesterId) await removeSemester(deletingSemesterId)
          setDeletingSemesterId(null)
        }}
      />
    </div>
  )
}

function SemesterCard({ semester, scale, isPolytechnicStyle, onRename, onSetSession, onDeleteRequest, onAddCourse, onUpdateCourse, onRemoveCourse }: {
  semester: GpaSemester
  scale: Scale
  isPolytechnicStyle: boolean
  onRename: (name: string) => void
  onSetSession: (session: string | null) => void
  onDeleteRequest: () => void
  onAddCourse: (data: { name: string; creditUnits: number; score: number; passMark: number }) => Promise<void>
  onUpdateCourse: (courseId: string, data: Partial<{ name: string; creditUnits: number; score: number; passMark: number }>) => Promise<void>
  onRemoveCourse: (courseId: string) => Promise<void>
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft]     = useState(semester.name)
  const [editingSession, setEditingSession] = useState(false)
  const [sessionDraft, setSessionDraft]     = useState(semester.session ?? '')
  const defaultPassMark = isPolytechnicStyle ? POLYTECHNIC_PASS_MARK : UNIVERSITY_PASS_MARK

  const [showAddForm, setShowAddForm] = useState(false)
  const [courseName, setCourseName]   = useState('')
  const [credits, setCredits]         = useState('3')
  const [score, setScore]             = useState('')
  const [passMark, setPassMark]       = useState(String(defaultPassMark))
  const [saving, setSaving]           = useState(false)

  const [editingCourseId, setEditingCourseId]   = useState<string | null>(null)
  const [courseNameDraft, setCourseNameDraft]   = useState('')
  const [courseUnitsDraft, setCourseUnitsDraft] = useState('')

  function startEditCourse(course: GpaCourse) {
    setEditingCourseId(course.id)
    setCourseNameDraft(course.name)
    setCourseUnitsDraft(String(course.creditUnits))
  }

  async function commitCourseEdit(courseId: string) {
    const name  = courseNameDraft.trim()
    const units = parseInt(courseUnitsDraft, 10)
    if (name && units > 0) {
      await onUpdateCourse(courseId, { name, creditUnits: units })
    }
    setEditingCourseId(null)
  }

  const stats = semesterStats(semester.courses, scale, isPolytechnicStyle)

  function commitRename() {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== semester.name) onRename(trimmed)
    setEditingName(false)
  }

  function commitSession() {
    const trimmed = sessionDraft.trim()
    if (trimmed !== (semester.session ?? '')) onSetSession(trimmed || null)
    setEditingSession(false)
  }

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault()
    const units = parseInt(credits, 10)
    const scoreNum = parseInt(score, 10)
    const passNum  = parseInt(passMark, 10)
    if (!courseName.trim() || !units || units <= 0 || Number.isNaN(scoreNum)) return
    setSaving(true)
    try {
      await onAddCourse({
        name: courseName.trim(),
        creditUnits: units,
        score: Math.min(100, Math.max(0, scoreNum)),
        passMark: Number.isNaN(passNum) ? defaultPassMark : Math.min(100, Math.max(0, passNum)),
      })
      setCourseName('')
      setCredits('3')
      setScore('')
      setPassMark(String(defaultPassMark))
      setShowAddForm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          {editingSession ? (
            <input
              autoFocus
              value={sessionDraft}
              onChange={(e) => setSessionDraft(e.target.value)}
              onBlur={commitSession}
              onKeyDown={(e) => e.key === 'Enter' && commitSession()}
              placeholder="e.g. 2023/2024"
              className="w-24 bg-transparent border-b border-primary text-xs font-medium text-muted-foreground focus:outline-none"
            />
          ) : (
            <button
              onClick={() => { setSessionDraft(semester.session ?? ''); setEditingSession(true) }}
              className={cn(
                'shrink-0 px-2 py-0.5 rounded text-xs font-medium hover:underline',
                semester.session ? 'bg-primary/10 text-primary' : 'text-muted-foreground/60 italic'
              )}
            >
              {semester.session || 'add session'}
            </button>
          )}
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
              className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm font-semibold text-foreground focus:outline-none"
            />
          ) : (
            <button onClick={() => { setNameDraft(semester.name); setEditingName(true) }} className="font-semibold text-foreground text-left hover:underline truncate">
              {semester.name}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-primary tabular-nums">GPA: {stats.gpa.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">{stats.totalUnits} units</span>
          <button onClick={onDeleteRequest} className="text-xs text-muted-foreground hover:text-error font-medium">Delete</button>
        </div>
      </div>

      {semester.courses.length === 0 && !showAddForm ? (
        <p className="text-sm text-muted-foreground text-center py-6">No courses added yet.</p>
      ) : (
        <>
          <div className="hidden sm:flex items-center gap-3 px-4 pt-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <span className="flex-1">Course</span>
            <span className="w-16 text-right shrink-0">Units</span>
            <span className="w-20 text-right shrink-0">Score</span>
            <span className="w-24 text-right shrink-0">Pass mark</span>
            <span className="w-14 text-center shrink-0">Grade</span>
            <span className="w-20 text-right shrink-0">Points</span>
            <span className="w-24 shrink-0" />
          </div>
          <ul className="divide-y divide-border">
            {semester.courses.map((course) => {
              const { letter, points } = computeGrade(course.score, course.passMark, scale, isPolytechnicStyle)
              const failed = letter === 'F'
              const isEditing = editingCourseId === course.id
              return (
                <li key={course.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={courseNameDraft}
                      onChange={(e) => setCourseNameDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitCourseEdit(course.id)}
                      className="flex-1 min-w-[10rem] rounded-md border border-input bg-background text-sm px-2 py-1"
                    />
                  ) : (
                    <span className="flex-1 min-w-[10rem] text-sm text-foreground truncate">{course.name}</span>
                  )}
                  {isEditing ? (
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={courseUnitsDraft}
                      onChange={(e) => setCourseUnitsDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitCourseEdit(course.id)}
                      className="w-16 shrink-0 rounded-md border border-input bg-background text-sm px-2 py-1 text-right"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground w-16 shrink-0 text-right">{course.creditUnits} units</span>
                  )}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={course.score}
                    onBlur={(e) => {
                      const v = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                      if (v !== course.score) onUpdateCourse(course.id, { score: v })
                    }}
                    className="w-20 shrink-0 rounded-md border border-input bg-background text-sm px-2 py-1 text-right"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={course.passMark}
                    onBlur={(e) => {
                      const v = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                      if (v !== course.passMark) onUpdateCourse(course.id, { passMark: v })
                    }}
                    className="w-24 shrink-0 rounded-md border border-input bg-background text-sm px-2 py-1 text-right"
                    title="Minimum pass mark"
                  />
                  <span className={cn('w-14 shrink-0 text-center text-sm font-semibold', failed ? 'text-error' : 'text-foreground')}>
                    {letter}
                  </span>
                  <span className="text-xs text-muted-foreground w-20 shrink-0 text-right tabular-nums">
                    {(points * course.creditUnits).toFixed(1)} pts
                  </span>
                  {isEditing ? (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => commitCourseEdit(course.id)} className="text-xs text-primary hover:underline font-medium">
                        Save
                      </button>
                      <button onClick={() => setEditingCourseId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => startEditCourse(course)} className="text-xs text-primary hover:underline font-medium">
                        Edit
                      </button>
                      <button onClick={() => onRemoveCourse(course.id)} className="text-xs text-muted-foreground hover:text-error">
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {showAddForm ? (
        <form onSubmit={handleAddCourse} className="p-4 border-t grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end">
          <div className="col-span-2 sm:col-span-1">
            <TextField label="Course name" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. MTH 101" required autoFocus />
          </div>
          <TextField label="Units" type="number" min={1} max={30} value={credits} onChange={(e) => setCredits(e.target.value)} fieldClassName="w-20" />
          <TextField label="Score (%)" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="0-100" required fieldClassName="w-24" />
          <TextField label="Pass mark" type="number" min={0} max={100} value={passMark} onChange={(e) => setPassMark(e.target.value)} fieldClassName="w-24" />
          <div className="flex gap-2 col-span-2 sm:col-span-1">
            <Button type="submit" loading={saving}>Add</Button>
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="p-3 border-t">
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add course
          </button>
        </div>
      )}
    </div>
  )
}
