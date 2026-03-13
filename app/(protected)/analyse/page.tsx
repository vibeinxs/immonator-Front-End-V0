"use client"

import { type ReactNode, useCallback, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalysisInputPanel } from "@/features/analysis/AnalysisInputPanel"
import { KpiGrid } from "@/features/analysis/KpiGrid"
import { CashflowChart, type YearData } from "@/components/analysis/CashflowChart"
import { ExitHorizonsTable } from "@/components/analysis/ExitHorizonsTable"
import { YearByYearTable } from "@/components/analysis/YearByYearTable"
import { LandShareBlock } from "@/components/analysis/LandShareBlock"
import { FlagsSection } from "@/features/analysis/FlagsSection"
import { analyseProperty } from "@/lib/analyseApi"
import { runLocalCompute } from "@/lib/localComputeBridge"
import { useAnalysisStore } from "@/store/analysisStore"
import { useLocale } from "@/lib/i18n/locale-context"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"


const NEGOTIATION_SCORE_THRESHOLD = 6
const NEGOTIATION_NEGATIVE_CASHFLOW_THRESHOLD = 0

function toChartData(yearData: AnalyseResponse["year_data"]): YearData[] {
  return yearData.map((y) => ({
    year: y.year,
    cashflow_monthly: y.cash_flow_monthly ?? (y.cash_flow != null ? y.cash_flow / 12 : undefined),
    equity: y.net_worth,
  }))
}

function verdictClass(score: number) {
  if (score >= 7) return "text-success"
  if (score >= 5) return "text-warning"
  return "text-danger"
}

function formatVerdict(verdict: string, t: (k: string) => string) {
  return t(`verdict.${verdict}`)
}

function ResultOverview({ input, result }: { input: AnalyseRequest; result: AnalyseResponse }) {
  const { t } = useLocale()

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border-default bg-bg-surface p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-border-default text-center">
            <div>
              <div className="font-mono text-2xl font-bold text-text-primary">{result.score.toFixed(1)}</div>
              <div className="text-[10px] text-text-muted">/10</div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{t("analyse.results.verdictTitle")}</p>
            <p className={`mt-1 text-3xl font-semibold ${verdictClass(result.score)}`}>{formatVerdict(result.verdict, t)}</p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("analyse.kpi.netYield")}: {result.net_yield_pct.toFixed(1)}% · {t("analyse.kpi.purchaseFactor")}: {result.kpf.toFixed(1)}× · IRR 10y: {result.irr_10.toFixed(1)}% · {t("analyse.kpi.cashFlowYr1")}: {result.cash_flow_monthly_yr1.toFixed(0)}€/mo
            </p>
          </div>
        </div>
      </section>

      <section>
        <KpiGrid result={result} />
      </section>

      <section className="rounded-[14px] border border-border-default bg-bg-surface p-4">
        <p className="mb-1 text-sm font-semibold text-text-primary">{t("analyse.results.landShareTitle")}</p>
        <LandShareBlock landSharePct={input.land_share_pct ?? 20} purchasePrice={input.purchase_price} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[14px] border border-border-default bg-bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">{t("analyse.results.annualCashflow")}</h3>
          <p className="mb-3 text-[11px] text-text-muted">{t("analyse.results.cashflowSubtitle")}</p>
          <CashflowChart yearData={toChartData(result.year_data)} />
        </div>
        <div className="rounded-[14px] border border-border-default bg-bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">{t("analyse.results.flags")}</h3>
          <FlagsSection result={result} />
        </div>
      </section>
    </div>
  )
}

function MarketDataPanel({ input, result }: { input: AnalyseRequest; result: AnalyseResponse }) {
  const { t } = useLocale()
  const rows = [
    { label: t("analyse.market.bodenrichtwert"), value: result.bodenrichtwert_m2 ? `€${result.bodenrichtwert_m2}/m²` : "N/A", note: t("analyse.market.landValue") },
    { label: t("analyse.market.rentIndex"), value: result.market_rent_m2 ? `€${result.market_rent_m2}/m²` : "N/A", note: t("analyse.market.mietspiegel") },
    { label: t("analyse.market.mortgageRate"), value: result.current_mortgage_rate ? `${result.current_mortgage_rate}%` : "N/A", note: t("analyse.market.bundesbank") },
    { label: t("analyse.market.locationScore"), value: result.location_score ? `${result.location_score}/10` : "N/A", note: t("analyse.market.amenity") },
    { label: t("analyse.market.populationTrend"), value: result.population_trend || "N/A", note: t("analyse.market.populationNote") },
    { label: t("analyse.market.address"), value: result.address_resolved || input.address, note: t("analyse.market.geocoded") },
  ]

  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <p className="text-sm font-semibold text-text-primary">{t("analyse.market.title")}</p>
        <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-[11px] text-text-muted">
          {result.market_rent_m2 ? t("analyse.market.live") : t("analyse.market.offline")}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {rows.map((row, idx) => (
          <div key={row.label} className={`p-4 ${idx % 2 === 0 ? "md:border-r" : ""} ${idx < rows.length - 2 ? "border-b" : ""} border-border-default`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{row.label}</p>
            <p className="mt-1 break-words font-mono text-2xl font-bold text-text-primary">{row.value}</p>
            <p className="mt-1 text-xs text-text-muted">{row.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border-default bg-bg-surface">
      <div className="border-b border-border-default px-4 py-3 md:px-5">
        <h2 className="text-sm font-semibold text-text-primary md:text-base">{title}</h2>
        {description ? <p className="mt-1 text-xs text-text-muted md:text-sm">{description}</p> : null}
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  )
}

function aiInsightText(result: AnalyseResponse, t: (k: string) => string) {
  const verdict = t(`verdict.${result.verdict}`)
  const cashflowRounded = result.cash_flow_monthly_yr1.toFixed(0)
  const cf = result.cash_flow_monthly_yr1 >= 0 ? `+${cashflowRounded}` : cashflowRounded
  return `${verdict} · Score ${result.score.toFixed(1)}/10 · Net yield ${result.net_yield_pct.toFixed(1)}% · Cashflow ${cf}€/mo`
}

function negotiationBullets(result: AnalyseResponse, t: (k: string) => string) {
  const asks: string[] = []
  if (result.score < NEGOTIATION_SCORE_THRESHOLD) {
    asks.push(t("analyse.new.negotiation.anchor"))
  }
  if (result.cash_flow_monthly_yr1 < NEGOTIATION_NEGATIVE_CASHFLOW_THRESHOLD) {
    asks.push(t("analyse.new.negotiation.cashflow"))
  }
  if ((result.market_rent_m2 ?? 0) > 0) {
    asks.push(t("analyse.new.negotiation.rentReference").replace("{0}", String(result.market_rent_m2)))
  }
  const finalAsks = asks.slice(0, 2)
  finalAsks.push(t("analyse.new.negotiation.walkAway"))
  return finalAsks
}

function AskAiShell({ mode, t }: { mode: "single" | "compare"; t: (k: string) => string }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-base">
      <div className="max-h-64 space-y-3 overflow-y-auto border-b border-border-default p-4">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-secondary">
            {t("analyse.new.askAi.shellIntro")}
          </div>
        </div>
        {mode === "compare" ? (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-secondary">
              {t("analyse.new.askAi.shellCompareHint")}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex gap-2 p-3">
        <input
          type="text"
          disabled
          placeholder={t("analyse.new.askAi.inputPlaceholder")}
          className="flex-1 rounded-xl border border-border-default bg-bg-elevated px-4 py-2.5 text-sm text-text-muted"
        />
        <button disabled className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white opacity-50">
          {t("analyse.new.askAi.send")}
        </button>
      </div>
    </div>
  )
}

export default function AnalysePage() {
  const { t } = useLocale()
  const { inputA, setInputA, resultA, setResultA, inputB, setInputB, resultB, setResultB } = useAnalysisStore()

  const [mode, setMode] = useState<"single" | "compare">("single")
  const [resultTab, setResultTab] = useState<"overview" | "projections" | "market">("overview")
  const [selectedProperty, setSelectedProperty] = useState<"A" | "B">("A")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resultTopRef = useRef<HTMLDivElement | null>(null)

  const activeInput = selectedProperty === "A" ? inputA : inputB
  const activeResult = selectedProperty === "A" ? resultA : resultB
  const hasResults = mode === "single" ? !!resultA : !!resultA || !!resultB

  const analyseOne = useCallback(async (input: AnalyseRequest, setResult: (r: AnalyseResponse) => void) => {
    const { data } = await analyseProperty(input)
    if (data) {
      setResult(data)
      return
    }
    setResult(runLocalCompute(input))
  }, [])

  const handleAnalyse = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (mode === "single") {
        await analyseOne(inputA, setResultA)
        setSelectedProperty("A")
      } else {
        await Promise.all([
          analyseOne(inputA, setResultA),
          analyseOne(inputB, setResultB),
        ])
      }
      setTimeout(() => resultTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 20)
    } catch {
      setError(t("analyse.error"))
    } finally {
      setLoading(false)
    }
  }, [analyseOne, inputA, inputB, mode, setResultA, setResultB, t])

  const compareSelector = useMemo(() => (
    <div className="inline-flex rounded-lg border border-border-default bg-bg-surface p-1 text-xs font-semibold">
      <button className={`rounded px-3 py-1 ${selectedProperty === "A" ? "bg-brand text-white" : "text-text-secondary"}`} onClick={() => setSelectedProperty("A")}>{t("analyse.propertyA")}</button>
      <button className={`rounded px-3 py-1 ${selectedProperty === "B" ? "bg-brand text-white" : "text-text-secondary"}`} onClick={() => setSelectedProperty("B")}>{t("analyse.propertyB")}</button>
    </div>
  ), [selectedProperty, t])

  return (
    <div className="h-full overflow-y-auto bg-bg-base p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text-primary">{t("analyse.title")}</h1>
          <p className="text-sm text-text-secondary">{t("analyse.subtitle")}</p>
        </div>
        <button onClick={handleAnalyse} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? t("analyse.action.analysing") : t("analyse.action.analyse")}
        </button>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "compare")} className="mb-4">
        <TabsList className="h-auto rounded-xl border border-border-default bg-bg-surface p-1">
          <TabsTrigger value="single" className="rounded-lg px-4 py-2 text-sm">{t("analyse.mode.single")}</TabsTrigger>
          <TabsTrigger value="compare" className="rounded-lg px-4 py-2 text-sm">{t("analyse.mode.compare")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-[minmax(360px,42%)_1fr]">
        <section className="rounded-2xl border border-border-default bg-bg-surface">
          {mode === "single" ? (
            <AnalysisInputPanel input={inputA} onChange={setInputA} showAnalyseButton={false} />
          ) : (
            <div className="grid gap-4 p-4 xl:grid-cols-2">
              <div className="rounded-xl border border-border-default">
                <div className="border-b border-border-default px-3 py-2 text-sm font-semibold text-text-primary">{t("analyse.propertyA")}</div>
                <AnalysisInputPanel input={inputA} onChange={setInputA} showAnalyseButton={false} />
              </div>
              <div className="rounded-xl border border-border-default">
                <div className="border-b border-border-default px-3 py-2 text-sm font-semibold text-text-primary">{t("analyse.propertyB")}</div>
                <AnalysisInputPanel input={inputB} onChange={setInputB} showAnalyseButton={false} />
              </div>
            </div>
          )}
        </section>

        <section ref={resultTopRef} className="space-y-4">
          {error && <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">{error}</div>}
          {!hasResults ? (
            <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface p-8 text-center text-sm text-text-secondary">
              {t("analyse.empty")}
            </div>
          ) : activeResult ? (
            <div className="space-y-4">
              <SectionShell title={t("analyse.new.analysis.title")} description={t("analyse.new.analysis.description")}>
                <Tabs value={resultTab} onValueChange={(v) => setResultTab(v as typeof resultTab)}>
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-default pb-2">
                    <TabsList className="h-auto bg-transparent p-0 gap-0 rounded-none">
                      <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("analyse.tab.overview")}</TabsTrigger>
                      <TabsTrigger value="projections" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("analyse.tab.projections")}</TabsTrigger>
                      <TabsTrigger value="market" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("analyse.tab.market")}</TabsTrigger>
                    </TabsList>
                    {mode === "compare" && compareSelector}
                  </div>

                  <TabsContent value="overview" className="mt-0"><ResultOverview input={activeInput} result={activeResult} /></TabsContent>
                  <TabsContent value="projections" className="mt-0 space-y-4">
                    <ExitHorizonsTable
                      irr_10={activeResult.irr_10}
                      irr_15={activeResult.irr_15}
                      irr_20={activeResult.irr_20}
                      equity_multiple_10={activeResult.equity_multiple_10}
                      equity_multiple_15={activeResult.equity_multiple_15}
                      equity_multiple_20={activeResult.equity_multiple_20}
                      holding_years={activeInput.holding_years ?? 10}
                    />
                    <YearByYearTable yearData={activeResult.year_data} />
                  </TabsContent>
                  <TabsContent value="market" className="mt-0">
                    <MarketDataPanel input={activeInput} result={activeResult} />
                  </TabsContent>
                </Tabs>
              </SectionShell>

              <SectionShell title={t("analyse.new.aiInsight.title")} description={t("analyse.new.aiInsight.description")}>
                <p className="text-sm text-text-secondary">{aiInsightText(activeResult, t)}</p>
              </SectionShell>

              <SectionShell title={t("analyse.new.aiAnalysis.title")} description={t("analyse.new.aiAnalysis.description")}>
                {mode === "compare" ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-border-default bg-bg-base p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t("analyse.propertyA")}</p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{resultA?.ai_analysis || t("analyse.ai.empty")}</p>
                    </div>
                    <div className="rounded-xl border border-border-default bg-bg-base p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t("analyse.propertyB")}</p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{resultB?.ai_analysis || t("analyse.ai.empty")}</p>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{activeResult.ai_analysis || t("analyse.ai.empty")}</p>
                )}
              </SectionShell>

              <SectionShell title={t("analyse.new.negotiation.title")} description={t("analyse.new.negotiation.description")}>
                <ul className="space-y-2 text-sm text-text-secondary">
                  {negotiationBullets(activeResult, t).map((item) => (
                    <li key={item} className="rounded-lg border border-border-default bg-bg-base px-3 py-2">• {item}</li>
                  ))}
                </ul>
              </SectionShell>

              <SectionShell title={t("analyse.new.askAi.title")} description={t("analyse.new.askAi.description")}>
                <AskAiShell mode={mode} t={t} />
              </SectionShell>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border-default bg-bg-surface p-6 text-sm text-text-secondary">
              {t("analyse.compare.pickProperty")}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
