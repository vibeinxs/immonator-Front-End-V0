"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AnalysisInputPanel } from "@/features/analysis/AnalysisInputPanel"
import { KpiGrid } from "@/features/analysis/KpiGrid"
import { CashflowChart, type YearData } from "@/components/analysis/CashflowChart"
import { ExitHorizonsTable } from "@/components/analysis/ExitHorizonsTable"
import { YearByYearTable } from "@/components/analysis/YearByYearTable"
import { LandShareBlock } from "@/components/analysis/LandShareBlock"
import { PropertyPanel } from "@/features/analysis/PropertyPanel"
import { SaveToPortfolioButton } from "@/components/analysis/SaveToPortfolioButton"
import { CompareTable } from "@/features/compare/CompareTable"
import { analyseProperty } from "@/lib/analyseApi"
import { runLocalCompute } from "@/lib/localComputeBridge"
import { useAnalysisStore } from "@/store/analysisStore"
import type { AnalyseResponse } from "@/types/api"

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  }, [input, setResult])

  const handleAnalyse = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const { data, error: apiError } = await analyseProperty(input)
      if (data) {
        setResult(data)
      } else {
        setError(apiError ?? "Backend unavailable — showing local estimate")
      }
    } finally {
      setLoading(false)
    }
  }, [input, setResult])

  const bothReady = result !== null && resultB !== null

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-72 shrink-0 overflow-hidden border-r border-border-default bg-bg-surface flex flex-col">
        <div className="border-b border-border-default px-4 py-3">
          <h1 className="font-serif text-base font-semibold text-text-primary">Analyze</h1>
          <p className="text-[11px] text-text-muted">Single property + compare mode with full KPIs</p>
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

      <main className="flex-1 overflow-y-auto bg-bg-base">
        <Tabs defaultValue="single" className="h-full flex flex-col">
          <div className="sticky top-0 z-10 border-b border-border-default bg-bg-surface px-6 py-0">
            <TabsList className="h-auto bg-transparent p-0 gap-0 rounded-none">
              <TabsTrigger
                value="single"
                className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm text-text-secondary transition-colors data-[state=active]:border-brand data-[state=active]:text-brand data-[state=active]:shadow-none"
              >
                Single Property
              </TabsTrigger>
              <TabsTrigger
                value="compare"
                className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm text-text-secondary transition-colors data-[state=active]:border-brand data-[state=active]:text-brand data-[state=active]:shadow-none"
              >
                Compare 2 Properties
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="single" className="flex-1 p-6 space-y-6 mt-0">
            {error && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm text-warning">
                {error}
              </div>
            )}

            {result ? (
              <>
                <section>
                  <KpiGrid result={result} />
                </section>

                <section>
                  <LandShareBlock
                    landSharePct={input.land_share_pct ?? 20}
                    purchasePrice={input.purchase_price}
                  />
                </section>

                <section className="rounded-[14px] border border-border-default bg-bg-surface p-5">
                  <h3 className="mb-3 text-sm font-semibold text-text-primary">Annual Cash Flow</h3>
                  <p className="mb-3 text-[11px] text-text-muted">Monthly cash flow by year (€/mo)</p>
                  <CashflowChart yearData={toChartData(result.year_data)} />
                </section>

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

                <section>
                  <YearByYearTable yearData={result.year_data} />
                </section>

                <section className="flex items-center justify-between gap-3">
                  <SaveToPortfolioButton input={input} result={result} />
                  <Link
                    href="/analyse/compare"
                    className="flex items-center gap-1 rounded-lg border border-border-default px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Open full compare page
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </section>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">🏠</span>
                </div>
                <h3 className="font-serif text-lg text-text-primary">Fill in property details</h3>
                <p className="mt-2 text-sm text-text-secondary max-w-xs">
                  Enter details in the sidebar. Core KPIs appear instantly while all KPIs are one click away.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare" className="flex-1 p-6 space-y-6 mt-0">
            <section className="rounded-[14px] border border-border-default bg-bg-surface p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold text-text-primary">Property B</p>
                <p className="text-[11px] text-text-muted">Add and analyse your second property for side-by-side KPI comparison.</p>
              </div>
              <PropertyPanel
                label="Property B"
                input={inputB}
                result={resultB}
                onInputChange={setInputB}
                onResult={setResultB}
              />
            </section>

            {bothReady ? (
              <section className="space-y-4">
                <div className="rounded-[14px] border border-border-default bg-bg-surface p-4">
                  <p className="text-sm font-semibold text-text-primary">Full KPI Comparison</p>
                  <p className="text-[11px] text-text-muted">Property A vs Property B across core and extended KPIs.</p>
                </div>
                <CompareTable
                  resultA={result}
                  resultB={resultB}
                  labelA="Property A"
                  labelB="Property B"
                />
              </section>
            ) : (
              <div className="rounded-[14px] border border-dashed border-border-default bg-bg-surface p-6 text-sm text-text-secondary">
                Analyse Property A (left panel) and Property B to unlock the side-by-side comparison table.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
