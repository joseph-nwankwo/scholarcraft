import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { client } from '../../../lib/api/client'

interface Version {
  id: string
  versionNumber: number
  markdownContent: string
  changeNote: string | null
  createdAt: string
  creator?: { name: string }
}

function diffLines(a: string, b: string): Array<{ type: 'equal' | 'added' | 'removed'; line: string }> {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const result: Array<{ type: 'equal' | 'added' | 'removed'; line: string }> = []

  // Simple diff — mark lines unique to each
  const aSet = new Set(aLines)
  const bSet = new Set(bLines)

  const combined = new Set([...aLines, ...bLines])
  const aOrder = new Map(aLines.map((l, i) => [l, i]))
  const bOrder = new Map(bLines.map((l, i) => [l, i]))

  const allLines = Array.from(combined).sort((x, y) => {
    const ai = aOrder.get(x) ?? 9999
    const bi = bOrder.get(x) ?? 9999
    const aj = aOrder.get(y) ?? 9999
    const bj = bOrder.get(y) ?? 9999
    return (ai + bi) - (aj + bj)
  })

  for (const line of allLines) {
    if (aSet.has(line) && bSet.has(line)) result.push({ type: 'equal', line })
    else if (aSet.has(line)) result.push({ type: 'removed', line })
    else result.push({ type: 'added', line })
  }

  return result
}

export function DocumentComparisonPage() {
  const { id } = useParams<{ id: string }>()
  const [leftVersion, setLeftVersion] = useState<string>('')
  const [rightVersion, setRightVersion] = useState<string>('')

  const { data: versionsData } = useQuery({
    queryKey: ['doc-versions', id],
    queryFn: () => client.get<{ data: Version[] }>(`/documents/${id}/versions`),
    enabled: !!id,
  })

  const versions: Version[] = (versionsData as { data: Version[] } | undefined)?.data ?? []

  const left = versions.find((v) => v.id === leftVersion)
  const right = versions.find((v) => v.id === rightVersion)

  const diff = left && right ? diffLines(left.markdownContent, right.markdownContent) : []

  const stats = {
    added: diff.filter((d) => d.type === 'added').length,
    removed: diff.filter((d) => d.type === 'removed').length,
    equal: diff.filter((d) => d.type === 'equal').length,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-background shrink-0">
        <h1 className="font-semibold text-foreground">Version Comparison</h1>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Base:</label>
            <select value={leftVersion} onChange={(e) => setLeftVersion(e.target.value)}
              className="border border-border rounded px-2 py-1 text-sm bg-background focus:outline-none">
              <option value="">— Select —</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>v{v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Compare:</label>
            <select value={rightVersion} onChange={(e) => setRightVersion(e.target.value)}
              className="border border-border rounded px-2 py-1 text-sm bg-background focus:outline-none">
              <option value="">— Select —</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>v{v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {left && right && (
        <div className="flex items-center gap-4 px-6 py-2 bg-muted/40 border-b border-border text-xs">
          <span className="text-green-600">+{stats.added} added</span>
          <span className="text-red-600">-{stats.removed} removed</span>
          <span className="text-muted-foreground">{stats.equal} unchanged</span>
        </div>
      )}

      {!left || !right ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <ArrowLeftRight className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-lg font-medium">Select two versions to compare</p>
            <p className="text-sm">Choose a base and comparison version above</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Side-by-side view */}
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Left (base) */}
            <div>
              <div className="sticky top-0 bg-muted/70 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                Version {left.versionNumber} — {left.creator?.name ?? 'Unknown'} — {new Date(left.createdAt).toLocaleString()}
              </div>
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap leading-6">
                {left.markdownContent.split('\n').map((line, i) => {
                  const inRight = right.markdownContent.split('\n').includes(line)
                  return (
                    <div key={i} className={!inRight ? 'bg-red-50 text-red-800' : ''}>
                      {line || ' '}
                    </div>
                  )
                })}
              </pre>
            </div>
            {/* Right (new) */}
            <div>
              <div className="sticky top-0 bg-muted/70 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                Version {right.versionNumber} — {right.creator?.name ?? 'Unknown'} — {new Date(right.createdAt).toLocaleString()}
              </div>
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap leading-6">
                {right.markdownContent.split('\n').map((line, i) => {
                  const inLeft = left.markdownContent.split('\n').includes(line)
                  return (
                    <div key={i} className={!inLeft ? 'bg-green-50 text-green-800' : ''}>
                      {line || ' '}
                    </div>
                  )
                })}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
