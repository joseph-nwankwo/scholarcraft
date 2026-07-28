import { useState, useMemo, useCallback, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Settings2, Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/design-system/buttons/Button'
import { SearchBox } from '@/components/design-system/inputs/SearchBox'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  cell?: (row: T, index: number) => ReactNode
  sortable?: boolean
  width?: string
  minWidth?: string
  align?: 'left' | 'center' | 'right'
  hidden?: boolean
}

export interface BulkAction {
  label: string
  action: string
  variant?: 'default' | 'destructive'
  icon?: ReactNode
}

export interface DataTableProps<T extends { id: string }> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  selectable?: boolean
  stickyHeader?: boolean
  pagination?: boolean
  defaultPageSize?: number
  pageSizeOptions?: number[]
  bulkActions?: BulkAction[]
  onBulkAction?: (action: string, rows: T[]) => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
  toolbar?: ReactNode
  caption?: string
  className?: string
  onRowClick?: (row: T) => void
  getRowClass?: (row: T) => string
}

type SortDir = 'asc' | 'desc' | null

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc')  return <ChevronUp className="h-3.5 w-3.5 text-primary" />
  if (dir === 'desc') return <ChevronDown className="h-3.5 w-3.5 text-primary" />
  return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
}

export function DataTable<T extends { id: string }>({
  data,
  columns: allColumns,
  loading,
  searchable,
  searchPlaceholder = 'Search…',
  selectable,
  stickyHeader,
  pagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  bulkActions = [],
  onBulkAction,
  emptyTitle = 'No results',
  emptyDescription = 'Try adjusting your search or filters.',
  emptyAction,
  toolbar,
  caption,
  className,
  onRowClick,
  getRowClass,
}: DataTableProps<T>) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(
    () => new Set(allColumns.filter((c) => !c.hidden).map((c) => c.key))
  )
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const columns = allColumns.filter((c) => visibleKeys.has(c.key))

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      Object.values(row as Record<string, unknown>).some((v) =>
        String(v ?? '').toLowerCase().includes(q)
      )
    )
  }, [data, search])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = pagination ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted

  const toggleSort = useCallback((key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey(null); setSortDir(null) }
    setPage(1)
  }, [sortKey, sortDir])

  const toggleAll = () => {
    if (selected.size === pageRows.length) setSelected(new Set())
    else setSelected(new Set(pageRows.map((r) => r.id)))
  }

  const toggleRow = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const selectedRows = data.filter((r) => selected.has(r.id))
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toolbar */}
      {(searchable || toolbar || allColumns.length > columns.length || selectable) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {searchable && (
              <SearchBox
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                onClear={() => { setSearch(''); setPage(1) }}
                placeholder={searchPlaceholder}
                size="sm"
                className="max-w-xs flex-1"
              />
            )}
            {selected.size > 0 && bulkActions.length > 0 && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                {bulkActions.map((action) => (
                  <Button
                    key={action.action}
                    variant={action.variant === 'destructive' ? 'danger' : 'outline'}
                    size="xs"
                    leftIcon={action.icon}
                    onClick={() => onBulkAction?.(action.action, selectedRows)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {toolbar}
            {/* Column visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" leftIcon={<Settings2 className="h-3.5 w-3.5" />}>
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {allColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleKeys.has(col.key)}
                    onCheckedChange={(checked) => {
                      const next = new Set(visibleKeys)
                      if (checked) next.add(col.key); else next.delete(col.key)
                      setVisibleKeys(next)
                    }}
                  >
                    {col.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm" aria-label={caption}>
            {caption && <caption className="sr-only">{caption}</caption>}

            <thead className={cn('bg-muted/40 border-b', stickyHeader && 'sticky top-0 z-10')}>
              <tr>
                {selectable && (
                  <th className="w-10 pl-4 pr-2 py-3">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all rows"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width, minWidth: col.minWidth }}
                    className={cn(
                      'px-3 py-3 text-[0.8125rem] font-semibold text-foreground whitespace-nowrap',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      col.sortable && 'cursor-pointer select-none hover:bg-muted/70 transition-colors'
                    )}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                    aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && <SortIcon dir={sortKey === col.key ? sortDir : null} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                  <tr key={i}>
                    {selectable && <td className="pl-4 pr-2 py-3"><Skeleton className="h-4 w-4 rounded" /></td>}
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)}>
                    <EmptyState
                      icon={<Search className="h-6 w-6" />}
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                      size="sm"
                    />
                  </td>
                </tr>
              ) : (
                pageRows.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'group transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-muted/30',
                      selected.has(row.id) && 'bg-primary/5 hover:bg-primary/5',
                      getRowClass?.(row)
                    )}
                  >
                    {selectable && (
                      <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggleRow(row.id)}
                          aria-label={`Select row ${i + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3 py-3 text-sm text-foreground',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right'
                        )}
                      >
                        {col.cell
                          ? col.cell(row, i)
                          : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && !loading && sorted.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row items-center justify-between border-t bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {sorted.length === 0 ? 'No results' : (
                  `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, sorted.length)} of ${sorted.length}`
                )}
              </span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="rounded border border-input bg-background px-1.5 py-0.5 text-xs"
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((s) => (
                  <option key={s} value={s}>{s} per page</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="xs"
                leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                Prev
              </Button>
              <span className="px-2 text-xs text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline" size="xs"
                rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
