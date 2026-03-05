"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"
import { PRESET_A, PRESET_B } from "@/features/analysis/presets"

interface AnalysisState {
  inputA: AnalyseRequest
  inputB: AnalyseRequest
  resultA: AnalyseResponse | null
  resultB: AnalyseResponse | null
  setInputA: (input: AnalyseRequest) => void
  setInputB: (input: AnalyseRequest) => void
  setResultA: (result: AnalyseResponse | null) => void
  setResultB: (result: AnalyseResponse | null) => void
  resetA: () => void
  resetB: () => void
}

const AnalysisContext = createContext<AnalysisState | null>(null)

export function AnalysisStoreProvider({ children }: { children: ReactNode }) {
  const [inputA, setInputA] = useState<AnalyseRequest>(PRESET_A)
  const [inputB, setInputB] = useState<AnalyseRequest>(PRESET_B)
  const [resultA, setResultA] = useState<AnalyseResponse | null>(null)
  const [resultB, setResultB] = useState<AnalyseResponse | null>(null)

  const resetA = useCallback(() => {
    setInputA(PRESET_A)
    setResultA(null)
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
        setInputA,
        setInputB,
        setResultA,
        setResultB,
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
