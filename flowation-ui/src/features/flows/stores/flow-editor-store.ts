import { create } from 'zustand'

interface FlowEditorState {
  selectedStepId: string | null
  panelMode: 'view' | 'edit'
  setSelectedStepId: (id: string | null) => void
  setPanelMode: (mode: 'view' | 'edit') => void
  reset: () => void
}

export const useFlowEditorStore = create<FlowEditorState>()((set) => ({
  selectedStepId: null,
  panelMode: 'view',
  setSelectedStepId: (id) => set({ selectedStepId: id }),
  setPanelMode: (mode) => set({ panelMode: mode }),
  reset: () => set({ selectedStepId: null, panelMode: 'view' }),
}))
