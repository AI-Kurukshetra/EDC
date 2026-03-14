'use client'

import { create } from 'zustand'

type UiStore = {
  sidebarOpen: boolean
  setSidebarOpen: (isOpen: boolean) => void
  toggleSidebar: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (isOpen) => {
    set({ sidebarOpen: isOpen })
  },
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },
}))
