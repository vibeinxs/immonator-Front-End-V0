import type { AnalyseRequest, AnalyseResponse } from "@/types/api"

export type ManualPortfolioStatus = "watching" | "analysing" | "negotiating" | "purchased" | "rejected"

export interface ManualPortfolioEntry {
  id: string
  name: string
  savedAt: string
  status: ManualPortfolioStatus
  input: AnalyseRequest
  result: AnalyseResponse
}

const STORAGE_KEY = "immo_manual_portfolio"

function load(): ManualPortfolioEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ManualPortfolioEntry[]) : []
  } catch {
    return []
  }
}

function persist(entries: ManualPortfolioEntry[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function listEntries(): ManualPortfolioEntry[] {
  return load().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  )
}

export function saveEntry(
  entry: Omit<ManualPortfolioEntry, "id" | "savedAt">
): ManualPortfolioEntry {
  const entries = load()
  const newEntry: ManualPortfolioEntry = {
    ...entry,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  }
  persist([newEntry, ...entries])
  return newEntry
}

export function deleteEntry(id: string): void {
  persist(load().filter((e) => e.id !== id))
}

export function updateStatus(id: string, status: ManualPortfolioStatus): void {
  persist(load().map((e) => (e.id === id ? { ...e, status } : e)))
}
