import { useState } from 'react'
import { Users, Hash, Construction } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'

export default function ClassConnectPage() {
  const [code, setCode] = useState('')

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-foreground">Class Connect</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Join a class using a code from your lecturer to access materials and submit assignments
        </p>
      </div>

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
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-widest"
            maxLength={10}
          />
          <Button variant="primary" disabled={code.length < 4}>
            Join Class
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center text-center gap-3">
        <Construction className="h-8 w-8 text-muted-foreground/50" />
        <p className="font-semibold text-foreground">Class Connect is coming soon</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Full Class Connect — materials, notices, assignment submission, and grade tracking — is actively being built.
          This requires your institution to be on ScholarCraft Official.
        </p>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">No classes yet.</strong> Ask your lecturer for a class code, or
          wait for your institution to connect to ScholarCraft Official.
        </div>
      </div>
    </div>
  )
}
