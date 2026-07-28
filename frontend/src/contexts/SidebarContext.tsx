import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  mobileOpen: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
  openMobile: () => void
  closeMobile: () => void
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

  function setCollapsed(v: boolean) {
    setCollapsedState(v)
  }

  function toggle() {
    setCollapsedState((c) => !c)
  }

  return (
    <SidebarContext value={{ collapsed, mobileOpen, toggle, setCollapsed, openMobile: () => setMobileOpen(true), closeMobile: () => setMobileOpen(false) }}>
      {children}
    </SidebarContext>
  )
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
