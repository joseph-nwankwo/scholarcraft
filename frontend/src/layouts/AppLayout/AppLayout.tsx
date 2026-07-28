import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { TopNav } from './TopNav'
import MobileNav from './MobileNav'
import { Footer } from './Footer'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { CommandPaletteProvider } from '@/contexts/CommandPaletteContext'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { SkeletonPage } from '@/components/design-system/feedback/Skeleton'

function PageSuspense() {
  return (
    <div className="p-6">
      <SkeletonPage />
    </div>
  )
}

export default function AppLayout() {
  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Mobile Navigation Drawer */}
          <MobileNav />

          {/* Main column */}
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <TopNav />

            {/* Scrollable page area */}
            <main
              id="main-content"
              className="flex-1 overflow-y-auto scrollbar-thin bg-muted/20"
              tabIndex={-1}
            >
              <Suspense fallback={<PageSuspense />}>
                <Outlet />
              </Suspense>
            </main>

            <Footer />
          </div>
        </div>

        {/* Global overlays */}
        <CommandPalette />
      </SidebarProvider>
    </CommandPaletteProvider>
  )
}
