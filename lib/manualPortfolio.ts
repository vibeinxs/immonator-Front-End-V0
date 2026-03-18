import type { AnalyseRequest, AnalyseResponse } from "@/types/api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ManualPortfolioStatus = "watching" | "analysing" | "negotiating" | "purchased" | "rejected"

export interface ManualPortfolioEntry {
  id: string
  name: string
  savedAt: string
  status: ManualPortfolioStatus
  input: AnalyseRequest
  result: AnalyseResponse
  version: 1
}

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "immo_manual_portfolio"

// ─── Internal helpers ─────────────────────────────────────────────────────────

const VALID_STATUSES = new Set<ManualPortfolioStatus>(["watching", "analysing", "negotiating", "purchased", "rejected"])

/** Return true if `v` is a non-null plain object (not an array). */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

/**
 * Validate that a parsed value has the minimum shape of a ManualPortfolioEntry.
 * Only structural checks — no deep validation of `input` / `result`.
 */
function isValidEntry(v: unknown): v is ManualPortfolioEntry {
  if (!isObject(v)) return false
  const e = v as Record<string, unknown>
  return (
    typeof e.id === "string" &&
    e.id.length > 0 &&
    typeof e.name === "string" &&
    typeof e.savedAt === "string" &&
    !isNaN(new Date(e.savedAt as string).getTime()) &&
    VALID_STATUSES.has(e.status as ManualPortfolioStatus) &&
    isObject(e.input) &&
    isObject(e.result) &&
    e.version === 1
  )
}

/**
 * Parse localStorage and return all valid entries.
 * Silently drops any entry that fails structural validation, so a single
 * corrupt record never prevents the rest of the portfolio from loading.
 */
function load(): ManualPortfolioEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Migrate v0 entries (no version field) by adding version: 1 before validation.
    const migrated = parsed.map((item: unknown) =>
      isObject(item) && item.version === undefined ? { ...item, version: 1 } : item
    )
    return migrated.filter(isValidEntry)
  } catch {
    return []
  }
}

function persist(entries: ManualPortfolioEntry[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage quota exceeded or private-browsing write block — fail silently.
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return all saved entries sorted newest-first.
 * Returns [] when localStorage is unavailable, empty, or entirely malformed.
 */
export function listEntries(): ManualPortfolioEntry[] {
  return load().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  )
}

/**
 * Return the entry with the given id, or undefined if not found.
 */
export function getEntryById(id: string): ManualPortfolioEntry | undefined {
  return load().find((e) => e.id === id)
}

/**
 * Persist a new entry and return it with generated `id`, `savedAt`, and
 * `version` fields filled in. The new entry is prepended (newest-first).
 */
export function saveEntry(
  entry: Omit<ManualPortfolioEntry, "id" | "savedAt" | "version">
): ManualPortfolioEntry {
  const entries = load()
  const newEntry: ManualPortfolioEntry = {
    ...entry,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    version: 1,
  }
  persist([newEntry, ...entries])
  return newEntry
}

/**
 * Remove the entry with the given id. No-op if the id is not found.
 */
export function deleteEntry(id: string): void {
  const entries = load()
  const filtered = entries.filter((e) => e.id !== id)
  if (filtered.length !== entries.length) persist(filtered)
}

/**
 * Update the status of the entry with the given id. No-op if not found.
 */
export function updateStatus(id: string, status: ManualPortfolioStatus): void {
  const entries = load()
  const target = entries.find((e) => e.id === id)
  if (!target || target.status === status) return
  persist(entries.map((e) => (e.id === id ? { ...e, status } : e)))
}
