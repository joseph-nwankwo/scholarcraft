import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSubjects } from '../hooks/useSubjects'
import { useTasks } from '../hooks/useTasks'
import { useStudySessions } from '../hooks/useStudySessions'
import { useTaskReminders } from '../hooks/useTaskReminders'
import { OverviewTab } from '../components/OverviewTab'
import { SubjectsTab } from '../components/SubjectsTab'
import { TasksTab } from '../components/TasksTab'
import { ScheduleTab } from '../components/ScheduleTab'
import { CgpaTab } from '../components/CgpaTab'
import { TimetableTab } from '../components/TimetableTab'

export default function StudyPlannerPage() {
  const subjectsState = useSubjects()
  const tasksState    = useTasks()
  const sessionsState = useStudySessions(100)
  const [tab, setTab]  = useState('overview')

  useTaskReminders(tasksState.tasks)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Study Planner</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Organise your subjects, track tasks, and log study time.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="cgpa">CGPA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            subjectsState={subjectsState}
            tasksState={tasksState}
            sessionsState={sessionsState}
            onViewAllTasks={() => setTab('tasks')}
          />
        </TabsContent>
        <TabsContent value="subjects" className="mt-6">
          <SubjectsTab subjectsState={subjectsState} tasksState={tasksState} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-6">
          <TasksTab tasksState={tasksState} subjectsState={subjectsState} onManageSubjects={() => setTab('subjects')} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-6">
          <ScheduleTab tasksState={tasksState} />
        </TabsContent>
        <TabsContent value="timetable" className="mt-6">
          <TimetableTab subjectsState={subjectsState} />
        </TabsContent>
        <TabsContent value="cgpa" className="mt-6">
          <CgpaTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
