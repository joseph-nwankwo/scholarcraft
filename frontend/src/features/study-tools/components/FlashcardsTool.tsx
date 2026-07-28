import { useState } from 'react'
import { Layers, ChevronLeft, ChevronRight, Shuffle, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { TextareaField } from '@/components/design-system/inputs/TextareaField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { cn } from '@/lib/utils'
import { studyToolsApi, type Flashcard } from '@/lib/api/studyTools.api'

type Mode = 'topic' | 'notes'

export function FlashcardsTool() {
  const [mode, setMode]         = useState<Mode>('topic')
  const [topic, setTopic]       = useState('')
  const [notes, setNotes]       = useState('')
  const [count, setCount]       = useState(10)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [cards, setCards]       = useState<Flashcard[] | null>(null)
  const [index, setIndex]       = useState(0)
  const [flipped, setFlipped]   = useState(false)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await studyToolsApi.generateFlashcards({
        topic: mode === 'topic' ? topic.trim() : undefined,
        sourceText: mode === 'notes' ? notes.trim() : undefined,
        count,
      })
      setCards(result)
      setIndex(0)
      setFlipped(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Could not generate flashcards. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setCards(null)
    setIndex(0)
    setFlipped(false)
    setError('')
  }

  function shuffle() {
    if (!cards) return
    const shuffled = [...cards].sort(() => Math.random() - 0.5)
    setCards(shuffled)
    setIndex(0)
    setFlipped(false)
  }

  if (cards) {
    const card = cards[index]
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Card {index + 1} of {cards.length}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Shuffle className="h-3.5 w-3.5" />} onClick={shuffle}>Shuffle</Button>
            <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset}>New Deck</Button>
          </div>
        </div>

        <button
          onClick={() => setFlipped((f) => !f)}
          className={cn(
            'w-full min-h-[16rem] rounded-2xl border-2 p-8 flex items-center justify-center text-center transition-all',
            'hover:shadow-hover cursor-pointer select-none',
            flipped ? 'border-primary bg-primary/5' : 'border-border bg-card'
          )}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {flipped ? 'Answer' : 'Question'}
            </p>
            <p className="text-lg font-medium text-foreground leading-relaxed">
              {flipped ? card.back : card.front}
            </p>
            <p className="text-xs text-muted-foreground mt-4">Click to flip</p>
          </div>
        </button>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            leftIcon={<ChevronLeft className="h-4 w-4" />}
            disabled={index === 0}
            onClick={() => { setIndex((i) => i - 1); setFlipped(false) }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            rightIcon={<ChevronRight className="h-4 w-4" />}
            disabled={index === cards.length - 1}
            onClick={() => { setIndex((i) => i + 1); setFlipped(false) }}
          >
            Next
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
          placeholder="e.g. Photosynthesis, The French Revolution"
          required
        />
      ) : (
        <TextareaField
          label="Paste your notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste lecture notes, textbook excerpts, or any study material…"
          rows={8}
          required
        />
      )}

      <TextField
        label="Number of cards"
        type="number"
        min={3}
        max={30}
        value={count}
        onChange={(e) => setCount(Math.min(30, Math.max(3, Number(e.target.value) || 10)))}
      />

      <Button type="submit" fullWidth loading={loading} leftIcon={<Sparkles className="h-4 w-4" />}>
        Generate Flashcards
      </Button>

      {!loading && (
        <EmptyState
          size="sm"
          icon={<Layers className="h-6 w-6" />}
          title="Your flashcard deck will appear here"
          description="Enter a topic or paste your notes, then generate a deck to start reviewing."
        />
      )}
    </form>
  )
}
