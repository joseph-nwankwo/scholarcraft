import { useState } from 'react'
import { BrainCircuit, Sparkles, Check, X, RotateCcw, Trophy } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { TextareaField } from '@/components/design-system/inputs/TextareaField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { ProgressBar } from '@/components/design-system/feedback/ProgressBar'
import { cn } from '@/lib/utils'
import { studyToolsApi, type QuizQuestion } from '@/lib/api/studyTools.api'
import { UploadDocumentButton } from './UploadDocumentButton'
import type { AcademicLevel } from '../pages/StudyToolsPage'

type Mode = 'topic' | 'notes'

interface Props {
  academicLevel: AcademicLevel
}

export function QuizTool({ academicLevel }: Props) {
  const [mode, setMode]         = useState<Mode>('topic')
  const [topic, setTopic]       = useState('')
  const [notes, setNotes]       = useState('')
  const [count, setCount]       = useState(5)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [index, setIndex]       = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers]   = useState<number[]>([])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await studyToolsApi.generateQuiz({
        topic: mode === 'topic' ? topic.trim() : undefined,
        sourceText: mode === 'notes' ? notes.trim() : undefined,
        count,
        academicLevel,
      })
      setQuestions(result)
      setIndex(0)
      setSelected(null)
      setAnswers([])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Could not generate a quiz. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setQuestions(null)
    setIndex(0)
    setSelected(null)
    setAnswers([])
    setError('')
  }

  function selectOption(i: number) {
    if (selected !== null) return
    setSelected(i)
  }

  function nextQuestion() {
    if (selected === null) return
    setAnswers((prev) => [...prev, selected])
    setSelected(null)
    setIndex((i) => i + 1)
  }

  if (questions) {
    const isFinished = index >= questions.length
    if (isFinished) {
      const score = answers.filter((a, i) => a === questions[i].correctIndex).length
      const pct = Math.round((score / questions.length) * 100)
      return (
        <div className="rounded-xl border bg-card p-8 shadow-card text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{score} / {questions.length}</p>
            <p className="text-sm text-muted-foreground mt-1">{pct}% correct</p>
          </div>
          <ProgressBar value={score} max={questions.length} variant={pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'error'} className="max-w-xs mx-auto" />
          <Button leftIcon={<RotateCcw className="h-4 w-4" />} onClick={reset}>Try Another Quiz</Button>
        </div>
      )
    }

    const q = questions[index]
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Question {index + 1} of {questions.length}</p>
          <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset}>Restart</Button>
        </div>
        <ProgressBar value={index} max={questions.length} size="sm" />

        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <p className="text-base font-medium text-foreground">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((option, i) => {
              const isSelected = selected === i
              const isCorrect  = i === q.correctIndex
              const showResult = selected !== null
              return (
                <button
                  key={i}
                  onClick={() => selectOption(i)}
                  disabled={selected !== null}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors flex items-center justify-between gap-2',
                    !showResult && 'border-border hover:bg-muted hover:border-primary/40',
                    showResult && isCorrect && 'border-success bg-success-muted text-success',
                    showResult && isSelected && !isCorrect && 'border-error bg-error-muted text-error',
                    showResult && !isSelected && !isCorrect && 'border-border opacity-60'
                  )}
                >
                  <span>{option}</span>
                  {showResult && isCorrect && <Check className="h-4 w-4 shrink-0" />}
                  {showResult && isSelected && !isCorrect && <X className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>

          {selected !== null && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{q.explanation}</p>
            </div>
          )}

          <Button fullWidth disabled={selected === null} onClick={nextQuestion}>
            {index === questions.length - 1 ? 'See Results' : 'Next Question'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      {error && <Alert variant="warning" description={error} />}

      <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted">
        {(['topic', 'notes'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m === 'topic' ? 'From a topic' : 'From my notes'}
          </button>
        ))}
      </div>

      {mode === 'topic' ? (
        <TextField
          label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Cell Biology, World War II"
          required
        />
      ) : (
        <div className="space-y-3">
          <UploadDocumentButton onExtracted={setNotes} />
          <TextareaField
            label="Paste your notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste lecture notes, textbook excerpts, or any study material… or upload a document above"
            rows={8}
            required
          />
        </div>
      )}

      <TextField
        label="Number of questions"
        type="number"
        min={3}
        max={20}
        value={count}
        onChange={(e) => setCount(Math.min(20, Math.max(3, Number(e.target.value) || 5)))}
      />

      <Button type="submit" fullWidth loading={loading} leftIcon={<Sparkles className="h-4 w-4" />}>
        Generate Quiz
      </Button>

      {!loading && (
        <EmptyState
          size="sm"
          icon={<BrainCircuit className="h-6 w-6" />}
          title="Your quiz will appear here"
          description="Enter a topic or paste your notes, then generate a quiz to test yourself."
        />
      )}
    </form>
  )
}
