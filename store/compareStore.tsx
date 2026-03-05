"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { isEnabled } from "@/lib/featureFlags"

const MAX_SLOTS = isEnabled("enableCompare3rdSlot") ? 3 : 2
const STORAGE_KEY = "immo_compare_ids"

interface CompareContextValue {
  ids: string[]
  add: (id: string) => boolean  // returns false if slots full
  remove: (id: string) => void
  clear: () => void
  isFull: boolean
}

const CompareContext = createContext<CompareContextValue>({
  ids: [],
  add: () => false,
  remove: () => {},
  clear: () => {},
  isFull: false,
})

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([])

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) setIds(JSON.parse(stored))
    } catch {}
  }, [])

  // Persist to sessionStorage whenever ids change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {}
  }, [ids])

  const add = (id: string): boolean => {
    if (ids.includes(id)) return true  // already selected
    if (ids.length >= MAX_SLOTS) return false  // full
    setIds((prev) => [...prev, id])
    return true
  }

  const remove = (id: string) => setIds((prev) => prev.filter((i) => i !== id))
  const clear = () => setIds([])

  return (
    <CompareContext.Provider value={{ ids, add, remove, clear, isFull: ids.length >= MAX_SLOTS }}>
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare() {
  return useContext(CompareContext)
}
