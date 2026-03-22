"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, Loader2, RotateCcw } from "lucide-react"
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
import { SkillCardPlaceholder } from "@/components/analysis/SkillCardPlaceholder"
import { FlagsSection } from "@/features/analysis/FlagsSection"
import { analyseProperty } from "@/lib/analyseApi"
import { buildAnalysisChatContextId, buildAnalysisContextPayload, buildPropertyMetricsInput, getAiAnalysisLines } from "@/lib/analysisAi"
import { formatEUR, formatPct, formatX } from "@/lib/format"
import { getEntryById } from "@/lib/manualPortfolio"
import { runLocalCompute } from "@/lib/localComputeBridge"
import { useAnalysisStore } from "@/store/analysisStore"
import { AnalysisChat } from "@/components/chat/AnalysisChat"
import { useLocale } from "@/lib/i18n/locale-context"
import { runBuyingStrategy, runInvestmentReview, runPropertySnapshot } from "@/lib/skillsApi"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"
import type { SnapshotResult, ReviewResult, StrategyResult } from "@/types/skills"
import type {
  AIInsightPayload,
  AskAiContextPayload,
  NegotiationStrategyItem,
  NegotiationStrategyPayload,
  PropertySlot,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeWithPreset(preset: AnalyseRequest, candidate: unknown): AnalyseRequest {
  if (!isRecord(candidate)) return preset

  const nextValue = { ...preset }

  for (const key of Object.keys(preset) as Array<keyof AnalyseRequest>) {
    const presetValue = preset[key]
    const savedValue = candidate[String(key)]

    if (presetValue == null || savedValue == null) continue

    const presetValueType = typeof presetValue
    if (!["string", "number", "boolean"].includes(presetValueType)) continue
    if (presetValueType !== typeof savedValue) continue
    if (presetValueType === "number" && !Number.isFinite(savedValue)) continue

    Object.assign(nextValue, { [key]: savedValue })
  }

  return nextValue
}

function hydrateAnalyseInput(candidate: unknown): AnalyseRequest {
  return mergeWithPreset(PRESET_A, candidate)
}

function isHydratableAnalyseResult(value: unknown): value is AnalyseResponse {
  if (!isRecord(value)) return false

  // This is a deliberately minimal hydration check. We only restore a saved
  // result when the fields required by the existing compare/single result UI are
  // present, and otherwise fall back to `null` so the user can rerun analysis.
  // If new UI surfaces start depending on more AnalyseResponse fields during
  // reopen, expand this guard at the same time.
  return (
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    typeof value.net_yield_pct === "number" &&
    Number.isFinite(value.net_yield_pct) &&
    typeof value.kpf === "number" &&
    Number.isFinite(value.kpf) &&
    typeof value.cash_flow_monthly_yr1 === "number" &&
    Number.isFinite(value.cash_flow_monthly_yr1) &&
    typeof value.irr_10 === "number" &&
    Number.isFinite(value.irr_10) &&
    Array.isArray(value.year_data)
  )
}

interface AnalysePageState {
  analysisMode: AnalysisMode
  singleDraftInput: AnalyseRequest
  singleAnalysisResult: AnalyseResponse | null
  singleResultTab: ResultTab
  singleLoading: boolean
  singleError: string | null
  compareDraftInputs: CompareInputsState
  compareAnalysisResults: CompareResultsState
  compareLoading: CompareLoadingState
  compareError: string | null
  // ── Skill results ─────────────────────────────────────────────────────────
  snapshotResult: SnapshotResult | null
  reviewResult: ReviewResult | null
  strategyResult: StrategyResult | null
  // ── Skill loading states ──────────────────────────────────────────────────
  snapshotLoading: boolean
  reviewLoading: boolean
  strategyLoading: boolean
  // ── Skill error states ────────────────────────────────────────────────────
  snapshotError: string | null
  reviewError: string | null
  strategyError: string | null
  // ── Advisor mode ──────────────────────────────────────────────────────────
  advisorMode: "light" | "full"
}

type AnalysePageAction =
  | { type: "setAnalysisMode"; mode: AnalysisMode }
  | { type: "setSingleDraftInput"; input: AnalyseRequest }
  | { type: "setSingleResultTab"; tab: ResultTab }
  | { type: "singleAnalyseStart" }
  | { type: "singleAnalyseSuccess"; result: AnalyseResponse }
  | { type: "singleAnalyseError"; error: string }
  | { type: "hydrateManualEntry"; input: AnalyseRequest; result: AnalyseResponse | null }
  | { type: "setCompareDraftInput"; property: ComparePropertyKey; input: AnalyseRequest }
  | { type: "compareAnalyseStart"; property: ComparePropertyKey }
  | { type: "compareAnalyseSuccess"; property: ComparePropertyKey; result: AnalyseResponse }
  | { type: "compareAnalyseError"; property: ComparePropertyKey; error: string }
  | { type: "compareAnalyseBothStart" }
  | { type: "compareAnalyseBothSuccess"; results: CompareResultsState }
  | { type: "compareAnalyseBothError"; error: string }
  | { type: "resetCompareProperty"; property: ComparePropertyKey }
  // ── Skill actions ─────────────────────────────────────────────────────────
  | { type: "snapshotStart" }
  | { type: "snapshotSuccess"; result: SnapshotResult }
  | { type: "snapshotError"; error: string }
  | { type: "snapshotReset" }
  | { type: "reviewStart" }
  | { type: "reviewSuccess"; result: ReviewResult }
  | { type: "reviewError"; error: string }
  | { type: "reviewReset" }
  | { type: "strategyStart" }
  | { type: "strategySuccess"; result: StrategyResult }
  | { type: "strategyError"; error: string }
  | { type: "strategyReset" }
  | { type: "setAdvisorMode"; mode: "light" | "full" }

function createInitialAnalysePageState({
  storeInputA,
  storeResultA,
  storeInputB,
  storeResultB,
}: {
  storeInputA: AnalyseRequest
  storeResultA: AnalyseResponse | null
  storeInputB: AnalyseRequest
  storeResultB: AnalyseResponse | null
}): AnalysePageState {
  return {
    analysisMode: "single",
    singleDraftInput: storeInputA,
    singleAnalysisResult: storeResultA,
    singleResultTab: "overview",
    singleLoading: false,
    singleError: null,
    compareDraftInputs: {
      propertyA: storeInputA,
      propertyB: storeInputB,
    },
    compareAnalysisResults: {
      propertyA: storeResultA,
      propertyB: storeResultB,
    },
    compareLoading: {
      propertyA: false,
      propertyB: false,
    },
    compareError: null,
    // Skill state defaults
    snapshotResult: null,
    reviewResult: null,
    strategyResult: null,
    snapshotLoading: false,
    reviewLoading: false,
    strategyLoading: false,
    snapshotError: null,
    reviewError: null,
    strategyError: null,
    advisorMode: "light",
  }
}

function analysePageReducer(state: AnalysePageState, action: AnalysePageAction): AnalysePageState {
  switch (action.type) {
    case "setAnalysisMode":
      return {
        ...state,
        analysisMode: action.mode,
      }
    case "setSingleDraftInput":
      return {
        ...state,
        singleDraftInput: action.input,
        snapshotResult: null,
        snapshotError: null,
        reviewResult: null,
        reviewError: null,
        strategyResult: null,
        strategyError: null,
      }
    case "setSingleResultTab":
      return {
        ...state,
        singleResultTab: action.tab,
      }
    case "singleAnalyseStart":
      return {
        ...state,
        singleLoading: true,
        singleError: null,
        // Clear all skill results when a new base analysis starts
        snapshotResult: null,
        snapshotError: null,
        reviewResult: null,
        reviewError: null,
        strategyResult: null,
        strategyError: null,
      }
    case "singleAnalyseSuccess":
      return {
        ...state,
        singleLoading: false,
        singleAnalysisResult: action.result,
      }
    case "singleAnalyseError":
      return {
        ...state,
        singleLoading: false,
        singleError: action.error,
      }
    case "hydrateManualEntry":
      return {
        ...state,
        analysisMode: "single",
        singleDraftInput: action.input,
        singleAnalysisResult: action.result,
        singleResultTab: "overview",
        singleError: null,
        snapshotResult: null,
        snapshotError: null,
        reviewResult: null,
        reviewError: null,
        strategyResult: null,
        strategyError: null,
        compareDraftInputs: {
          ...state.compareDraftInputs,
          propertyA: action.input,
        },
        compareAnalysisResults: {
          ...state.compareAnalysisResults,
          propertyA: action.result,
        },
      }
    case "setCompareDraftInput":
      return {
        ...state,
        compareDraftInputs: {
          ...state.compareDraftInputs,
          [action.property]: action.input,
        },
        compareAnalysisResults: {
          ...state.compareAnalysisResults,
          [action.property]: null,
        },
      }
    case "compareAnalyseStart":
      return {
        ...state,
        compareLoading: {
          ...state.compareLoading,
          [action.property]: true,
        },
        compareError: null,
      }
    case "compareAnalyseSuccess":
      return {
        ...state,
        compareLoading: {
          ...state.compareLoading,
          [action.property]: false,
        },
        compareAnalysisResults: {
          ...state.compareAnalysisResults,
          [action.property]: action.result,
        },
      }
    case "compareAnalyseError":
      return {
        ...state,
        compareLoading: {
          ...state.compareLoading,
          [action.property]: false,
        },
        compareError: action.error,
      }
    case "compareAnalyseBothStart":
      return {
        ...state,
        compareLoading: {
          propertyA: true,
          propertyB: true,
        },
        compareError: null,
      }
    case "compareAnalyseBothSuccess":
      return {
        ...state,
        compareLoading: {
          propertyA: false,
          propertyB: false,
        },
        compareAnalysisResults: action.results,
      }
    case "compareAnalyseBothError":
      return {
        ...state,
        compareLoading: {
          propertyA: false,
          propertyB: false,
        },
        compareError: action.error,
      }
    case "resetCompareProperty": {
      const preset = action.property === "propertyA" ? PRESET_A : PRESET_B

      return {
        ...state,
        compareDraftInputs: {
          ...state.compareDraftInputs,
          [action.property]: preset,
        },
        compareAnalysisResults: {
          ...state.compareAnalysisResults,
          [action.property]: null,
        },
      }
    }
    // ── Snapshot ────────────────────────────────────────────────────────────
    case "snapshotStart":
      return { ...state, snapshotLoading: true, snapshotError: null }
    case "snapshotSuccess":
      return { ...state, snapshotLoading: false, snapshotResult: action.result }
    case "snapshotError":
      return { ...state, snapshotLoading: false, snapshotError: action.error }
    case "snapshotReset":
      return { ...state, snapshotResult: null, snapshotError: null }
    // ── Investment Review ────────────────────────────────────────────────────
    case "reviewStart":
      return {
        ...state,
        reviewLoading: true,
        reviewError: null,
        strategyResult: null,
        strategyError: null,
      }
    case "reviewSuccess":
      return { ...state, reviewLoading: false, reviewResult: action.result }
    case "reviewError":
      return { ...state, reviewLoading: false, reviewError: action.error }
    case "reviewReset":
      return { ...state, reviewResult: null, reviewError: null }
    // ── Buying Strategy ──────────────────────────────────────────────────────
    case "strategyStart":
      return { ...state, strategyLoading: true, strategyError: null }
    case "strategySuccess":
      return { ...state, strategyLoading: false, strategyResult: action.result }
    case "strategyError":
      return { ...state, strategyLoading: false, strategyError: action.error }
    case "strategyReset":
      return { ...state, strategyResult: null, strategyError: null }
    // ── Advisor mode ─────────────────────────────────────────────────────────
    case "setAdvisorMode":
      return { ...state, advisorMode: action.mode }
    default:
      return state
  }
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

function SnapshotBulletList({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: "success" | "danger"
}) {
  const accentClass = tone === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"

  return (
    <div className="rounded-xl border border-border-default bg-bg-base p-4">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${accentClass}`}>
          {title}
        </span>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-text-secondary">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SnapshotEmptyState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-border-default bg-bg-base p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      <p className="mt-2 text-sm text-text-secondary">{message}</p>
    </div>
  )
}

function SnapshotResultPanel({
  result,
  onRefresh,
}: {
  result: SnapshotResult
  onRefresh: () => void
}) {
  const summary = result.summary ?? result.one_line_summary
  const strengths = result.strengths
  const risks = result.risks
  const metrics = [
    { label: "Verdict", value: result.verdict || "—" },
    { label: "Location Rating", value: result.location_rating || "—" },
    ...(result.grade ? [{ label: "Grade", value: result.grade }] : []),
  ]

  return (
    <SectionShell
      title="Intelligent Property Snapshot"
      description="Compact AI readout generated from the current property metrics and analysis data."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-success">
            Snapshot ready
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh Snapshot
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
          <div className="rounded-2xl border border-brand/15 bg-gradient-to-br from-brand/10 via-bg-base to-bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Summary</p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {summary?.trim() || "Snapshot generated, but no summary text was returned."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
            {metrics.map((metric) => (
              <MetricMiniCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {strengths.length > 0 ? (
            <SnapshotBulletList title="Strengths" items={strengths} tone="success" />
          ) : (
            <SnapshotEmptyState title="Strengths" message="No strengths were returned for this snapshot." />
          )}
          {risks.length > 0 ? (
            <SnapshotBulletList title="Risks" items={risks} tone="danger" />
          ) : (
            <SnapshotEmptyState title="Risks" message="No risks were returned for this snapshot." />
          )}
        </div>
      </div>
    </SectionShell>
  )
}

function SnapshotStatusPanel({
  loading,
  error,
  onRetry,
}: {
  loading?: boolean
  error?: string | null
  onRetry: () => void
}) {
  if (loading) {
    return (
      <SectionShell title="Intelligent Property Snapshot" description="Compact AI readout generated from the current property metrics and analysis data.">
        <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-base px-4 py-4 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          Generating property snapshot…
        </div>
      </SectionShell>
    )
  }

  return (
    <SectionShell title="Intelligent Property Snapshot" description="Compact AI readout generated from the current property metrics and analysis data.">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-4 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Snapshot could not be generated.</p>
            <p className="mt-1 text-danger/90">{error}</p>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      </div>
    </SectionShell>
  )
}

function ReviewNarrativeBlock({
  title,
  body,
}: {
  title: string
  body?: string | null
}) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-base p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{body?.trim() || "No narrative was returned for this section."}</p>
    </div>
  )
}

function ReviewResultPanel({
  result,
  onRefresh,
}: {
  result: ReviewResult
  onRefresh: () => void
}) {
  const sections: Array<{ title: string; items: string[]; tone: "success" | "danger"; emptyMessage: string }> = [
    { title: "Strengths", items: result.strengths, tone: "success", emptyMessage: "No strengths were returned for this investment review." },
    { title: "Risks", items: result.risks, tone: "danger", emptyMessage: "No risks were returned for this investment review." },
    { title: "Missing Inputs", items: result.missing_inputs, tone: "danger", emptyMessage: "No additional missing inputs were flagged for this review." },
    { title: "Sensitivity Points", items: result.sensitivity_points, tone: "success", emptyMessage: "No scenario sensitivities were returned for this review." },
  ]

  return (
    <SectionShell
      title="Investment Review"
      description="Full structured AI analysis generated from the current property metrics and underwriting output."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
            Review ready
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh Review
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReviewNarrativeBlock title="Property Summary" body={result.property_summary} />
          <ReviewNarrativeBlock title="Location Analysis" body={result.location_analysis} />
          <ReviewNarrativeBlock title="Deal Economics" body={result.deal_economics} />
          <ReviewNarrativeBlock title="Final Verdict" body={result.final_verdict} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {sections.map((section) =>
            section.items.length > 0 ? (
              <SnapshotBulletList key={section.title} title={section.title} items={section.items} tone={section.tone} />
            ) : (
              <SnapshotEmptyState
                key={section.title}
                title={section.title}
                message={section.emptyMessage}
              />
            ),
          )}
        </div>
      </div>
    </SectionShell>
  )
}

function ReviewStatusPanel({
  loading,
  error,
  onRetry,
}: {
  loading?: boolean
  error?: string | null
  onRetry: () => void
}) {
  if (loading) {
    return (
      <SectionShell title="Investment Review" description="Full structured AI analysis generated from the current property metrics and underwriting output.">
        <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-base px-4 py-4 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          Generating investment review…
        </div>
      </SectionShell>
    )
  }

  return (
    <SectionShell title="Investment Review" description="Full structured AI analysis generated from the current property metrics and underwriting output.">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-4 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Investment review could not be generated.</p>
            <p className="mt-1 text-danger/90">{error}</p>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      </div>
    </SectionShell>
  )
}

function StrategyResultPanel({
  result,
  onRefresh,
}: {
  result: StrategyResult
  onRefresh: () => void
}) {
  const sections: Array<{ title: string; items: string[]; tone: "success" | "danger"; emptyMessage: string }> = [
    {
      title: "Leverage Points",
      items: result.leverage_points,
      tone: "success",
      emptyMessage: "No leverage points were returned for this buying strategy.",
    },
    {
      title: "Seller Questions",
      items: result.seller_questions,
      tone: "success",
      emptyMessage: "No seller questions were returned for this buying strategy.",
    },
    {
      title: "Diligence Priorities",
      items: result.diligence_priorities,
      tone: "success",
      emptyMessage: "No diligence priorities were returned for this buying strategy.",
    },
    {
      title: "Red Flags",
      items: result.red_flags,
      tone: "danger",
      emptyMessage: "No red flags were returned for this buying strategy.",
    },
  ]

  return (
    <SectionShell
      title="Buying Strategy Insight"
      description="How to approach this deal using the current property metrics and the latest full investment review."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
            Strategy ready
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh Strategy
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <MetricMiniCard
            label="Anchor Price"
            value={result.anchor_price != null ? formatEUR(result.anchor_price) : "—"}
          />
          <MetricMiniCard
            label="Walk-Away Price"
            value={result.walk_away_price != null ? formatEUR(result.walk_away_price) : "—"}
          />
        </div>

        <div className="rounded-2xl border border-brand/15 bg-gradient-to-br from-brand/10 via-bg-base to-bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Recommended Next Move</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {result.recommended_next_move?.trim() || "No recommended next move was returned for this buying strategy."}
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {sections.map((section) =>
            section.items.length > 0 ? (
              <SnapshotBulletList key={section.title} title={section.title} items={section.items} tone={section.tone} />
            ) : (
              <SnapshotEmptyState key={section.title} title={section.title} message={section.emptyMessage} />
            ),
          )}
        </div>
      </div>
    </SectionShell>
  )
}

function StrategyStatusPanel({
  loading,
  error,
  onRetry,
}: {
  loading?: boolean
  error?: string | null
  onRetry: () => void
}) {
  if (loading) {
    return (
      <SectionShell title="Buying Strategy Insight" description="How to approach this deal using the current property metrics and the latest full investment review.">
        <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-base px-4 py-4 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          Generating buying strategy…
        </div>
      </SectionShell>
    )
  }

  return (
    <SectionShell title="Buying Strategy Insight" description="How to approach this deal using the current property metrics and the latest full investment review.">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-4 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Buying strategy could not be generated.</p>
            <p className="mt-1 text-danger/90">{error}</p>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      </div>
    </SectionShell>
  )
}

function StrategyPrerequisitePanel({
  canRun,
  onRun,
}: {
  canRun: boolean
  onRun?: () => void
}) {
  return (
    <SectionShell
      title="Buying Strategy Insight"
      description="How to approach this deal using the current property metrics and the latest full investment review."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-text-secondary">
            Generate anchor price, walk-away price, leverage points, seller questions, diligence priorities, red flags and a recommended next move for this deal.
          </p>
          <div className="rounded-xl border border-dashed border-border-default bg-bg-base px-4 py-3 text-sm text-text-secondary">
            {canRun
              ? "Run Buying Strategy Insight when you're ready to turn the latest investment review into a negotiation plan."
              : "Run Investment Review first. Buying Strategy Insight needs the latest full review result before it can generate a negotiation plan."}
          </div>
        </div>
        <button
          type="button"
          onClick={canRun ? onRun : undefined}
          disabled={!canRun}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:border-border-default disabled:bg-bg-base disabled:text-text-muted disabled:opacity-60"
        >
          Generate Strategy
        </button>
      </div>
    </SectionShell>
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
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
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

      <div className="min-h-0 flex-1 border-b border-border-default">
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

function looksLikeBackendErrorNarrative(text: string): boolean {
  const normalized = text.toLowerCase()
  // This matcher depends on current backend error wording. Keep it narrow so we
  // don't hide legitimate analysis text, but update these signatures if backend
  // error payloads change shape in the future.
  return (
    normalized.includes("error code") ||
    normalized.includes("authentication_error") ||
    normalized.includes("invalid x-api-key") ||
    normalized.includes("request_id") ||
    normalized.includes("\"type\": \"error\"")
  )
}

function aiNarrative(result: AnalyseResponse, input: AnalyseRequest, t: (k: string) => string): string[] {
  const rawAiAnalysis = result.ai_analysis

  if (typeof rawAiAnalysis === "string" && rawAiAnalysis.trim().length > 0 && looksLikeBackendErrorNarrative(rawAiAnalysis)) {
    return [
      `${t("analyse.results.verdictTitle")}: ${t(`verdict.${result.verdict}`)} (${result.score.toFixed(1)}/10).`,
      `${t("analyse.kpi.netYield")}: ${result.net_yield_pct.toFixed(1)}% · ${t("analyse.kpi.purchaseFactor")}: ${result.kpf.toFixed(1)}× · IRR 10y: ${result.irr_10.toFixed(1)}%.`,
      `${t("analyse.kpi.cashFlowYr1")}: ${result.cash_flow_monthly_yr1.toFixed(0)}€/mo · ${t("analyse.market.address")}: ${result.address_resolved || input.address}.`,
    ]
  }

  return getAiAnalysisLines(result, [
    `${t("analyse.results.verdictTitle")}: ${t(`verdict.${result.verdict}`)} (${result.score.toFixed(1)}/10).`,
    `${t("analyse.kpi.netYield")}: ${result.net_yield_pct.toFixed(1)}% · ${t("analyse.kpi.purchaseFactor")}: ${result.kpf.toFixed(1)}× · IRR 10y: ${result.irr_10.toFixed(1)}%.`,
    `${t("analyse.kpi.cashFlowYr1")}: ${result.cash_flow_monthly_yr1.toFixed(0)}€/mo · ${t("analyse.market.address")}: ${result.address_resolved || input.address}.`,
  ])
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

function propertyTone(slot: PropertySlot): string {
  return slot === "A" ? "bg-brand/10 text-brand" : "bg-success/10 text-success"
}

function propertyLabel(slot: PropertySlot): string {
  return `Property ${slot}`
}

function pickCompareWinner(resultA: AnalyseResponse, resultB: AnalyseResponse): PropertySlot {
  const scoreDelta = resultA.score - resultB.score
  if (scoreDelta !== 0) return scoreDelta > 0 ? "A" : "B"

  const netYieldDelta = resultA.net_yield_pct - resultB.net_yield_pct
  if (netYieldDelta !== 0) return netYieldDelta > 0 ? "A" : "B"

  const cashflowDelta = resultA.cash_flow_monthly_yr1 - resultB.cash_flow_monthly_yr1
  if (cashflowDelta !== 0) return cashflowDelta > 0 ? "A" : "B"

  return resultA.kpf <= resultB.kpf ? "A" : "B"
}

function compareRecommendationSummary(resultA: AnalyseResponse, resultB: AnalyseResponse, t: (k: string) => string) {
  const winner = pickCompareWinner(resultA, resultB)
  const winningResult = winner === "A" ? resultA : resultB
  const runnerUp = winner === "A" ? resultB : resultA
  const scoreDelta = Math.abs(resultA.score - resultB.score).toFixed(1)
  const cashflowDelta = formatEUR(Math.abs(resultA.cash_flow_monthly_yr1 - resultB.cash_flow_monthly_yr1))
  const yieldDelta = formatPct(Math.abs(resultA.net_yield_pct - resultB.net_yield_pct))

  return {
    winner,
    eyebrow: `${propertyLabel(winner)} currently leads`,
    headline: `${propertyLabel(winner)} looks stronger for a quick next-step decision.`,
    body: `${t(`verdict.${winningResult.verdict}`)} vs ${t(`verdict.${runnerUp.verdict}`)} · Score Δ ${scoreDelta} · Net yield Δ ${yieldDelta} · Cashflow Δ ${cashflowDelta}.`,
  }
}

function AskAiShell({ context }: { context: AskAiContextPayload }) {
  return (
    <AnalysisChat
      contextType={context.mode === "compare" ? "analysis_compare" : "analysis_single"}
      contextId={context.contextId}
      analysisContext={buildAnalysisContextPayload(context)}
      title={context.mode === "compare" ? "comparison" : "analysis"}
      promptHints={context.promptHints}
    />
  )
}

function CompareAiInsightSection({
  resultA,
  resultB,
  t,
}: {
  resultA: AnalyseResponse
  resultB: AnalyseResponse
  t: (k: string) => string
}) {
  const recommendation = compareRecommendationSummary(resultA, resultB, t)
  const rows = [
    {
      label: "Score Δ",
      value: `${Math.abs(resultA.score - resultB.score).toFixed(1)} pts`,
      winner: resultA.score === resultB.score ? "Tie" : propertyLabel(resultA.score > resultB.score ? "A" : "B"),
    },
    {
      label: "Net Yield Δ",
      value: formatPct(Math.abs(resultA.net_yield_pct - resultB.net_yield_pct)),
      winner: resultA.net_yield_pct === resultB.net_yield_pct ? "Tie" : propertyLabel(resultA.net_yield_pct > resultB.net_yield_pct ? "A" : "B"),
    },
    {
      label: "Cashflow Δ",
      value: formatEUR(Math.abs(resultA.cash_flow_monthly_yr1 - resultB.cash_flow_monthly_yr1)),
      winner: resultA.cash_flow_monthly_yr1 === resultB.cash_flow_monthly_yr1 ? "Tie" : propertyLabel(resultA.cash_flow_monthly_yr1 > resultB.cash_flow_monthly_yr1 ? "A" : "B"),
    },
    {
      label: "Purchase Factor Δ",
      value: formatX(Math.abs(resultA.kpf - resultB.kpf)),
      winner: resultA.kpf === resultB.kpf ? "Tie" : propertyLabel(resultA.kpf < resultB.kpf ? "A" : "B"),
    },
  ]

  const propertyCards: Array<{ slot: PropertySlot; result: AnalyseResponse }> = [
    { slot: "A", result: resultA },
    { slot: "B", result: resultB },
  ]

  return (
    <SectionShell title={t("analyse.new.aiInsight.title")} description={t("analyse.new.aiInsight.description")}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand/15 bg-gradient-to-br from-brand/10 via-bg-base to-bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              {recommendation.eyebrow}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${propertyTone(recommendation.winner)}`}>
              {propertyLabel(recommendation.winner)}
            </span>
          </div>
          <p className="mt-3 text-xl font-semibold text-text-primary">{recommendation.headline}</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">{recommendation.body}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => (
            <div key={row.label} className="rounded-xl border border-border-default bg-bg-base p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{row.label}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{row.value}</p>
              <p className="mt-1 text-xs text-text-secondary">{row.winner} leads</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {propertyCards.map(({ slot, result }) => (
            <article key={slot} className="rounded-2xl border border-border-default bg-bg-base p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${propertyTone(slot)}`}>
                    {propertyLabel(slot)}
                  </span>
                  <p className="mt-3 text-lg font-semibold text-text-primary">{t(`verdict.${result.verdict}`)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{t("analyse.new.aiInsight.scoreLabel")}</p>
                  <p className="font-mono text-2xl font-semibold text-text-primary">{result.score.toFixed(1)}/10</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetricMiniCard label={t("analyse.kpi.netYield")} value={formatPct(result.net_yield_pct)} />
                <MetricMiniCard label={t("analyse.kpi.cashFlowYr1")} value={formatEUR(result.cash_flow_monthly_yr1)} />
                <MetricMiniCard label={t("analyse.kpi.purchaseFactor")} value={formatX(result.kpf)} />
              </div>
              <p className="mt-4 text-sm text-text-secondary">{aiInsightText(result, t)}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}

function CompareAiAnalysisSection({
  inputA,
  inputB,
  resultA,
  resultB,
  t,
}: {
  inputA: AnalyseRequest
  inputB: AnalyseRequest
  resultA: AnalyseResponse
  resultB: AnalyseResponse
  t: (k: string) => string
}) {
  const recommendation = compareRecommendationSummary(resultA, resultB, t)
  const cards: Array<{ slot: PropertySlot; input: AnalyseRequest; result: AnalyseResponse }> = [
    { slot: "A", input: inputA, result: resultA },
    { slot: "B", input: inputB, result: resultB },
  ]

  return (
    <SectionShell title={t("analyse.new.aiAnalysis.title")} description={t("analyse.new.aiAnalysis.description")}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-border-default bg-bg-base p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Recommendation</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{recommendation.headline}</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{recommendation.body}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {cards.map(({ slot, input, result }) => (
            <article key={slot} className="rounded-2xl border border-border-default bg-bg-base p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${propertyTone(slot)}`}>
                    {propertyLabel(slot)}
                  </span>
                  <p className="mt-3 text-base font-semibold text-text-primary">{result.address_resolved || input.address}</p>
                </div>
                <div className="text-right text-sm text-text-secondary">
                  <p>{formatPct(result.net_yield_pct)} net yield</p>
                  <p>{formatEUR(result.cash_flow_monthly_yr1)} / mo Yr 1</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm leading-relaxed text-text-secondary">
                {aiNarrative(result, input, t).map((line, idx) => (
                  <p key={`${slot}-${idx}`}>{line}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}

function CompareNegotiationSection({
  resultA,
  resultB,
  t,
}: {
  resultA: AnalyseResponse
  resultB: AnalyseResponse
  t: (k: string) => string
}) {
  const cards: Array<{ slot: PropertySlot; items: NegotiationStrategyItem[] }> = [
    { slot: "A", items: negotiationBullets(resultA, t) },
    { slot: "B", items: negotiationBullets(resultB, t) },
  ]

  return (
    <SectionShell title={t("analyse.new.negotiation.title")} description={t("analyse.new.negotiation.description")}>
      <div className="grid gap-4 xl:grid-cols-2">
        {cards.map(({ slot, items }) => (
          <article key={slot} className="rounded-2xl border border-border-default bg-bg-base p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${propertyTone(slot)}`}>
                  {propertyLabel(slot)}
                </span>
                <p className="mt-3 text-base font-semibold text-text-primary">Best tactical talking points</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={`${slot}-${item.id}`} className="rounded-xl border border-border-default bg-bg-surface px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{negotiationCardTitle(item.id, t)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">{item.text}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  )
}

function CompareAskAiSection({
  inputs,
  results,
  t,
}: {
  inputs: CompareInputsState
  results: CompareResultsState
  t: (k: string) => string
}) {
  const selectedProperty = pickCompareWinner(results.propertyA as AnalyseResponse, results.propertyB as AnalyseResponse)
  const recommendation = compareRecommendationSummary(results.propertyA as AnalyseResponse, results.propertyB as AnalyseResponse, t)
  const context: AskAiContextPayload = {
    mode: "compare",
    selectedProperty,
    propertyInputs: {
      A: inputs.propertyA,
      B: inputs.propertyB,
    },
    propertyResults: {
      A: results.propertyA,
      B: results.propertyB,
    },
    contextId: buildAnalysisChatContextId({
      mode: "compare",
      selectedProperty,
      propertyInputs: { A: inputs.propertyA, B: inputs.propertyB },
      propertyResults: { A: results.propertyA, B: results.propertyB },
      promptHints: [],
      mockMessages: [],
    }),
    promptHints: [
      recommendation.body,
      "Which property is the better buy?",
      "Where is the downside risk?",
      "What should I negotiate on A vs B?",
    ],
    mockMessages: [],
  }

  return (
    <SectionShell title={t("analyse.new.askAi.title")} description={t("analyse.new.askAi.description")}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-default bg-bg-base px-4 py-3 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Comparison context</span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${propertyTone(selectedProperty)}`}>
            {propertyLabel(selectedProperty)} leads
          </span>
          <span>{recommendation.body}</span>
        </div>
        <AskAiShell context={context} />
      </div>
    </SectionShell>
  )
}

function SingleAnalysisWorkspace({
  input,
  result,
  loading,
  error,
  resultTab,
  snapshotResult,
  snapshotLoading,
  snapshotError,
  reviewResult,
  reviewLoading,
  reviewError,
  strategyResult,
  strategyLoading,
  strategyError,
  advisorMode,
  advisorActivationKey,
  onInputChange,
  onAnalyse,
  onRunSnapshot,
  onRunReview,
  onRunStrategy,
  onResultTabChange,
  onOpenAdvisor,
}: {
  input: AnalyseRequest
  result: AnalyseResponse | null
  loading: boolean
  error: string | null
  resultTab: ResultTab
  snapshotResult: SnapshotResult | null
  snapshotLoading: boolean
  snapshotError: string | null
  reviewResult: ReviewResult | null
  reviewLoading: boolean
  reviewError: string | null
  strategyResult: StrategyResult | null
  strategyLoading: boolean
  strategyError: string | null
  advisorMode: "light" | "full"
  advisorActivationKey: number
  onInputChange: (value: AnalyseRequest) => void
  onAnalyse: () => void
  onRunSnapshot: () => void
  onRunReview: () => void
  onRunStrategy: () => void
  onResultTabChange: (tab: ResultTab) => void
  onOpenAdvisor: (mode: "light" | "full") => void
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
      contextId: buildAnalysisChatContextId({
        mode: "single",
        selectedProperty: "A",
        propertyInputs: { A: input, B: input },
        propertyResults: { A: result, B: result },
        promptHints: [],
        mockMessages: [],
      }),
      promptHints: [
        aiInsightText(result, t),
        `${t("analyse.kpi.purchaseFactor")}: ${formatX(result.kpf)}`,
        ...(reviewResult?.final_verdict ? [`Investment review verdict: ${reviewResult.final_verdict}`] : []),
        ...(reviewResult?.missing_inputs?.[0] ? [`Review flagged missing input: ${reviewResult.missing_inputs[0]}`] : []),
        ...(strategyResult?.anchor_price != null ? [`Buying strategy anchor price: ${formatEUR(strategyResult.anchor_price)}`] : []),
        ...(strategyResult?.walk_away_price != null ? [`Buying strategy walk-away price: ${formatEUR(strategyResult.walk_away_price)}`] : []),
        ...(strategyResult?.recommended_next_move ? [`Buying strategy next move: ${strategyResult.recommended_next_move}`] : []),
        ...(strategyResult?.red_flags?.[0] ? [`Buying strategy red flag: ${strategyResult.red_flags[0]}`] : []),
      ],
      mockMessages: [],
    }
  }, [input, result, reviewResult, strategyResult, t])

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
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-base">
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
                {/* ① Intelligent Property Snapshot */}
                {snapshotLoading ? (
                  <SnapshotStatusPanel loading onRetry={onRunSnapshot} />
                ) : snapshotError ? (
                  <SnapshotStatusPanel error={snapshotError} onRetry={onRunSnapshot} />
                ) : snapshotResult ? (
                  <SnapshotResultPanel result={snapshotResult} onRefresh={onRunSnapshot} />
                ) : (
                  <SkillCardPlaceholder
                    title="Intelligent Property Snapshot"
                    description="Quick AI-powered first impression of the deal."
                    featureDescription="Grade, verdict, location rating, top strengths and top risks — generated from your current property metrics in seconds."
                    ctaLabel="Run Snapshot"
                    badge="AI · Compact"
                    onRun={onRunSnapshot}
                  />
                )}

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

                {/* ② Investment Review */}
                {reviewLoading ? (
                  <ReviewStatusPanel loading onRetry={onRunReview} />
                ) : reviewError ? (
                  <ReviewStatusPanel error={reviewError} onRetry={onRunReview} />
                ) : reviewResult ? (
                  <ReviewResultPanel result={reviewResult} onRefresh={onRunReview} />
                ) : (
                  <SkillCardPlaceholder
                    title="Investment Review"
                    description="Full structured AI analysis of this property as an investment."
                    featureDescription="Property summary, location analysis, deal economics, strengths, risks, missing inputs, sensitivity points and a final AI verdict."
                    ctaLabel="Run Investment Review"
                    badge="AI · Full analysis"
                    onRun={onRunReview}
                  />
                )}

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

                {/* ③ Buying Strategy Insight */}
                {strategyLoading ? (
                  <StrategyStatusPanel loading onRetry={onRunStrategy} />
                ) : strategyError ? (
                  <StrategyStatusPanel error={strategyError} onRetry={onRunStrategy} />
                ) : strategyResult ? (
                  <StrategyResultPanel result={strategyResult} onRefresh={onRunStrategy} />
                ) : (
                  <StrategyPrerequisitePanel canRun={Boolean(reviewResult)} onRun={onRunStrategy} />
                )}

                {/* ④ Intelligent Property Advisor */}
                <SkillCardPlaceholder
                  title="Intelligent Property Advisor"
                  description="Guided analysis with short answers and next-step prompts."
                  featureDescription="Ask a focused question and get a direct, concise answer. Lighter than the full chat — designed for quick clarifications and decision checkpoints."
                  ctaLabel="Open Advisor"
                  badge="AI · Light mode"
                  onRun={() => onOpenAdvisor("light")}
                />

                {/* ⑤ Ask the Property Advisor — full conversational AI */}
                <SectionShell
                  title="Ask the Property Advisor"
                  description="Deep conversational AI — test scenarios, challenge assumptions and explore the numbers."
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-default bg-bg-base px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Shared advisor chat</p>
                        <p className="mt-1 text-xs text-text-secondary">
                          Both advisor entry points open this same chat panel. Switch between light and full guidance as needed.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenAdvisor("full")}
                        className="inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10"
                      >
                        Ask the Property Advisor
                      </button>
                    </div>

                    {askAiContext ? (
                      <AnalysisChat
                        contextType="analysis_single"
                        contextId={askAiContext.contextId}
                        analysisContext={buildAnalysisContextPayload(askAiContext)}
                        title="analysis"
                        promptHints={askAiContext.promptHints}
                        advisorMode={advisorMode}
                        activationKey={advisorActivationKey}
                      />
                    ) : null}
                  </div>
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
  const { t } = useLocale()
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
              <CompareAiInsightSection
                resultA={results.propertyA as AnalyseResponse}
                resultB={results.propertyB as AnalyseResponse}
                t={t}
              />
              <CompareAiAnalysisSection
                inputA={inputs.propertyA}
                inputB={inputs.propertyB}
                resultA={results.propertyA as AnalyseResponse}
                resultB={results.propertyB as AnalyseResponse}
                t={t}
              />
              <CompareNegotiationSection
                resultA={results.propertyA as AnalyseResponse}
                resultB={results.propertyB as AnalyseResponse}
                t={t}
              />
              <CompareAskAiSection inputs={inputs} results={results} t={t} />
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
  const searchParams = useSearchParams()
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
  const [state, dispatch] = useReducer(
    analysePageReducer,
    {
      storeInputA,
      storeResultA,
      storeInputB,
      storeResultB,
    },
    createInitialAnalysePageState,
  )
  const [advisorActivationKey, setAdvisorActivationKey] = useState(0)
  const manualEntryId = searchParams.get("manual")?.trim() ?? ""
  const requestedMode = searchParams.get("mode")?.trim()

  useEffect(() => {
    dispatch({
      type: "setAnalysisMode",
      mode: requestedMode === "compare" ? "compare" : "single",
    })
  }, [requestedMode])

  useEffect(() => {
    if (!manualEntryId) return

    const entry = getEntryById(manualEntryId)
    if (!entry) return

    const hydratedInput = hydrateAnalyseInput(entry.input)
    const hydratedResult = isHydratableAnalyseResult(entry.result) ? entry.result : null

    dispatch({
      type: "hydrateManualEntry",
      input: hydratedInput,
      result: hydratedResult,
    })
  }, [manualEntryId])

  const analyseOne = useCallback(async (input: AnalyseRequest) => {
    const { data } = await analyseProperty(input)
    return data ?? runLocalCompute(input)
  }, [])

  const handleSingleAnalyse = useCallback(async () => {
    dispatch({ type: "singleAnalyseStart" })

    try {
      const result = await analyseOne(state.singleDraftInput)
      dispatch({ type: "singleAnalyseSuccess", result })
    } catch {
      dispatch({ type: "singleAnalyseError", error: t("analyse.error") })
    }
  }, [analyseOne, state.singleDraftInput, t])

  const handleRunSnapshot = useCallback(async () => {
    if (!state.singleAnalysisResult) {
      dispatch({ type: "snapshotError", error: "Run the property analysis first to generate a snapshot." })
      return
    }

    dispatch({ type: "snapshotStart" })

    const property = buildPropertyMetricsInput(state.singleDraftInput, state.singleAnalysisResult)
    const response = await runPropertySnapshot(property)

    if (response.error || !response.data) {
      dispatch({ type: "snapshotError", error: response.error ?? "Unable to generate property snapshot." })
      return
    }

    dispatch({ type: "snapshotSuccess", result: response.data })
  }, [state.singleAnalysisResult, state.singleDraftInput])

  const handleRunReview = useCallback(async () => {
    if (!state.singleAnalysisResult) {
      dispatch({ type: "reviewError", error: "Run the property analysis first to generate an investment review." })
      return
    }

    dispatch({ type: "reviewStart" })

    const property = buildPropertyMetricsInput(state.singleDraftInput, state.singleAnalysisResult)
    const response = await runInvestmentReview(property)

    if (response.error || !response.data) {
      dispatch({ type: "reviewError", error: response.error ?? "Unable to generate investment review." })
      return
    }

    dispatch({ type: "reviewSuccess", result: response.data })
  }, [state.singleAnalysisResult, state.singleDraftInput])

  const handleRunStrategy = useCallback(async () => {
    if (!state.singleAnalysisResult) {
      dispatch({ type: "strategyError", error: "Run the property analysis first to generate a buying strategy." })
      return
    }

    if (!state.reviewResult) {
      dispatch({ type: "strategyError", error: "Run Investment Review first. Buying Strategy Insight needs the latest full review result." })
      return
    }

    dispatch({ type: "strategyStart" })

    const property = buildPropertyMetricsInput(state.singleDraftInput, state.singleAnalysisResult)
    const response = await runBuyingStrategy(property, state.reviewResult)

    if (response.error || !response.data) {
      dispatch({ type: "strategyError", error: response.error ?? "Unable to generate buying strategy insight." })
      return
    }

    dispatch({ type: "strategySuccess", result: response.data })
  }, [state.reviewResult, state.singleAnalysisResult, state.singleDraftInput])

  const updateCompareInput = useCallback((property: ComparePropertyKey, value: AnalyseRequest) => {
    dispatch({ type: "setCompareDraftInput", property, input: value })
  }, [])

  const handleCompareAnalyse = useCallback(async (property: ComparePropertyKey) => {
    dispatch({ type: "compareAnalyseStart", property })

    try {
      const result = await analyseOne(state.compareDraftInputs[property])
      dispatch({ type: "compareAnalyseSuccess", property, result })
    } catch {
      dispatch({ type: "compareAnalyseError", property, error: t("analyse.error") })
    }
  }, [analyseOne, state.compareDraftInputs, t])

  const handleAnalyseBoth = useCallback(async () => {
    dispatch({ type: "compareAnalyseBothStart" })

    try {
      const [propertyAResult, propertyBResult] = await Promise.all([
        analyseOne(state.compareDraftInputs.propertyA),
        analyseOne(state.compareDraftInputs.propertyB),
      ])

      dispatch({
        type: "compareAnalyseBothSuccess",
        results: {
          propertyA: propertyAResult,
          propertyB: propertyBResult,
        },
      })
    } catch {
      dispatch({ type: "compareAnalyseBothError", error: t("analyse.error") })
    }
  }, [analyseOne, state.compareDraftInputs, t])

  const handleResetCompareProperty = useCallback((property: ComparePropertyKey) => {
    dispatch({ type: "resetCompareProperty", property })
  }, [])

  const handleOpenAdvisor = useCallback((mode: "light" | "full") => {
    dispatch({ type: "setAdvisorMode", mode })
    setAdvisorActivationKey((current) => current + 1)
  }, [])

  useEffect(() => {
    setStoreInputA(state.compareDraftInputs.propertyA)
    setStoreInputB(state.compareDraftInputs.propertyB)
    setStoreResultA(state.compareAnalysisResults.propertyA)
    setStoreResultB(state.compareAnalysisResults.propertyB)
  }, [
    state.compareAnalysisResults.propertyA,
    state.compareAnalysisResults.propertyB,
    state.compareDraftInputs.propertyA,
    state.compareDraftInputs.propertyB,
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

        <ModeSwitcher
          mode={state.analysisMode}
          onChange={(mode) => dispatch({ type: "setAnalysisMode", mode })}
        />

        {state.analysisMode === "single" ? (
          <SingleAnalysisWorkspace
            input={state.singleDraftInput}
            result={state.singleAnalysisResult}
            loading={state.singleLoading}
            error={state.singleError}
            resultTab={state.singleResultTab}
            snapshotResult={state.snapshotResult}
            snapshotLoading={state.snapshotLoading}
            snapshotError={state.snapshotError}
            reviewResult={state.reviewResult}
            reviewLoading={state.reviewLoading}
            reviewError={state.reviewError}
            strategyResult={state.strategyResult}
            strategyLoading={state.strategyLoading}
            strategyError={state.strategyError}
            advisorMode={state.advisorMode}
            advisorActivationKey={advisorActivationKey}
            onInputChange={(input) => dispatch({ type: "setSingleDraftInput", input })}
            onAnalyse={handleSingleAnalyse}
            onRunSnapshot={handleRunSnapshot}
            onRunReview={handleRunReview}
            onRunStrategy={handleRunStrategy}
            onResultTabChange={(tab) => dispatch({ type: "setSingleResultTab", tab })}
            onOpenAdvisor={handleOpenAdvisor}
          />
        ) : (
          <CompareAnalysisWorkspace
            inputs={state.compareDraftInputs}
            results={state.compareAnalysisResults}
            loading={state.compareLoading}
            error={state.compareError}
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
