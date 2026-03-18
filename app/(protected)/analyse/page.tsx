"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, ExternalLink, Loader2, RotateCcw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { AnalysisInputPanel } from "@/features/analysis/AnalysisInputPanel"
import { KpiGrid } from "@/features/analysis/KpiGrid"
import { PRESET_B } from "@/features/analysis/presets"
import { buildComparisonSummary } from "@/features/compare/CompareTable"
import { CashflowChart, type YearData } from "@/components/analysis/CashflowChart"
import { ExitHorizonsTable } from "@/components/analysis/ExitHorizonsTable"
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
        Analyse Property B to see a compact result summary here.
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

function CompactPropertyBPanel({
  input,
  result,
  onChange,
  onAnalyse,
  onReset,
  loading,
}: {
  input: AnalyseRequest
  result: AnalyseResponse | null
  onChange: (value: AnalyseRequest) => void
  onAnalyse: () => void
  onReset: () => void
  loading: boolean
}) {
  const setField = useCallback(
    <K extends keyof AnalyseRequest>(field: K, value: AnalyseRequest[K]) => {
      onChange({ ...input, [field]: value })
    },
    [input, onChange],
  )

  const numericField = (
    id: string,
    label: string,
    value: number,
    onValue: (next: number) => void,
    unit?: string,
    validation?: {
      min?: number
      max?: number
      step?: number
    },
  ) => (
    <label htmlFor={id} className="space-y-1.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={validation?.min}
          max={validation?.max}
          step={validation?.step ?? "any"}
          value={value}
          onChange={(event) => {
            if (event.target.value === "") return

            const nextValue = Number(event.target.value)
            if (!Number.isFinite(nextValue)) return

            onValue(nextValue)
          }}
          className="font-mono"
        />
        {unit ? <span className="text-xs text-text-muted">{unit}</span> : null}
      </div>
    </label>
  )

  return (
    <div className="space-y-4 rounded-xl border border-border-default bg-bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">Property B</p>
          <p className="text-xs text-text-muted">Compact beta input for a quick side-by-side check.</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-secondary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset B
        </button>
      </div>

      <label htmlFor="compare-address-b" className="block space-y-1.5">
        <span className="text-xs font-medium text-text-secondary">Address</span>
        <Input
          id="compare-address-b"
          value={input.address}
          onChange={(event) => setField("address", event.target.value)}
          placeholder="Property B address"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {numericField("compare-sqm-b", "Area", input.sqm, (next) => setField("sqm", next), "m²", { min: 1, step: 1 })}
        {numericField("compare-year-built-b", "Year built", input.year_built, (next) => setField("year_built", Math.round(next)), undefined, { min: 1800, max: 2030, step: 1 })}
        {numericField("compare-price-b", "Purchase price", input.purchase_price, (next) => setField("purchase_price", next), "€", { min: 0, step: 1 })}
        {numericField("compare-equity-b", "Equity", input.equity, (next) => setField("equity", next), "€", { min: 0, step: 1 })}
        {numericField("compare-rent-b", "Rent / month", input.rent_monthly, (next) => setField("rent_monthly", next), "€", { min: 0, step: 1 })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-muted">Other financing and tax assumptions keep Property B defaults for now.</p>
        <button
          type="button"
          onClick={onAnalyse}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Analysing…" : "Analyse B"}
        </button>
      </div>

      <CompactPropertyResult result={result} />
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

export default function AnalysePage() {
  const { t } = useLocale()
  const router = useRouter()
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

  const [inputA, setInputA] = useState<AnalyseRequest>(() => storeInputA)
  const [resultA, setResultA] = useState<AnalyseResponse | null>(() => storeResultA)
  const [inputB, setInputB] = useState<AnalyseRequest>(() => storeInputB)
  const [resultB, setResultB] = useState<AnalyseResponse | null>(() => storeResultB)
  const [resultTab, setResultTab] = useState<"overview" | "projections" | "market">("overview")
  const [compareOpen, setCompareOpen] = useState(false)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askAiContext, setAskAiContext] = useState<AskAiContextPayload | null>(null)
  const resultTopRef = useRef<HTMLDivElement | null>(null)

  const aiInsightPayload = useMemo<AIInsightPayload | null>(() => {
    if (!resultA) return null
    return {
      verdictLabel: t(`verdict.${resultA.verdict}`),
      score: resultA.score,
      netYieldPct: resultA.net_yield_pct,
      cashflowMonthlyYr1: resultA.cash_flow_monthly_yr1,
      summaryLine: aiInsightText(resultA, t),
      cards: aiInsightCards(resultA, t),
    }
  }, [resultA, t])

  const aiAnalysisNarrative = useMemo(() => {
    if (!resultA) return [t("analyse.ai.empty")]
    return aiNarrative(resultA, inputA, t)
  }, [inputA, resultA, t])

  const negotiationPayload = useMemo<NegotiationStrategyPayload | null>(() => {
    if (!resultA) return null
    return {
      items: negotiationBullets(resultA, t),
    }
  }, [resultA, t])

  useEffect(() => {
    if (!resultA) {
      setAskAiContext(null)
      return
    }

    setAskAiContext({
      mode: "single",
      selectedProperty: "A",
      propertyInputs: {
        A: inputA,
        B: inputB,
      },
      propertyResults: {
        A: resultA,
        B: resultB,
      },
      promptHints: [],
      mockMessages: [
        { id: "a1", role: "assistant", text: t("analyse.new.askAi.shellIntro") },
        { id: "u1", role: "user", text: t("analyse.new.askAi.inputPlaceholder") },
        { id: "a2", role: "assistant", text: aiInsightText(resultA, t) },
      ],
    })
  }, [inputA, inputB, resultA, resultB, t])

  const analyseOne = useCallback(async (input: AnalyseRequest, setResult: (r: AnalyseResponse) => void) => {
    const { data } = await analyseProperty(input)
    if (data) {
      setResult(data)
      return
    }
    setResult(runLocalCompute(input))
  }, [])

  const handleAnalyseA = useCallback(async () => {
    setLoadingA(true)
    setError(null)
    try {
      await analyseOne(inputA, setResultA)
      setTimeout(() => resultTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 20)
    } catch {
      setError(t("analyse.error"))
    } finally {
      setLoadingA(false)
    }
  }, [analyseOne, inputA, t])

  const handleAnalyseB = useCallback(async () => {
    setLoadingB(true)
    setError(null)
    try {
      await analyseOne(inputB, setResultB)
    } catch {
      setError(t("analyse.error"))
    } finally {
      setLoadingB(false)
    }
  }, [analyseOne, inputB, t])

  const handleResetB = useCallback(() => {
    setStoreInputB(PRESET_B)
    setStoreResultB(null)
    setInputB(PRESET_B)
    setResultB(null)
  }, [setStoreInputB, setStoreResultB, setInputB, setResultB])

  const handleOpenFullComparison = useCallback(() => {
    if (!resultA || !resultB) return

    setStoreInputA(inputA)
    setStoreResultA(resultA)
    setStoreInputB(inputB)
    setStoreResultB(resultB)
    router.push("/analyse/compare")
  }, [inputA, inputB, resultA, resultB, router, setStoreInputA, setStoreInputB, setStoreResultA, setStoreResultB])

  return (
    <div className="h-full overflow-y-auto bg-bg-base p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text-primary">{t("analyse.title")}</h1>
          <p className="text-sm text-text-secondary">{t("analyse.subtitle")}</p>
        </div>
        <button onClick={handleAnalyseA} disabled={loadingA} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
          {loadingA ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loadingA ? t("analyse.action.analysing") : t("analyse.action.analyse")}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(360px,42%)_1fr]">
        <section className="rounded-2xl border border-border-default bg-bg-surface">
          <AnalysisInputPanel value={inputA} onChange={setInputA} showAnalyseButton={false} />
        </section>

        <section ref={resultTopRef} className="space-y-4">
          {error && <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">{error}</div>}
          {!resultA ? (
            <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface p-8 text-center text-sm text-text-secondary">
              {t("analyse.empty")}
            </div>
          ) : (
            <div className="space-y-4">
              <SectionShell title={t("analyse.new.analysis.title")} description={t("analyse.new.analysis.description")}>
                <Tabs value={resultTab} onValueChange={(v) => setResultTab(v as typeof resultTab)}>
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-default pb-2">
                    <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
                      <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("analyse.tab.overview")}</TabsTrigger>
                      <TabsTrigger value="projections" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("analyse.tab.projections")}</TabsTrigger>
                      <TabsTrigger value="market" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("analyse.tab.market")}</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="overview" className="mt-0"><ResultOverview input={inputA} result={resultA} /></TabsContent>
                  <TabsContent value="projections" className="mt-0 space-y-4">
                    <ExitHorizonsTable
                      irr_10={resultA.irr_10}
                      irr_15={resultA.irr_15}
                      irr_20={resultA.irr_20}
                      equity_multiple_10={resultA.equity_multiple_10}
                      equity_multiple_15={resultA.equity_multiple_15}
                      equity_multiple_20={resultA.equity_multiple_20}
                      holding_years={inputA.holding_years ?? 10}
                    />
                    <YearByYearTable yearData={resultA.year_data} />
                  </TabsContent>
                  <TabsContent value="market" className="mt-0">
                    <MarketDataPanel input={inputA} result={resultA} />
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

      <div className="mt-6">
        <Collapsible open={compareOpen} onOpenChange={setCompareOpen}>
          <div className="rounded-2xl border border-border-default bg-bg-surface">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left md:px-5">
              <div>
                <p className="text-sm font-semibold text-text-primary">Compare with Property B</p>
                <p className="mt-1 text-xs text-text-muted">
                  Keep Property A on this page, then optionally run a compact second-property check.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <span>{compareOpen ? "Hide" : "Show"}</span>
                {compareOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="border-t border-border-default px-4 py-4 md:px-5">
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_1fr]">
                  <CompactPropertyBPanel
                    input={inputB}
                    result={resultB}
                    onChange={(next) => {
                      setInputB(next)
                      setResultB(null)
                    }}
                    onAnalyse={handleAnalyseB}
                    onReset={handleResetB}
                    loading={loadingB}
                  />

                  <div className="space-y-4">
                    <div className="rounded-xl border border-border-default bg-bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">Property A status</p>
                          <p className="mt-1 text-xs text-text-muted">Property A stays page-local here and is never replaced by Property B edits.</p>
                        </div>
                      </div>
                      {resultA ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <MetricMiniCard label="Score" value={`${resultA.score.toFixed(1)}/10`} />
                          <MetricMiniCard label="Net Yield" value={formatPct(resultA.net_yield_pct)} />
                          <MetricMiniCard label="Cash Flow / Mo Yr 1" value={formatEUR(resultA.cash_flow_monthly_yr1)} />
                          <MetricMiniCard label="KPF" value={formatX(resultA.kpf)} />
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-border-default bg-bg-base p-4 text-sm text-text-muted">
                          Run Property A analysis first to unlock the comparison snapshot.
                        </div>
                      )}
                    </div>

                    {resultA && resultB ? (
                      <>
                        <CompactCompareSummary resultA={resultA} resultB={resultB} />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleOpenFullComparison}
                            className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-base px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
                          >
                            Open full comparison
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border-default bg-bg-base p-4 text-sm text-text-muted">
                        Run Property B after Property A to see a lightweight A vs B summary.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  )
}
