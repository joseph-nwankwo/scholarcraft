import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  mobileOpen: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
  openMobile: () => void
  closeMobile: () => void
  toggleMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

const STORAGE_KEY = 'lc-sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const setCollapsed = useCallback((v: boolean) => setCollapsedState(v), [])
  const toggle = useCallback(() => setCollapsedState((c) => !c), [])
  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), [])

  const value = useMemo(
    () => ({ collapsed, mobileOpen, toggle, setCollapsed, openMobile, closeMobile, toggleMobile }),
    [collapsed, mobileOpen, toggle, setCollapsed, openMobile, closeMobile, toggleMobile]
  )

  return (
    <SidebarContext value={value}>
      {children}
    </SidebarContext>
  )
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
