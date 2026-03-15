import type { AnalyseRequest, AnalyseResponse } from "@/types/api"

export type AnalysisMode = "single" | "compare"
export type PropertySlot = "A" | "B"

export interface PropertyAnalysisSlice {
  slot: PropertySlot
  input: AnalyseRequest
  result: AnalyseResponse
}

export interface SinglePropertyAnalysisResult {
  kind: "single"
  property: PropertyAnalysisSlice
}

export interface ComparisonAnalysisResult {
  kind: "compare"
  selectedProperty: PropertySlot
  propertyA: PropertyAnalysisSlice | null
  propertyB: PropertyAnalysisSlice | null
}

export type AnalysisResultPayload = SinglePropertyAnalysisResult | ComparisonAnalysisResult

export interface AIInsightPayload {
  verdictLabel: string
  score: number
  netYieldPct: number
  cashflowMonthlyYr1: number
  summaryLine: string
  cards: Array<{
    id: "verdict" | "score" | "netYield" | "cashflow"
    label: string
    value: string
  }>
}

export interface AIAnalysisPayload {
  mode: AnalysisMode
  primaryText: string
  primaryNarrative: string[]
  compare?: {
    propertyA: string
    propertyB: string
    narrativeA: string[]
    narrativeB: string[]
  }
}

export type NegotiationStrategyId = "anchor" | "cashflow" | "rentReference" | "walkAway"

export interface NegotiationStrategyItem {
  id: NegotiationStrategyId
  text: string
}

export interface NegotiationStrategyPayload {
  items: NegotiationStrategyItem[]
}

export interface AskAiContextPayload {
  mode: AnalysisMode
  selectedProperty: PropertySlot
  propertyInputs: Record<PropertySlot, AnalyseRequest>
  propertyResults: Partial<Record<PropertySlot, AnalyseResponse | null>>
  promptHints: string[]
  mockMessages: Array<{
    id: string
    role: "assistant" | "user"
    text: string
  }>
}
