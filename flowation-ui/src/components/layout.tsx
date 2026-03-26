import { Outlet } from '@tanstack/react-router'
import { Sidebar } from './sidebar.tsx'

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-[var(--color-bg-primary)]">
        <Outlet />
      </main>
    </div>
  )
}
