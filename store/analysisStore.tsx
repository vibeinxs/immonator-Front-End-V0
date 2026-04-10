"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"
import type { ReviewResult, SnapshotResult, StrategyResult } from "@/types/skills"
import { PRESET_A, PRESET_B } from "@/features/analysis/presets"

const SESSION_KEY = "immo_analysis_results"

function loadFromSession(): { resultA: AnalyseResponse | null; resultB: AnalyseResponse | null } {
  if (typeof window === "undefined") return { resultA: null, resultB: null }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return { resultA: null, resultB: null }
    return JSON.parse(raw)
  } catch {
    return { resultA: null, resultB: null }
  }
}

function saveToSession(resultA: AnalyseResponse | null, resultB: AnalyseResponse | null) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ resultA, resultB }))
  } catch {
    // sessionStorage unavailable (e.g. private browsing quota)
  }
}

interface AnalysisState {
  inputA: AnalyseRequest
  inputB: AnalyseRequest
  resultA: AnalyseResponse | null
  resultB: AnalyseResponse | null
  snapshotResult: SnapshotResult | null
  reviewResult: ReviewResult | null
  reviewRawResult: Record<string, unknown> | null
  strategyResult: StrategyResult | null
  strategyRawResult: Record<string, unknown> | null
  setInputA: (input: AnalyseRequest) => void
  setInputB: (input: AnalyseRequest) => void
  setResultA: (result: AnalyseResponse | null) => void
  setResultB: (result: AnalyseResponse | null) => void
  setSnapshotResult: (result: SnapshotResult | null) => void
  setReviewResult: (result: ReviewResult | null) => void
  setReviewRawResult: (result: Record<string, unknown> | null) => void
  setStrategyResult: (result: StrategyResult | null) => void
  setStrategyRawResult: (result: Record<string, unknown> | null) => void
  resetA: () => void
  resetB: () => void
}

const AnalysisContext = createContext<AnalysisState | null>(null)

export function AnalysisStoreProvider({ children }: { children: ReactNode }) {
  const [inputA, setInputA] = useState<AnalyseRequest>(PRESET_A)
  const [inputB, setInputB] = useState<AnalyseRequest>(PRESET_B)
  const [resultA, setResultA] = useState<AnalyseResponse | null>(null)
  const [resultB, setResultB] = useState<AnalyseResponse | null>(null)
  const [snapshotResult, setSnapshotResult] = useState<SnapshotResult | null>(null)
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const [reviewRawResult, setReviewRawResult] = useState<Record<string, unknown> | null>(null)
  const [strategyResult, setStrategyResult] = useState<StrategyResult | null>(null)
  const [strategyRawResult, setStrategyRawResult] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    try {
      const { resultA: savedA, resultB: savedB } = loadFromSession()
      if (savedA) setResultA(savedA)
      if (savedB) setResultB(savedB)
    } catch {
      // sessionStorage contained unexpected data — ignore and start fresh
    }
  }, [])

  useEffect(() => {
    saveToSession(resultA, resultB)
  }, [resultA, resultB])

  const resetA = useCallback(() => {
    setInputA(PRESET_A)
    setResultA(null)
    setSnapshotResult(null)
    setReviewResult(null)
    setReviewRawResult(null)
    setStrategyResult(null)
    setStrategyRawResult(null)
  }, [])

  const resetB = useCallback(() => {
    setInputB(PRESET_B)
    setResultB(null)
  }, [])

  return (
    <AnalysisContext.Provider
      value={{
        inputA,
        inputB,
        resultA,
        resultB,
        snapshotResult,
        reviewResult,
        reviewRawResult,
        strategyResult,
        strategyRawResult,
        setInputA,
        setInputB,
        setResultA,
        setResultB,
        setSnapshotResult,
        setReviewResult,
        setReviewRawResult,
        setStrategyResult,
        setStrategyRawResult,
        resetA,
        resetB,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysisStore(): AnalysisState {
  const ctx = useContext(AnalysisContext)
  if (!ctx) {
    throw new Error("useAnalysisStore must be used within AnalysisStoreProvider")
  }
  return ctx
}
