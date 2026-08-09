import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Hash, BookOpen, GraduationCap, Loader2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { classConnectApi, type LCCoursePreview, type LCJoinedCourse } from '@/lib/api/lecturecraft.api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

export default function ClassConnectPage() {
  const navigate                  = useNavigate()
  const [code, setCode]           = useState('')
  const [preview, setPreview]     = useState<LCCoursePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [joinedCode, setJoinedCode]     = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: myClasses, isLoading: loadingClasses } = useQuery({
    queryKey: ['lc-my-classes'],
    queryFn:  classConnectApi.myClasses,
    retry: false,
  })

  const joinMutation = useMutation({
    mutationFn: (c: string) => classConnectApi.join(c),
    onSuccess: (_data, c) => {
      setJoinedCode(c)
      setPreview(null)
      setCode('')
      void queryClient.invalidateQueries({ queryKey: ['lc-my-classes'] })
    },
  })

  async function handlePreview() {
    if (code.length < 4) return
    setPreviewError(null)
    setPreview(null)
    setJoinedCode(null)
    setIsPreviewing(true)
    try {
      const course = await classConnectApi.preview(code)
      setPreview(course)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setPreviewError('No class found with that code. Check the code and try again.')
      } else {
        setPreviewError('Could not reach LectureCraft. Make sure your session is active.')
      }
    } finally {
      setIsPreviewing(false)
    }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-foreground">Class Connect</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Join a class using the code your lecturer shared from LectureCraft
        </p>
      </div>

      {/* Join input */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Join a Class</p>
            <p className="text-xs text-muted-foreground">Enter the class code provided by your lecturer</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setPreview(null)
              setPreviewError(null)
              setJoinedCode(null)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') void handlePreview() }}
            placeholder="e.g. AB12XZ"
            className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-widest"
            maxLength={10}
          />
          <Button
            variant="primary"
            disabled={code.length < 4 || isPreviewing}
            onClick={() => void handlePreview()}
          >
            {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look Up'}
          </Button>
        </div>

        {/* Error */}
        {previewError && (
          <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {previewError}
          </div>
        )}

        {/* Success join confirmation */}
        {joinedCode && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            You've joined the class! It now appears in your class list below.
          </div>
        )}

        {/* Course preview card */}
        {preview && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{preview.title}</p>
                {preview.code && (
                  <p className="text-xs text-muted-foreground mt-0.5">{preview.code}</p>
                )}
                {preview.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{preview.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  <span>Lecturer: <strong className="text-foreground">{preview.user.name}</strong></span>
                  {preview.level && <span>Level: {preview.level}</span>}
                  {preview.department && <span>{preview.department}</span>}
                  <span>{preview._count.enrollments} student{preview._count.enrollments !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => joinMutation.mutate(code)}
                disabled={joinMutation.isPending}
              >
                {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
              </Button>
            </div>
            {joinMutation.isError && (
              <p className="text-xs text-destructive mt-2">
                {axios.isAxiosError(joinMutation.error) && joinMutation.error.response?.status === 409
                  ? 'You are already enrolled in this class.'
                  : 'Failed to join. Please try again.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* My classes */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">My Classes</h2>

        {loadingClasses ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your classes…
          </div>
        ) : myClasses && myClasses.length > 0 ? (
          <div className="space-y-3">
            {myClasses.map((cls: LCJoinedCourse) => (
              <button key={cls.id}
                onClick={() => navigate(`/class-connect/${cls.id}`)}
                className="w-full rounded-xl border border-border bg-card p-4 flex items-start gap-3 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{cls.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cls.user.name}
                    {cls.level ? ` · ${cls.level}` : ''}
                    {cls.department ? ` · ${cls.department}` : ''}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center text-center gap-3">
            <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No classes yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask your lecturer for a class code and enter it above to get started.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">How it works:</strong> Your lecturer creates a class on LectureCraft and
          shares the 6-character code. Enter it above — ScholarCraft connects you directly.
        </p>
      </div>
    </div>
  )
}
