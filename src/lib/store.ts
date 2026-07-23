import { create } from "zustand"

export type TabId = "dashboard" | "add" | "history" | "savings" | "settings"

interface Filters {
  month: string
  categoryId: string | null
  search: string
  sortBy: "date" | "amount"
  sortOrder: "asc" | "desc"
}

interface AppState {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  filters: Filters
  setFilters: (filters: Partial<Filters>) => void
  resetFilters: () => void
}

const defaultFilters: Filters = {
  month: new Date().toISOString().slice(0, 7),
  categoryId: null,
  search: "",
  sortBy: "date",
  sortOrder: "desc",
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),
  filters: { ...defaultFilters },
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
}))
