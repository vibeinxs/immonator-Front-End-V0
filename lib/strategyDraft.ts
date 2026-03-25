"use client"

export interface StrategyDraftProfile {
  equity: number
  income: number
  expenses: number
  style: string
  horizon: string
  focus: string
  min_yield: number
  cities: string[]
  types: string[]
}

export interface StrategyDraft {
  step: number
  profile: StrategyDraftProfile
  updatedAt: string
}

const DRAFT_KEY = "immo_strategy_draft"
const DISMISSED_KEY = "immo_strategy_draft_prompt_dismissed"
const LEGACY_WIZARD_OPEN_KEYS = ["immo_strategy_wizard_open", "strategyWizardOpen"] as const

export function getStrategyDraft(): StrategyDraft | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StrategyDraft>
    if (!parsed || typeof parsed !== "object") return null
    if (typeof parsed.step !== "number" || !parsed.profile || typeof parsed.profile !== "object") return null
    return {
      step: Math.max(0, Math.min(4, Math.floor(parsed.step))),
      profile: parsed.profile as StrategyDraftProfile,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveStrategyDraft(draft: Omit<StrategyDraft, "updatedAt">): void {
  if (typeof window === "undefined") return
  const next: StrategyDraft = { ...draft, updatedAt: new Date().toISOString() }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
  localStorage.removeItem(DISMISSED_KEY)
}

export function clearStrategyDraft(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(DRAFT_KEY)
  localStorage.removeItem(DISMISSED_KEY)
}

export function dismissStrategyDraftPrompt(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(DISMISSED_KEY, "1")
}

export function isStrategyDraftPromptDismissed(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(DISMISSED_KEY) === "1"
}

export function resetLegacyStrategyWizardFlags(): void {
  if (typeof window === "undefined") return
  LEGACY_WIZARD_OPEN_KEYS.forEach((key) => localStorage.removeItem(key))
}
