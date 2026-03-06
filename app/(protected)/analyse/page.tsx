"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ArrowRight, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AnalysisInputPanel } from "@/features/analysis/AnalysisInputPanel"
import { KpiGrid } from "@/features/analysis/KpiGrid"
import { CashflowChart, type YearData } from "@/components/analysis/CashflowChart"
import { ExitHorizonsTable } from "@/components/analysis/ExitHorizonsTable"
import { YearByYearTable } from "@/components/analysis/YearByYearTable"
import { LandShareBlock } from "@/components/analysis/LandShareBlock"
import { PropertyPanel } from "@/features/analysis/PropertyPanel"
import { SaveToPortfolioButton } from "@/components/analysis/SaveToPortfolioButton"
import { analyseProperty } from "@/lib/analyseApi"
import { runLocalCompute } from "@/lib/localComputeBridge"
import { PRESET_A } from "@/features/analysis/presets"
import { useAnalysisStore } from "@/store/analysisStore"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"

function toChartData(yearData: AnalyseResponse["year_data"]): YearData[] {
  return yearData.map((y) => ({
    year: y.year,
    cashflow_monthly:
      y.cash_flow_monthly ?? (y.cash_flow != null ? y.cash_flow / 12 : undefined),
    equity: y.net_worth,
  }))
}

export default function AnalysePage() {
  const { inputA, setInputA, resultA, setResultA, inputB, resultB, setInputB, setResultB } = useAnalysisStore()

  const input = inputA
  const setInput = setInputA
  const result = resultA
  const setResult = setResultA
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live preview via localCompute on every input change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        setResult(runLocalCompute(input))
      } catch {
        // ignore errors during editing
      }
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [input])

  const handleAnalyse = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const { data, error: apiError } = await analyseProperty(input)
      if (data) {
        setResult(data)
      } else {
        // Keep local result; show soft error
        setError(apiError ?? "Backend unavailable — showing local estimate")
      }
    } finally {
      setLoading(false)
    }
  }, [input])

  const bothReady = result !== null && resultB !== null

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left sidebar: input form ─────────────────────────── */}
      <aside className="w-72 shrink-0 overflow-hidden border-r border-border-default bg-bg-surface flex flex-col">
        <div className="border-b border-border-default px-4 py-3">
          <h1 className="font-serif text-base font-semibold text-text-primary">Property Analysis</h1>
          <p className="text-[11px] text-text-muted">Immonator · AfA · IRR · 20-yr projection</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <AnalysisInputPanel
            input={input}
            onChange={setInput}
            onAnalyse={handleAnalyse}
            loading={loading}
          />
        </div>
      </aside>

      {/* ── Right main area ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-bg-base">
        <Tabs defaultValue="analysis" className="h-full flex flex-col">
          {/* Tab bar */}
          <div className="sticky top-0 z-10 border-b border-border-default bg-bg-surface px-6 py-0">
            <TabsList className="h-auto bg-transparent p-0 gap-0 rounded-none">
              {[
                { value: "analysis", label: "Analysis" },
                { value: "ai-analysis", label: "AI Analysis" },
              ].map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm text-text-secondary transition-colors data-[state=active]:border-brand data-[state=active]:text-brand data-[state=active]:shadow-none"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── Analysis tab ────────────────────────────────── */}
          <TabsContent value="analysis" className="flex-1 p-6 space-y-6 mt-0">
            {/* Backend error banner */}
            {error && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm text-warning">
                {error}
              </div>
            )}

            {result ? (
              <>
                {/* KPI Grid */}
                <section>
                  <KpiGrid result={result} />
                </section>

                {/* Land share hint */}
                <section>
                  <LandShareBlock
                    landSharePct={input.land_share_pct ?? 20}
                    purchasePrice={input.purchase_price}
                  />
                </section>

                {/* Cash Flow chart */}
                <section className="rounded-[14px] border border-border-default bg-bg-surface p-5">
                  <h3 className="mb-3 text-sm font-semibold text-text-primary">Annual Cash Flow</h3>
                  <p className="mb-3 text-[11px] text-text-muted">Monthly cash flow by year (€/mo)</p>
                  <CashflowChart yearData={toChartData(result.year_data)} />
                </section>

                {/* Returns at Exit Horizons table */}
                <section>
                  <ExitHorizonsTable
                    irr_10={result.irr_10}
                    irr_15={result.irr_15}
                    irr_20={result.irr_20}
                    equity_multiple_10={result.equity_multiple_10}
                    equity_multiple_15={result.equity_multiple_15}
                    equity_multiple_20={result.equity_multiple_20}
                    holding_years={input.holding_years ?? 10}
                  />
                </section>

                {/* Year-by-Year overview */}
                <section>
                  <YearByYearTable yearData={result.year_data} />
                </section>

                {/* ── Compare with Property B (collapsible) ── */}
                <section className="rounded-[14px] border border-border-default bg-bg-surface">
                  <button
                    type="button"
                    onClick={() => setCompareOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-bg-elevated/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Compare with Property B</p>
                      <p className="text-[11px] text-text-muted">Add a second property to compare side by side</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {bothReady && (
                        <Link
                          href="/analyse/compare"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
                        >
                          Full Comparison
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                      {compareOpen ? (
                        <ChevronUp className="h-4 w-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-text-muted" />
                      )}
                    </div>
                  </button>

                  {compareOpen && (
                    <div className="border-t border-border-default p-5">
                      <PropertyPanel
                        label="Property B"
                        input={inputB}
                        result={resultB}
                        onInputChange={setInputB}
                        onResult={setResultB}
                      />
                    </div>
                  )}
                </section>

                {/* Save to Portfolio */}
                <section className="flex justify-end">
                  <SaveToPortfolioButton input={input} result={result} />
                </section>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">🏠</span>
                </div>
                <h3 className="font-serif text-lg text-text-primary">Fill in property details</h3>
                <p className="mt-2 text-sm text-text-secondary max-w-xs">
                  Enter details in the sidebar. KPIs will appear instantly as you type.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ── AI Analysis tab (placeholder) ───────────────── */}
          <TabsContent value="ai-analysis" className="flex-1 p-6 mt-0">
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-14 w-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-5">
                <Sparkles className="h-7 w-7 text-brand" />
              </div>
              <h3 className="font-serif text-xl text-text-primary">AI Analysis</h3>
              <p className="mt-3 text-sm text-text-secondary max-w-sm">
                AI-powered commentary, risk flags, and investment recommendations are coming soon.
                Run the backend analysis to receive AI insights when available.
              </p>
              {result?.ai_analysis && (
                <div className="mt-6 max-w-2xl rounded-[14px] border border-border-default bg-bg-surface p-6 text-left">
                  <p className="text-sm font-semibold text-text-primary mb-3">AI Analysis</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{result.ai_analysis}</p>
                </div>
              )}
              {!result?.ai_analysis && (
                <button
                  type="button"
                  onClick={handleAnalyse}
                  disabled={loading}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Run Backend Analysis
                </button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
