"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalysisInputPanel } from "@/features/analysis/AnalysisInputPanel"
import { KpiGrid } from "@/features/analysis/KpiGrid"
import { PRESET_A, PRESET_B } from "@/features/analysis/presets"
import { CompareTable, buildComparisonSummary } from "@/features/compare/CompareTable"
import { CashflowChart, type YearData } from "@/components/analysis/CashflowChart"
import { ExitHorizonsTable } from "@/components/analysis/ExitHorizonsTable"
import { SaveToPortfolioButton } from "@/components/analysis/SaveToPortfolioButton"
import { YearByYearTable } from "@/components/analysis/YearByYearTable"
import { LandShareBlock } from "@/components/analysis/LandShareBlock"
import { FlagsSection } from "@/features/analysis/FlagsSection"
import { analyseProperty } from "@/lib/analyseApi"
import { formatEUR, formatPct, formatX } from "@/lib/format"
import { runLocalCompute } from "@/lib/localComputeBridge"
import { useAnalysisStore } from "@/store/analysisStore"
import { useLocale } from "@/lib/i18n/locale-context"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"
import type {
  AIInsightPayload,
  AskAiContextPayload,
  NegotiationStrategyItem,
  NegotiationStrategyPayload,
} from "@/types/analyseView"

const NEGOTIATION_SCORE_THRESHOLD = 6
const NEGOTIATION_NEGATIVE_CASHFLOW_THRESHOLD = 0
const NEGOTIATION_DYNAMIC_POINTS_LIMIT = 2

type CompareMetricTone = "higher" | "lower"
type AnalysisMode = "single" | "compare"
type ResultTab = "overview" | "projections" | "market"
type ComparePropertyKey = "propertyA" | "propertyB"

type CompareInputsState = Record<ComparePropertyKey, AnalyseRequest>
type CompareResultsState = Record<ComparePropertyKey, AnalyseResponse | null>
type CompareLoadingState = Record<ComparePropertyKey, boolean>

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

function compareMetricClass(delta: number, better: CompareMetricTone) {
  if (delta === 0) return "text-text-muted"

  const isPositive = better === "higher" ? delta > 0 : delta < 0
  return isPositive ? "text-success" : "text-danger"
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
    <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <p className="text-sm font-semibold text-text-primary">{t("analyse.market.title")}</p>
        <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-[11px] text-text-muted">
          {result.market_rent_m2 ? t("analyse.market.live") : t("analyse.market.offline")}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {rows.map((row, idx) => (
          <div key={row.label} className={`border-border-default p-4 ${idx % 2 === 0 ? "md:border-r" : ""} ${idx < rows.length - 2 ? "border-b" : ""}`}>
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

function MetricMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-base p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function CompactPropertyResult({ result }: { result: AnalyseResponse | null }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border-default bg-bg-base p-4 text-sm text-text-muted">
        Run the analysis to see a compact result summary here.
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MetricMiniCard label="Score" value={`${result.score.toFixed(1)}/10`} />
      <MetricMiniCard label="Net Yield" value={formatPct(result.net_yield_pct)} />
      <MetricMiniCard label="Cash Flow / Mo Yr 1" value={formatEUR(result.cash_flow_monthly_yr1)} />
      <MetricMiniCard label="IRR 10 yr" value={formatPct(result.irr_10)} />
    </div>
  )
}

function CompactCompareSummary({ resultA, resultB }: { resultA: AnalyseResponse; resultB: AnalyseResponse }) {
  const summary = buildComparisonSummary(resultA, resultB)
  const metrics = [
    {
      label: "Score Δ",
      value: `${resultA.score >= resultB.score ? "A" : "B"} ${Math.abs(resultA.score - resultB.score).toFixed(1)}`,
      className: compareMetricClass(resultA.score - resultB.score, "higher"),
    },
    {
      label: "Net Yield Δ",
      value: formatPct(Math.abs(resultA.net_yield_pct - resultB.net_yield_pct)),
      className: compareMetricClass(resultA.net_yield_pct - resultB.net_yield_pct, "higher"),
    },
    {
      label: "Cash Flow Δ",
      value: formatEUR(Math.abs(resultA.cash_flow_monthly_yr1 - resultB.cash_flow_monthly_yr1)),
      className: compareMetricClass(resultA.cash_flow_monthly_yr1 - resultB.cash_flow_monthly_yr1, "higher"),
    },
    {
      label: "KPF Δ",
      value: formatX(Math.abs(resultA.kpf - resultB.kpf)),
      className: compareMetricClass(resultA.kpf - resultB.kpf, "lower"),
    },
  ]

  return (
    <div className="space-y-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">A vs B snapshot</p>
        <p className="mt-1 text-sm text-text-secondary">{summary}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border-default bg-bg-surface p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{metric.label}</p>
            <p className={`mt-1 font-mono text-lg font-semibold ${metric.className}`}>{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModeSwitcher({ mode, onChange }: { mode: AnalysisMode; onChange: (mode: AnalysisMode) => void }) {
  const options: Array<{ id: AnalysisMode; title: string; description: string }> = [
    {
      id: "single",
      title: "Single Analysis",
      description: "Analyse one property end-to-end with the full underwriting results stack.",
    },
    {
      id: "compare",
      title: "Compare Two Properties",
      description: "Run two equal-weight property analyses and compare them side by side.",
    },
  ]

  return (
    <section className="rounded-2xl border border-border-default bg-bg-surface p-2">
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => {
          const active = option.id === mode
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                active
                  ? "border-brand bg-brand/5 shadow-sm"
                  : "border-transparent bg-bg-base hover:border-border-default hover:bg-bg-elevated"
              }`}
            >
              <p className={`text-sm font-semibold ${active ? "text-brand" : "text-text-primary"}`}>{option.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{option.description}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ComparePropertyCard({
  label,
  description,
  input,
  result,
  loading,
  idPrefix,
  onChange,
  onAnalyse,
  onReset,
}: {
  label: string
  description: string
  input: AnalyseRequest
  result: AnalyseResponse | null
  loading: boolean
  idPrefix: string
  onChange: (value: AnalyseRequest) => void
  onAnalyse: () => void
  onReset: () => void
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-border-default px-4 py-4 md:px-5">
        <div>
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-bg-base px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <div className="border-b border-border-default">
        <AnalysisInputPanel
          value={input}
          onChange={onChange}
          onAnalyse={onAnalyse}
          loading={loading}
          idPrefix={idPrefix}
          analyseButtonLabel={`Analyse ${label}`}
        />
      </div>

      <div className="p-4 md:p-5">
        <CompactPropertyResult result={result} />
      </div>
    </section>
  )
}

function CompareStatusCard({ label, result }: { label: string; result: AnalyseResponse | null }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-base p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${result ? "bg-success/10 text-success" : "bg-bg-elevated text-text-muted"}`}>
          {result ? "Analysed" : "Pending"}
        </span>
      </div>
      <div className="mt-4">
        <CompactPropertyResult result={result} />
      </div>
    </div>
  )
}

function aiInsightText(result: AnalyseResponse, t: (k: string) => string) {
  const verdict = t(`verdict.${result.verdict}`)
  const cashflowRounded = result.cash_flow_monthly_yr1.toFixed(0)
  const cf = result.cash_flow_monthly_yr1 >= 0 ? `+${cashflowRounded}` : cashflowRounded
  return `${verdict} · Score ${result.score.toFixed(1)}/10 · Net yield ${result.net_yield_pct.toFixed(1)}% · Cashflow ${cf}€/mo`
}

function aiInsightCards(result: AnalyseResponse, t: (k: string) => string) {
  const cf = `${result.cash_flow_monthly_yr1 >= 0 ? "+" : ""}${result.cash_flow_monthly_yr1.toFixed(0)}€/mo`
  return [
    { id: "verdict" as const, label: t("analyse.results.verdictTitle"), value: t(`verdict.${result.verdict}`) },
    { id: "score" as const, label: t("analyse.new.aiInsight.scoreLabel"), value: `${result.score.toFixed(1)}/10` },
    { id: "netYield" as const, label: t("analyse.kpi.netYield"), value: `${result.net_yield_pct.toFixed(1)}%` },
    { id: "cashflow" as const, label: t("analyse.kpi.cashFlowYr1"), value: cf },
  ]
}

function negotiationCardTitle(id: NegotiationStrategyItem["id"], t: (k: string) => string): string {
  return t(`analyse.new.negotiation.cardTitle.${id}`)
}

function aiNarrative(result: AnalyseResponse, input: AnalyseRequest, t: (k: string) => string): string[] {
  if (result.ai_analysis && result.ai_analysis.trim().length > 0) {
    return result.ai_analysis
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  }

  return [
    `${t("analyse.results.verdictTitle")}: ${t(`verdict.${result.verdict}`)} (${result.score.toFixed(1)}/10).`,
    `${t("analyse.kpi.netYield")}: ${result.net_yield_pct.toFixed(1)}% · ${t("analyse.kpi.purchaseFactor")}: ${result.kpf.toFixed(1)}× · IRR 10y: ${result.irr_10.toFixed(1)}%.`,
    `${t("analyse.kpi.cashFlowYr1")}: ${result.cash_flow_monthly_yr1.toFixed(0)}€/mo · ${t("analyse.market.address")}: ${result.address_resolved || input.address}.`,
  ]
}

function negotiationBullets(result: AnalyseResponse, t: (k: string) => string): NegotiationStrategyItem[] {
  const rentReferenceText = result.market_rent_m2 && result.market_rent_m2 > 0
    ? t("analyse.new.negotiation.rentReference").replace("{0}", String(result.market_rent_m2))
    : null

  const candidates: Array<NegotiationStrategyItem | null> = [
    result.cash_flow_monthly_yr1 < NEGOTIATION_NEGATIVE_CASHFLOW_THRESHOLD
      ? { id: "cashflow", text: t("analyse.new.negotiation.cashflow") }
      : null,
    rentReferenceText
      ? { id: "rentReference", text: rentReferenceText }
      : null,
    result.score < NEGOTIATION_SCORE_THRESHOLD
      ? { id: "anchor", text: t("analyse.new.negotiation.anchor") }
      : null,
  ]

  const finalAsks = candidates.filter((item): item is NegotiationStrategyItem => item !== null).slice(0, NEGOTIATION_DYNAMIC_POINTS_LIMIT)
  finalAsks.push({ id: "walkAway", text: t("analyse.new.negotiation.walkAway") })
  return finalAsks
}

function AskAiShell({ context, t }: { context: AskAiContextPayload; t: (k: string) => string }) {
  const messages = context.mockMessages

  return (
    <div className="rounded-xl border border-border-default bg-bg-base">
      <div className="max-h-64 space-y-3 overflow-y-auto border-b border-border-default p-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${message.role === "user" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm border border-border-default bg-bg-surface text-text-secondary"}`}>
              {message.text}
            </div>
          </div>
        ))}
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

function SingleAnalysisWorkspace({
  input,
  result,
  loading,
  error,
  resultTab,
  onInputChange,
  onAnalyse,
  onResultTabChange,
}: {
  input: AnalyseRequest
  result: AnalyseResponse | null
  loading: boolean
  error: string | null
  resultTab: ResultTab
  onInputChange: (value: AnalyseRequest) => void
  onAnalyse: () => void
  onResultTabChange: (tab: ResultTab) => void
}) {
  const { t } = useLocale()
  const resultTopRef = useRef<HTMLDivElement | null>(null)

  const aiInsightPayload = useMemo<AIInsightPayload | null>(() => {
    if (!result) return null
    return {
      verdictLabel: t(`verdict.${result.verdict}`),
      score: result.score,
      netYieldPct: result.net_yield_pct,
      cashflowMonthlyYr1: result.cash_flow_monthly_yr1,
      summaryLine: aiInsightText(result, t),
      cards: aiInsightCards(result, t),
    }
  }, [result, t])

  const aiAnalysisNarrative = useMemo(() => {
    if (!result) return [t("analyse.ai.empty")]
    return aiNarrative(result, input, t)
  }, [input, result, t])

  const negotiationPayload = useMemo<NegotiationStrategyPayload | null>(() => {
    if (!result) return null
    return {
      items: negotiationBullets(result, t),
    }
  }, [result, t])

  const askAiContext = useMemo<AskAiContextPayload | null>(() => {
    if (!result) return null

    return {
      mode: "single",
      selectedProperty: "A",
      propertyInputs: {
        A: input,
        B: input,
      },
      propertyResults: {
        A: result,
        B: result,
      },
      promptHints: [],
      mockMessages: [
        { id: "a1", role: "assistant", text: t("analyse.new.askAi.shellIntro") },
        { id: "u1", role: "user", text: t("analyse.new.askAi.inputPlaceholder") },
        { id: "a2", role: "assistant", text: aiInsightText(result, t) },
      ],
    }
  }, [input, result, t])

  useEffect(() => {
    if (!result) return

    const timeoutId = window.setTimeout(() => {
      resultTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 20)

    return () => window.clearTimeout(timeoutId)
  }, [result])

  return (
    <div className="space-y-4">
      <SectionShell
        title="Single Property Analysis"
        description="Focus on one property from underwriting input through verdict, projections, and market context."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(360px,42%)_1fr]">
          <section className="overflow-hidden rounded-2xl border border-border-default bg-bg-base">
            <div className="border-b border-border-default px-4 py-4 md:px-5">
              <p className="text-sm font-semibold text-text-primary">Property input</p>
              <p className="mt-1 text-sm text-text-secondary">Use the full underwriting form for a single-property analysis.</p>
            </div>
            <AnalysisInputPanel
              value={input}
              onChange={onInputChange}
              onAnalyse={onAnalyse}
              loading={loading}
              idPrefix="single-analysis"
            />
          </section>

          <section ref={resultTopRef} className="space-y-4">
            {error ? <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">{error}</div> : null}
            {!result ? (
              <div className="rounded-2xl border border-dashed border-border-default bg-bg-base p-8 text-center text-sm text-text-secondary">
                {t("analyse.empty")}
              </div>
            ) : (
              <div className="space-y-4">
                <SectionShell title={t("analyse.new.analysis.title")} description={t("analyse.new.analysis.description")}>
                  <Tabs value={resultTab} onValueChange={(value) => onResultTabChange(value as ResultTab)}>
                    <div className="mb-4 flex flex-col gap-3 border-b border-border-default pb-2 sm:flex-row sm:items-center sm:justify-between">
                      <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
                        <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("analyse.tab.overview")}</TabsTrigger>
                        <TabsTrigger value="projections" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("analyse.tab.projections")}</TabsTrigger>
                        <TabsTrigger value="market" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("analyse.tab.market")}</TabsTrigger>
                      </TabsList>
                      <SaveToPortfolioButton input={input} result={result} className="self-start" />
                    </div>

                    <TabsContent value="overview" className="mt-0"><ResultOverview input={input} result={result} /></TabsContent>
                    <TabsContent value="projections" className="mt-0 space-y-4">
                      <ExitHorizonsTable
                        irr_10={result.irr_10}
                        irr_15={result.irr_15}
                        irr_20={result.irr_20}
                        equity_multiple_10={result.equity_multiple_10}
                        equity_multiple_15={result.equity_multiple_15}
                        equity_multiple_20={result.equity_multiple_20}
                        holding_years={input.holding_years ?? 10}
                      />
                      <YearByYearTable yearData={result.year_data} />
                    </TabsContent>
                    <TabsContent value="market" className="mt-0">
                      <MarketDataPanel input={input} result={result} />
                    </TabsContent>
                  </Tabs>
                </SectionShell>

                <SectionShell title={t("analyse.new.aiInsight.title")} description={t("analyse.new.aiInsight.description")}>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {aiInsightPayload?.cards.map((card) => (
                      <div key={card.id} className="rounded-xl border border-border-default bg-bg-base p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{card.label}</p>
                        <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{card.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">{aiInsightPayload?.summaryLine ?? ""}</p>
                </SectionShell>

                <SectionShell title={t("analyse.new.aiAnalysis.title")} description={t("analyse.new.aiAnalysis.description")}>
                  <div className="space-y-2 text-sm leading-relaxed text-text-secondary">
                    {aiAnalysisNarrative.map((line, idx) => (
                      <p key={`single-${idx}`}>{line}</p>
                    ))}
                  </div>
                </SectionShell>

                <SectionShell title={t("analyse.new.negotiation.title")} description={t("analyse.new.negotiation.description")}>
                  <div className="grid gap-2 md:grid-cols-2">
                    {negotiationPayload?.items.map((item) => (
                      <article key={item.id} className="rounded-lg border border-border-default bg-bg-base px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{negotiationCardTitle(item.id, t)}</p>
                        <p className="mt-1 text-sm text-text-secondary">{item.text}</p>
                      </article>
                    ))}
                  </div>
                </SectionShell>

                <SectionShell title={t("analyse.new.askAi.title")} description={t("analyse.new.askAi.description")}>
                  {askAiContext ? <AskAiShell context={askAiContext} t={t} /> : null}
                </SectionShell>
              </div>
            )}
          </section>
        </div>
      </SectionShell>
    </div>
  )
}

function CompareAnalysisWorkspace({
  inputs,
  results,
  loading,
  error,
  onInputChange,
  onAnalyseProperty,
  onAnalyseBoth,
  onResetProperty,
}: {
  inputs: CompareInputsState
  results: CompareResultsState
  loading: CompareLoadingState
  error: string | null
  onInputChange: (property: ComparePropertyKey, value: AnalyseRequest) => void
  onAnalyseProperty: (property: ComparePropertyKey) => void
  onAnalyseBoth: () => void
  onResetProperty: (property: ComparePropertyKey) => void
}) {
  const compareReady = Boolean(results.propertyA && results.propertyB)

  return (
    <div className="space-y-4">
      <SectionShell
        title="Property Comparison"
        description="Set up two properties independently, run the same analysis engine for each, and compare once both results are available."
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-bg-base p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Compare two complete property analyses</p>
              <p className="mt-1 text-sm text-text-secondary">
                Each property uses the full underwriting form, so neither side depends on being a secondary add-on.
              </p>
            </div>
            <button
              type="button"
              onClick={onAnalyseBoth}
              disabled={loading.propertyA || loading.propertyB}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {loading.propertyA || loading.propertyB ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading.propertyA || loading.propertyB ? "Analysing…" : "Analyse both properties"}
            </button>
          </div>

          {error ? <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">{error}</div> : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <ComparePropertyCard
              label="Property A"
              description="Primary comparison candidate with the full underwriting input set."
              input={inputs.propertyA}
              result={results.propertyA}
              loading={loading.propertyA}
              idPrefix="compare-property-a"
              onChange={(value) => onInputChange("propertyA", value)}
              onAnalyse={() => onAnalyseProperty("propertyA")}
              onReset={() => onResetProperty("propertyA")}
            />
            <ComparePropertyCard
              label="Property B"
              description="Second comparison candidate with the same input depth and analysis flow."
              input={inputs.propertyB}
              result={results.propertyB}
              loading={loading.propertyB}
              idPrefix="compare-property-b"
              onChange={(value) => onInputChange("propertyB", value)}
              onAnalyse={() => onAnalyseProperty("propertyB")}
              onReset={() => onResetProperty("propertyB")}
            />
          </div>
        </div>
      </SectionShell>

      <SectionShell
        title="Comparison Results"
        description="Comparison appears after both independent analysis results are ready."
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <CompareStatusCard label="Property A status" result={results.propertyA} />
            <CompareStatusCard label="Property B status" result={results.propertyB} />
          </div>

          {compareReady ? (
            <div className="space-y-4">
              <CompactCompareSummary resultA={results.propertyA as AnalyseResponse} resultB={results.propertyB as AnalyseResponse} />
              <CompareTable
                resultA={results.propertyA as AnalyseResponse}
                resultB={results.propertyB as AnalyseResponse}
                labelA="Property A"
                labelB="Property B"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border-default bg-bg-base p-6 text-sm text-text-secondary">
              Run analyses for both properties to unlock the comparison summary and KPI table.
            </div>
          )}
        </div>
      </SectionShell>
    </div>
  )
}

export default function AnalysePage() {
  const { t } = useLocale()
  const {
    inputA: storeInputA,
    setInputA: setStoreInputA,
    resultA: storeResultA,
    setResultA: setStoreResultA,
    inputB: storeInputB,
    setInputB: setStoreInputB,
    resultB: storeResultB,
    setResultB: setStoreResultB,
  } = useAnalysisStore()

  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("single")
  const [singleDraftInput, setSingleDraftInput] = useState<AnalyseRequest>(PRESET_A)
  const [singleAnalysisResult, setSingleAnalysisResult] = useState<AnalyseResponse | null>(null)
  const [singleResultTab, setSingleResultTab] = useState<ResultTab>("overview")
  const [singleLoading, setSingleLoading] = useState(false)
  const [singleError, setSingleError] = useState<string | null>(null)
  const [compareDraftInputs, setCompareDraftInputs] = useState<CompareInputsState>({
    propertyA: storeInputA,
    propertyB: storeInputB,
  })
  const [compareAnalysisResults, setCompareAnalysisResults] = useState<CompareResultsState>({
    propertyA: storeResultA,
    propertyB: storeResultB,
  })
  const [compareLoading, setCompareLoading] = useState<CompareLoadingState>({
    propertyA: false,
    propertyB: false,
  })
  const [compareError, setCompareError] = useState<string | null>(null)

  const analyseOne = useCallback(async (input: AnalyseRequest) => {
    const { data } = await analyseProperty(input)
    return data ?? runLocalCompute(input)
  }, [])

  const handleSingleAnalyse = useCallback(async () => {
    setSingleLoading(true)
    setSingleError(null)

    try {
      const result = await analyseOne(singleDraftInput)
      setSingleAnalysisResult(result)
    } catch {
      setSingleError(t("analyse.error"))
    } finally {
      setSingleLoading(false)
    }
  }, [analyseOne, singleDraftInput, t])

  const updateCompareInput = useCallback((property: ComparePropertyKey, value: AnalyseRequest) => {
    setCompareDraftInputs((current) => ({
      ...current,
      [property]: value,
    }))
    setCompareAnalysisResults((current) => ({
      ...current,
      [property]: null,
    }))
  }, [])

  const handleCompareAnalyse = useCallback(async (property: ComparePropertyKey) => {
    setCompareLoading((current) => ({ ...current, [property]: true }))
    setCompareError(null)

    try {
      const result = await analyseOne(compareDraftInputs[property])
      setCompareAnalysisResults((current) => ({
        ...current,
        [property]: result,
      }))
    } catch {
      setCompareError(t("analyse.error"))
    } finally {
      setCompareLoading((current) => ({ ...current, [property]: false }))
    }
  }, [analyseOne, compareDraftInputs, t])

  const handleAnalyseBoth = useCallback(async () => {
    setCompareLoading({ propertyA: true, propertyB: true })
    setCompareError(null)

    try {
      const [propertyAResult, propertyBResult] = await Promise.all([
        analyseOne(compareDraftInputs.propertyA),
        analyseOne(compareDraftInputs.propertyB),
      ])

      setCompareAnalysisResults({
        propertyA: propertyAResult,
        propertyB: propertyBResult,
      })
    } catch {
      setCompareError(t("analyse.error"))
    } finally {
      setCompareLoading({ propertyA: false, propertyB: false })
    }
  }, [analyseOne, compareDraftInputs, t])

  const handleResetCompareProperty = useCallback((property: ComparePropertyKey) => {
    const preset = property === "propertyA" ? PRESET_A : PRESET_B

    setCompareDraftInputs((current) => ({
      ...current,
      [property]: preset,
    }))
    setCompareAnalysisResults((current) => ({
      ...current,
      [property]: null,
    }))
  }, [])

  useEffect(() => {
    setStoreInputA(compareDraftInputs.propertyA)
    setStoreInputB(compareDraftInputs.propertyB)
    setStoreResultA(compareAnalysisResults.propertyA)
    setStoreResultB(compareAnalysisResults.propertyB)
  }, [
    compareAnalysisResults.propertyA,
    compareAnalysisResults.propertyB,
    compareDraftInputs.propertyA,
    compareDraftInputs.propertyB,
    setStoreInputA,
    setStoreInputB,
    setStoreResultA,
    setStoreResultB,
  ])

  return (
    <div className="h-full overflow-y-auto bg-bg-base p-4 md:p-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        <header className="space-y-2">
          <h1 className="font-serif text-2xl font-semibold text-text-primary">{t("analyse.title")}</h1>
          <p className="text-sm text-text-secondary">
            Choose a focused single-property underwriting flow or a dedicated two-property comparison workflow.
          </p>
        </header>

        <ModeSwitcher mode={analysisMode} onChange={setAnalysisMode} />

        {analysisMode === "single" ? (
          <SingleAnalysisWorkspace
            input={singleDraftInput}
            result={singleAnalysisResult}
            loading={singleLoading}
            error={singleError}
            resultTab={singleResultTab}
            onInputChange={setSingleDraftInput}
            onAnalyse={handleSingleAnalyse}
            onResultTabChange={setSingleResultTab}
          />
        ) : (
          <CompareAnalysisWorkspace
            inputs={compareDraftInputs}
            results={compareAnalysisResults}
            loading={compareLoading}
            error={compareError}
            onInputChange={updateCompareInput}
            onAnalyseProperty={handleCompareAnalyse}
            onAnalyseBoth={handleAnalyseBoth}
            onResetProperty={handleResetCompareProperty}
          />
        )}
      </div>
    </div>
  )
}
