import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FlashcardsTool } from '../components/FlashcardsTool'
import { SummarizerTool } from '../components/SummarizerTool'
import { QuizTool } from '../components/QuizTool'

export default function StudyToolsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Study Tools</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-powered tools to help you study smarter.</p>
      </div>

      <Tabs defaultValue="flashcards">
        <TabsList>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="summarizer">Summarizer</TabsTrigger>
          <TabsTrigger value="quiz">AI Quiz Practice</TabsTrigger>
        </TabsList>

        <TabsContent value="flashcards" className="mt-6">
          <FlashcardsTool />
        </TabsContent>
        <TabsContent value="summarizer" className="mt-6">
          <SummarizerTool />
        </TabsContent>
        <TabsContent value="quiz" className="mt-6">
          <QuizTool />
        </TabsContent>
      </Tabs>
    </div>
  )
}
