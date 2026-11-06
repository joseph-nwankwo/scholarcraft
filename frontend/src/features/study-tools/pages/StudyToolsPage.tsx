import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SelectField } from '@/components/design-system/inputs/SelectField'
import { ACADEMIC_LEVELS } from '@/constants/app.constants'
import { FlashcardsTool } from '../components/FlashcardsTool'
import { SummarizerTool } from '../components/SummarizerTool'
import { QuizTool } from '../components/QuizTool'

export type AcademicLevel = (typeof ACADEMIC_LEVELS)[number]['value']

const STORAGE_KEY = 'studytools:academic-level'

function loadAcademicLevel(): AcademicLevel {
  const saved = localStorage.getItem(STORAGE_KEY)
  return (ACADEMIC_LEVELS.find((l) => l.value === saved)?.value ?? 'undergraduate') as AcademicLevel
}

export default function StudyToolsPage() {
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>(loadAcademicLevel)

  function updateAcademicLevel(value: string) {
    const level = value as AcademicLevel
    setAcademicLevel(level)
    localStorage.setItem(STORAGE_KEY, level)
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Tools</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered tools to help you study smarter.</p>
        </div>
        <div className="w-full sm:w-56">
          <SelectField
            label="Academic level"
            value={academicLevel}
            onValueChange={updateAcademicLevel}
            options={ACADEMIC_LEVELS as unknown as { value: string; label: string }[]}
          />
        </div>
      </div>

      <Tabs defaultValue="flashcards">
        <TabsList>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="summarizer">Summarizer</TabsTrigger>
          <TabsTrigger value="quiz">AI Quiz Practice</TabsTrigger>
        </TabsList>

        <TabsContent value="flashcards" className="mt-6">
          <FlashcardsTool academicLevel={academicLevel} />
        </TabsContent>
        <TabsContent value="summarizer" className="mt-6">
          <SummarizerTool academicLevel={academicLevel} />
        </TabsContent>
        <TabsContent value="quiz" className="mt-6">
          <QuizTool academicLevel={academicLevel} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
