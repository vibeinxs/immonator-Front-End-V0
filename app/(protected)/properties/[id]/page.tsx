"use client"

import { use, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { VerdictBadge } from "@/components/verdict-badge"
import { MetricCard } from "@/components/metric-card"
import { VerdictRing } from "@/components/analysis/VerdictRing"
import { CashflowChart } from "@/components/analysis/CashflowChart"
import { FlagsList, computeInvestmentFlags } from "@/components/analysis/FlagsList"
import { ExitHorizons } from "@/components/analysis/ExitHorizons"
import { ProjectionsTable } from "@/components/analysis/ProjectionsTable"
import { CompactAnalysisCard } from "@/components/analysis/CompactAnalysisCard"
import { DeepAnalysisReport } from "@/components/analysis/DeepAnalysisReport"
import { MarketAnalysisCard } from "@/components/analysis/MarketAnalysisCard"
import { AnalysisChat } from "@/components/chat/AnalysisChat"
import {
  immoApi,
  getFinancialMetrics,
  triggerAndGetFinancialMetrics,
  type FinancialMetrics,
} from "@/lib/immonatorApi"
import { EUR } from "@/lib/utils"
import type { Property } from "@/types/api"

/* ─── Types ─────────────────────────────────────────────── */

type CompactVerdict = "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"

interface CompactResult {
  verdict: CompactVerdict
  confidence_score: number
  one_line_summary: string
}

const VERDICT_SCORE: Record<CompactVerdict, number> = {
  strong_buy:           9.0,
  worth_analysing:      6.5,
  proceed_with_caution: 4.5,
  avoid:                2.5,
}

/* ─── Skeleton helpers ───────────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[14px] border border-border-default bg-bg-surface p-6"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-2 h-3 w-36" />
        </div>
      ))}
    </div>
  )
}

function RingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Skeleton className="h-32 w-32 rounded-full" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="flex h-44 items-end gap-3 px-4">
      {[60, 80, 70, 90, 75].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

/* ─── Error banner ───────────────────────────────────────── */

function ErrorBanner({ message, endpoint }: { message: string; endpoint?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <div>
        <p className="text-sm font-medium text-danger">{message}</p>
        {endpoint && (
          <p className="mt-0.5 font-mono text-xs text-danger/70">{endpoint}</p>
        )}
      </div>
    </div>
  )
}

/* ─── Section card wrapper ───────────────────────────────── */

function SectionCard({
  title,
  children,
  className = "",
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-[14px] border border-border-default bg-bg-surface p-6 ${className}`}>
      <h3 className="mb-4 font-serif text-lg text-text-primary">{title}</h3>
      {children}
    </div>
  )
}

/* ─── KPI Grid ───────────────────────────────────────────── */

function KpiGrid({
  metrics,
  property,
}: {
  metrics: FinancialMetrics
  property: Property | null
}) {
  const price = property?.asking_price ?? 0
  const sqm   = property?.living_area_sqm ?? 0
  const ppsqm = price && sqm ? price / sqm : 0

  const kpis = [
    {
      label: "Net Yield",
      value: metrics.net_yield_pct,
      suffix: "%",
      context: metrics.net_yield_pct >= 4
        ? "Above 4% — solid after costs"
        : metrics.net_yield_pct >= 2.5
          ? "Within typical range"
          : "Below 2.5% — below average",
      sentiment: (metrics.net_yield_pct >= 4 ? "positive" : metrics.net_yield_pct >= 2.5 ? "neutral" : "negative") as "positive" | "negative" | "neutral",
    },
    {
      label: "KPF (Price/Rent)",
      value: metrics.kpf > 0 ? metrics.kpf : null,
      suffix: "×",
      context: metrics.kpf < 20
        ? "< 20× — attractive multiplier"
        : metrics.kpf > 30
          ? "> 30× — high multiple"
          : "20–30× typical range",
      sentiment: (metrics.kpf < 20 ? "positive" : metrics.kpf > 30 ? "negative" : "neutral") as "positive" | "negative" | "neutral",
    },
    {
      label: "IRR (10 yr)",
      value: metrics.irr_10,
      suffix: "%",
      context: metrics.irr_10 >= 7
        ? "Strong long-term return"
        : metrics.irr_10 >= 5
          ? "Solid long-term return"
          : "Below 5% target",
      sentiment: (metrics.irr_10 >= 5 ? "positive" : metrics.irr_10 >= 3 ? "neutral" : "negative") as "positive" | "negative" | "neutral",
    },
    {
      label: "Cashflow / Mo",
      value: metrics.cash_flow_monthly_yr1,
      prefix: metrics.cash_flow_monthly_yr1 >= 0 ? `+${EUR}` : EUR,
      context: metrics.cash_flow_monthly_yr1 >= 0 ? "Positive from Year 1" : "Negative in Year 1",
      sentiment: (metrics.cash_flow_monthly_yr1 >= 0 ? "positive" : "negative") as "positive" | "negative" | "neutral",
    },
  ]

  // Optional KPIs — only shown when available
  const optional = [
    metrics.ltv !== undefined && {
      label: "LTV",
      value: metrics.ltv,
      suffix: "%",
      context: metrics.ltv > 80 ? "Above 80% — high leverage" : "Within acceptable range",
      sentiment: (metrics.ltv > 80 ? "negative" : "neutral") as "positive" | "negative" | "neutral",
    },
    metrics.afa_saving !== undefined && {
      label: "AfA Tax Saving",
      value: metrics.afa_saving,
      prefix: EUR,
      suffix: "/yr",
      context: "Depreciation tax benefit",
      sentiment: "positive" as const,
    },
    metrics.monthly_annuity !== undefined && {
      label: "Monthly Annuity",
      value: metrics.monthly_annuity,
      prefix: EUR,
      context: "Mortgage repayment per month",
      sentiment: "neutral" as const,
    },
    metrics.closing_costs !== undefined && {
      label: "Closing Costs",
      value: metrics.closing_costs,
      prefix: EUR,
      context: `~${price > 0 ? ((metrics.closing_costs / price) * 100).toFixed(1) : "—"}% of purchase price`,
      sentiment: "neutral" as const,
    },
    ppsqm > 0 && {
      label: `${EUR}/m²`,
      value: Math.round(ppsqm),
      prefix: EUR,
      context: "Asking price per sqm",
      sentiment: "neutral" as const,
    },
  ].filter(Boolean) as typeof kpis

  const all = [...kpis, ...optional]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {all.map((kpi) => {
        const numVal = typeof kpi.value === "number" ? kpi.value : 0
        if (kpi.value === null) return null
        return (
          <MetricCard
            key={kpi.label}
            label={kpi.label}
            value={parseFloat(numVal.toFixed(2))}
            prefix={kpi.prefix ?? ""}
            suffix={kpi.suffix ?? ""}
            context={kpi.context}
            sentiment={kpi.sentiment}
          />
        )
      })}
    </div>
  )
}

/* ─── Pending state for financial data ───────────────────── */

function FinancialPending({ onTrigger, triggering }: { onTrigger: () => void; triggering: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-border-default bg-bg-elevated py-12 text-center">
      <p className="font-serif text-lg text-text-primary">Financial analysis not yet run</p>
      <p className="text-sm text-text-secondary">
        Run a deep analysis to generate KPIs, cashflow chart and projections.
      </p>
      <button
        onClick={onTrigger}
        disabled={triggering}
        className="mt-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {triggering ? "Starting analysis…" : "Run Analysis"}
      </button>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */

const POLL_MS = 3000
const MAX_POLLS = 20

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  /* ── State ── */
  const [property, setProperty]       = useState<Property | null>(null)
  const [propLoading, setPropLoading] = useState(true)
  const [propError, setPropError]     = useState<string | null>(null)

  const [compact, setCompact]         = useState<CompactResult | null>(null)
  const [compactLoading, setCompactLoading] = useState(true)

  const [metrics, setMetrics]         = useState<FinancialMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError]     = useState<string | null>(null)
  const [triggering, setTriggering]         = useState(false)

  const pollCountRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Property ── */
  useEffect(() => {
    if (id === "_demo") {
      // Demo property — use static data
      setProperty({
        id: "_demo",
        title: "3-Zimmer Wohnung · Stuttgart-Möhringen",
        address: "Möhringer Straße",
        city: "Stuttgart",
        zip_code: "70567",
        asking_price: 385000,
        price_per_sqm: 4936,
        living_area_sqm: 78,
        rooms: 3,
        property_type: "apartment",
        source_url: null,
        days_on_market: 38,
        images_urls: [],
        year_built: 1968,
        heating_type: "Fernwärme",
        monthly_rent: 1150,
        price_history: [],
        created_at: new Date().toISOString(),
      } as Property)
      setPropLoading(false)
      return
    }

    immoApi.fetchPropertyById(id).then(({ data, error }) => {
      if (data) setProperty(data)
      if (error) setPropError(error)
      setPropLoading(false)
    })
  }, [id])

  /* ── Compact analysis (for VerdictRing score) ── */
  useEffect(() => {
    let alive = true

    async function poll() {
      const { data } = await immoApi.getCompactAnalysis(id) as {
        data: { status: string; analysis?: CompactResult | null } | null
      }
      if (!alive) return
      if (data?.status === "generated" && data.analysis?.verdict) {
        setCompact(data.analysis)
        setCompactLoading(false)
        return
      }
      if (!data || data.status === "not_generated") {
        // Don't block UI — compact may still be generating
        setCompactLoading(false)
        return
      }
      setCompactLoading(false)
    }

    poll()
    return () => { alive = false }
  }, [id])

  /* ── Financial metrics (from deep analysis calculated_metrics) ── */
  const startFinancialPoll = useCallback(async () => {
    pollCountRef.current = 0
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)

    const schedule = async () => {
      const { data, error } = await getFinancialMetrics(id)
      if (error) {
        setMetricsError(error)
        setMetricsLoading(false)
        return
      }
      if (data?.status === "generated") {
        setMetrics(data.metrics)
        setMetricsLoading(false)
        setMetricsError(null)
        return
      }
      pollCountRef.current++
      if (pollCountRef.current >= MAX_POLLS) {
        setMetricsLoading(false)
        return
      }
      pollTimerRef.current = setTimeout(schedule, POLL_MS)
    }

    schedule()
  }, [id])

  useEffect(() => {
    startFinancialPoll()
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current) }
  }, [startFinancialPoll])

  /* ── Manual trigger (for "Run Analysis" button) ── */
  const handleTrigger = useCallback(async () => {
    setTriggering(true)
    setMetricsError(null)
    const { data, error } = await triggerAndGetFinancialMetrics(id)
    setTriggering(false)
    if (error) {
      setMetricsError(error)
      return
    }
    if (data?.calculated_metrics || data?.analysis) {
      // Returned immediately (cached)
      const { data: fresh } = await getFinancialMetrics(id)
      if (fresh?.metrics) setMetrics(fresh.metrics)
      setMetricsLoading(false)
    } else {
      // Pending — start polling
      setMetricsLoading(true)
      startFinancialPoll()
    }
  }, [id, startFinancialPoll])

  /* ─────────────────────────────────────────────── */
  /* Derived values */

  const ringScore = compact
    ? VERDICT_SCORE[compact.verdict] * (compact.confidence_score / 10)
    : null

  const ringDisplayScore = ringScore !== null
    ? Math.max(0, Math.min(10, VERDICT_SCORE[compact!.verdict] + (compact!.confidence_score - 5) * 0.2))
    : null

  const flags = metrics
    ? computeInvestmentFlags({
        gross_yield_pct:      metrics.gross_yield_pct,
        net_yield_pct:        metrics.net_yield_pct,
        kpf:                  metrics.kpf,
        irr_10:               metrics.irr_10,
        cash_flow_monthly_yr1: metrics.cash_flow_monthly_yr1,
        ltv:                  metrics.ltv,
        days_on_market:       property?.days_on_market,
        price:                property?.asking_price,
        closing_costs:        metrics.closing_costs,
      })
    : []

  const hasProjections = metrics
    ? metrics.irr_10 > 0 || metrics.irr_15 > 0 || metrics.irr_20 > 0
    : false

  /* ─────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Back link */}
      <Link
        href="/properties"
        className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Properties
      </Link>

      {/* Page header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          {propLoading ? (
            <>
              <Skeleton className="h-7 w-72" />
              <Skeleton className="mt-2 h-4 w-48" />
            </>
          ) : propError ? (
            <ErrorBanner message={propError} endpoint={`/api/properties/${id}`} />
          ) : (
            <>
              <h1 className="font-serif text-[28px] leading-tight text-text-primary">
                {property?.title ?? `Property ${id}`}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {[property?.address, property?.city, property?.zip_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
                {property?.rooms && <span>{property.rooms} rooms</span>}
                {property?.living_area_sqm && <span>{property.living_area_sqm} m²</span>}
                {property?.year_built && <span>Built {property.year_built}</span>}
                {property?.days_on_market !== undefined && (
                  <span
                    className={
                      property.days_on_market > 60
                        ? "text-warning"
                        : property.days_on_market > 30
                          ? "text-text-muted"
                          : "text-text-muted"
                    }
                  >
                    {property.days_on_market} days listed
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {property?.asking_price && (
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-text-primary">
                {EUR}{property.asking_price.toLocaleString("de-DE")}
              </p>
              {property.price_per_sqm && (
                <p className="text-xs text-text-muted">
                  {EUR}{Math.round(property.price_per_sqm).toLocaleString("de-DE")}/m²
                </p>
              )}
            </div>
          )}
          {compact && <VerdictBadge verdict={compact.verdict} />}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="gap-0">
        {/* Custom tab bar matching the properties page style */}
        <TabsList className="mb-6 h-auto w-full justify-start gap-0 rounded-none border-b border-border-default bg-transparent p-0">
          {[
            { value: "overview",    label: "Overview" },
            { value: "projections", label: "Projections" },
            { value: "ai",          label: "AI Analysis" },
            { value: "market",      label: "Market Data" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-auto rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 text-sm font-medium text-text-secondary shadow-none data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand data-[state=active]:shadow-none"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-0 flex flex-col gap-8">
          {metricsError && (
            <ErrorBanner message={metricsError} endpoint={`/api/analysis/deep/${id}`} />
          )}

          {/* Top row: VerdictRing + KPI grid */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Ring */}
            <div className="shrink-0">
              {compactLoading ? (
                <RingSkeleton />
              ) : compact ? (
                <VerdictRing
                  score={ringDisplayScore ?? VERDICT_SCORE[compact.verdict]}
                  verdict={compact.verdict}
                  subText={
                    compact.confidence_score > 0
                      ? `Confidence ${compact.confidence_score}/10`
                      : undefined
                  }
                />
              ) : (
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-dashed border-border-default">
                  <span className="text-xs text-text-muted">No score</span>
                </div>
              )}
            </div>

            {/* KPI grid */}
            <div className="flex-1">
              {metricsLoading ? (
                <KpiSkeleton />
              ) : metrics ? (
                <KpiGrid metrics={metrics} property={property} />
              ) : (
                <FinancialPending onTrigger={handleTrigger} triggering={triggering} />
              )}
            </div>
          </div>

          {/* Summary from compact analysis */}
          {compact?.one_line_summary && (
            <div className="rounded-xl border-l-4 border-brand bg-brand-subtle px-4 py-3">
              <p className="text-sm italic text-text-secondary">
                {compact.one_line_summary}
              </p>
            </div>
          )}

          {/* Cashflow chart + flags side by side on desktop */}
          {metrics && (
            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard title="Annual Cashflow (key years)">
                {metricsLoading ? (
                  <ChartSkeleton />
                ) : metrics.year_data.length > 0 ? (
                  <CashflowChart yearData={metrics.year_data} />
                ) : (
                  <div className="flex h-44 items-center justify-center text-sm text-text-muted">
                    Year data will appear after analysis completes
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Investment Flags">
                {flags.length > 0 ? (
                  <FlagsList flags={flags} />
                ) : (
                  <p className="text-sm text-text-muted">
                    Flags are generated from financial metrics after analysis.
                  </p>
                )}
              </SectionCard>
            </div>
          )}

          {/* If no metrics yet, show flags prompt */}
          {!metrics && !metricsLoading && (
            <FinancialPending onTrigger={handleTrigger} triggering={triggering} />
          )}
        </TabsContent>

        {/* ── PROJECTIONS ── */}
        <TabsContent value="projections" className="mt-0 flex flex-col gap-8">
          {metricsLoading ? (
            <KpiSkeleton />
          ) : metrics && hasProjections ? (
            <>
              <div>
                <h3 className="mb-4 font-serif text-lg text-text-primary">
                  Returns at Exit
                </h3>
                <ExitHorizons
                  irr_10={metrics.irr_10}
                  irr_15={metrics.irr_15}
                  irr_20={metrics.irr_20}
                  equity_multiple_10={metrics.equity_multiple_10}
                  equity_multiple_15={metrics.equity_multiple_15}
                  equity_multiple_20={metrics.equity_multiple_20}
                />
              </div>

              <div>
                <h3 className="mb-4 font-serif text-lg text-text-primary">
                  Year-by-Year Projections
                </h3>
                <ProjectionsTable yearData={metrics.year_data} />
              </div>
            </>
          ) : metrics ? (
            <SectionCard title="Projections">
              <p className="text-sm text-text-muted">
                IRR and equity multiple data will appear once the financial model has run.
              </p>
              <ProjectionsTable yearData={metrics.year_data} />
            </SectionCard>
          ) : (
            <FinancialPending onTrigger={handleTrigger} triggering={triggering} />
          )}
        </TabsContent>

        {/* ── AI ANALYSIS ── */}
        <TabsContent value="ai" className="mt-0 flex flex-col gap-6">
          {/* Compact verdict card — self-polling */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
              <h3 className="mb-4 font-serif text-lg text-text-primary">Quick Assessment</h3>
              <CompactAnalysisCard propertyId={id} />
            </div>

            <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
              <h3 className="mb-4 font-serif text-lg text-text-primary">AI Chat</h3>
              <p className="text-sm text-text-secondary">
                Ask questions about this property, its risks, or alternative scenarios.
              </p>
              <div className="mt-4">
                <AnalysisChat
                  contextType="property"
                  contextId={id}
                  title={property?.title ?? `property ${id}`}
                />
              </div>
            </div>
          </div>

          {/* Deep analysis report — self-polling with trigger button */}
          <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
            <h3 className="mb-4 font-serif text-lg text-text-primary">Deep Analysis Report</h3>
            <DeepAnalysisReport propertyId={id} />
          </div>
        </TabsContent>

        {/* ── MARKET DATA ── */}
        <TabsContent value="market" className="mt-0 flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <MarketAnalysisCard city={property?.city ?? "Berlin"} />

            <SectionCard title="Market Context">
              <p className="text-sm text-text-secondary">
                Full market comparison across {property?.city ?? "this city"} and comparable
                micro-locations will appear here once market data is fetched.
              </p>
              <Link
                href={`/market/${(property?.city ?? "berlin").toLowerCase()}`}
                className="mt-4 inline-block text-sm text-brand transition-colors hover:text-brand-hover"
              >
                View full market report →
              </Link>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
