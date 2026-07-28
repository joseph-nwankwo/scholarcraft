import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Folder as FolderIcon, FolderOpen } from 'lucide-react'
import { libraryApi, type Folder } from '../../../lib/api/library.api'

interface FolderTreeProps {
  selectedId: string | null
  onSelect: (folderId: string | null) => void
}

function FolderNode({
  folder,
  depth,
  selectedId,
  onSelect,
}: {
  folder: Folder
  depth: number
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = (folder.children?.length ?? 0) > 0
  const isSelected = selectedId === folder.id

  return (
    <div>
      <button
        onClick={() => {
          onSelect(folder.id)
          if (hasChildren) setExpanded((e) => !e)
        }}
        className={`w-full flex items-center gap-1 px-2 py-1.5 rounded text-sm text-left transition-colors ${
          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {hasChildren ? (
          <span className="text-muted-foreground w-4 shrink-0 text-center">
            {expanded ? '▾' : '▸'}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="mr-1">{folder.icon ? folder.icon : <FolderIcon className="h-3.5 w-3.5 shrink-0" />}</span>
        <span className="truncate flex-1">{folder.name}</span>
        {(folder._count?.documents ?? 0) > 0 && (
          <span className="ml-auto text-xs text-muted-foreground shrink-0">
            {folder._count!.documents}
          </span>
        )}
      </button>
      {expanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FolderTree({ selectedId, onSelect }: FolderTreeProps) {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { data } = useQuery({
    queryKey: ['folder-tree'],
    queryFn: () => libraryApi.folderTree(),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => libraryApi.createFolder({ name }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['folder-tree'] })
      setCreating(false)
      setNewName('')
    },
  })

  const folders: Folder[] = (data as { data: Folder[] } | undefined)?.data ?? []

  const handleCreate = () => {
    if (!newName.trim()) return
    createMutation.mutate(newName.trim())
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Folders</span>
        <button
          onClick={() => setCreating(true)}
          className="text-xs text-primary hover:underline"
          title="New folder"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {/* All Documents */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-left transition-colors ${
            selectedId === null ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
          }`}
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span>All Documents</span>
        </button>

        {folders.map((f) => (
          <FolderNode
            key={f.id}
            folder={f}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}

        {folders.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No folders yet</p>
        )}
      </div>

      {creating && (
        <div className="p-2 border-t border-border">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
            placeholder="Folder name…"
            className="w-full text-sm border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => { setCreating(false); setNewName('') }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
