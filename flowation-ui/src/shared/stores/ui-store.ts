import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  selectedEnvironmentId: string | null
  sidebarCollapsed: boolean
  setSelectedEnvironmentId: (id: string | null) => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedEnvironmentId: null,
      sidebarCollapsed: false,
      setSelectedEnvironmentId: (id) => set({ selectedEnvironmentId: id }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: 'flowation-ui-state' },
  ),
)
