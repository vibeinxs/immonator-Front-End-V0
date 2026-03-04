"use client"

import { use, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { VerdictBadge } from "@/components/verdict-badge"
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

/* ─── Demo static data (no backend calls for _demo) ─────── */

const DEMO_PROPERTY: Property = {
  id: "_demo",
  title: "3-Zimmer Wohnung · Stuttgart-Möhringen",
  address: "Möhringer Straße 42",
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
} as Property

const DEMO_COMPACT: CompactResult = {
  verdict: "worth_analysing",
  confidence_score: 7,
  one_line_summary:
    "Solid Altbau in a good transit location — yields are tight but a €15k price reduction leaves real negotiation room.",
}

const DEMO_METRICS: FinancialMetrics = {
  gross_yield_pct: 3.58,
  net_yield_pct: 2.76,
  kpf: 27.9,
  irr_10: 5.2,
  irr_15: 6.1,
  irr_20: 6.8,
  equity_multiple_10: 1.82,
  equity_multiple_15: 2.38,
  equity_multiple_20: 3.14,
  cash_flow_monthly_yr1: -85,
  ltv: 80,
  monthly_annuity: 1318,
  closing_costs: 36575,
  afa_saving: 1232,
  year_data: [
    { year:  1, cashflow_monthly:  -85, equity:  80500, rent: 1150, cumulative_cashflow:  -1020 },
    { year:  2, cashflow_monthly:  -52, equity:  92800, rent: 1173, cumulative_cashflow:  -1644 },
    { year:  3, cashflow_monthly:  -18, equity: 105600, rent: 1196, cumulative_cashflow:  -1860 },
    { year:  4, cashflow_monthly:   16, equity: 118900, rent: 1220, cumulative_cashflow:  -1668 },
    { year:  5, cashflow_monthly:   51, equity: 132700, rent: 1245, cumulative_cashflow:  -1056 },
    { year:  6, cashflow_monthly:   87, equity: 147100, rent: 1270, cumulative_cashflow:    -12 },
    { year:  7, cashflow_monthly:  124, equity: 162000, rent: 1295, cumulative_cashflow:   1476 },
    { year:  8, cashflow_monthly:  161, equity: 177600, rent: 1321, cumulative_cashflow:   3408 },
    { year:  9, cashflow_monthly:  199, equity: 193800, rent: 1347, cumulative_cashflow:   5796 },
    { year: 10, cashflow_monthly:  238, equity: 210700, rent: 1374, cumulative_cashflow:   8652 },
    { year: 11, cashflow_monthly:  278, equity: 228300, rent: 1402, cumulative_cashflow:  11988 },
    { year: 12, cashflow_monthly:  318, equity: 246600, rent: 1430, cumulative_cashflow:  15804 },
    { year: 13, cashflow_monthly:  359, equity: 265700, rent: 1459, cumulative_cashflow:  20112 },
    { year: 14, cashflow_monthly:  401, equity: 285600, rent: 1488, cumulative_cashflow:  24924 },
    { year: 15, cashflow_monthly:  443, equity: 306300, rent: 1518, cumulative_cashflow:  30240 },
    { year: 16, cashflow_monthly:  487, equity: 327800, rent: 1548, cumulative_cashflow:  36084 },
    { year: 17, cashflow_monthly:  531, equity: 350200, rent: 1579, cumulative_cashflow:  42456 },
    { year: 18, cashflow_monthly:  576, equity: 373500, rent: 1611, cumulative_cashflow:  49368 },
    { year: 19, cashflow_monthly:  622, equity: 397700, rent: 1643, cumulative_cashflow:  56832 },
    { year: 20, cashflow_monthly:  668, equity: 422900, rent: 1676, cumulative_cashflow:  64848 },
  ],
}

/* ─── Small helpers ──────────────────────────────────────── */

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

/* ─── Compact KPI tile (used in the hero card) ───────────── */

interface KpiTileProps {
  label: string
  value: string
  context?: string
  sentiment?: "positive" | "negative" | "neutral"
}

function KpiTile({ label, value, context, sentiment = "neutral" }: KpiTileProps) {
  const valueColor =
    sentiment === "positive" ? "text-success"
    : sentiment === "negative" ? "text-danger"
    : "text-text-primary"

  return (
    <div className="flex flex-col gap-0.5 py-1">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
        {label}
      </p>
      <p className={`font-mono text-xl font-semibold leading-tight ${valueColor}`}>
        {value}
      </p>
      {context && (
        <p className="text-[11px] leading-tight text-text-muted">{context}</p>
      )}
    </div>
  )
}

/* ─── Hero overview card ─────────────────────────────────── */

function OverviewHero({
  compact,
  metrics,
  property,
  compactLoading,
  metricsLoading,
  onTrigger,
  triggering,
}: {
  compact: CompactResult | null
  metrics: FinancialMetrics | null
  property: Property | null
  compactLoading: boolean
  metricsLoading: boolean
  onTrigger: () => void
  triggering: boolean
}) {
  const score = compact
    ? Math.max(0, Math.min(10, VERDICT_SCORE[compact.verdict] + (compact.confidence_score - 5) * 0.2))
    : null

  const price = property?.asking_price ?? 0
  const sqm   = property?.living_area_sqm ?? 0
  const ppsqm = price && sqm ? Math.round(price / sqm) : null

  return (
    <div className="rounded-[14px] border border-border-default bg-bg-surface">
      {/* Top strip: ring + KPIs */}
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        {/* Score ring */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          {compactLoading ? (
            <Skeleton className="h-[140px] w-[140px] rounded-full" />
          ) : compact && score !== null ? (
            <VerdictRing score={score} verdict={compact.verdict} size={140} />
          ) : (
            <div className="flex h-[140px] w-[140px] flex-col items-center justify-center rounded-full border-4 border-dashed border-border-default">
              <span className="text-xs text-text-muted">Pending</span>
            </div>
          )}
        </div>

        {/* KPIs */}
        {metricsLoading ? (
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : metrics ? (
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            <KpiTile
              label="Net Yield"
              value={`${metrics.net_yield_pct.toFixed(2)}%`}
              context={metrics.net_yield_pct >= 4 ? "Above avg" : metrics.net_yield_pct < 2.5 ? "Below avg" : "Avg range"}
              sentiment={metrics.net_yield_pct >= 4 ? "positive" : metrics.net_yield_pct < 2.5 ? "negative" : "neutral"}
            />
            <KpiTile
              label="KPF"
              value={`${metrics.kpf.toFixed(1)}×`}
              context={metrics.kpf < 20 ? "Attractive" : metrics.kpf > 30 ? "High" : "Typical"}
              sentiment={metrics.kpf < 20 ? "positive" : metrics.kpf > 30 ? "negative" : "neutral"}
            />
            <KpiTile
              label="IRR 10 yr"
              value={`${metrics.irr_10.toFixed(1)}%`}
              context={metrics.irr_10 >= 7 ? "Strong" : metrics.irr_10 >= 5 ? "Solid" : "Weak"}
              sentiment={metrics.irr_10 >= 5 ? "positive" : metrics.irr_10 >= 3 ? "neutral" : "negative"}
            />
            <KpiTile
              label="CF / Month"
              value={`${metrics.cash_flow_monthly_yr1 >= 0 ? "+" : ""}${EUR}${Math.round(metrics.cash_flow_monthly_yr1).toLocaleString("de-DE")}`}
              context="Year 1"
              sentiment={metrics.cash_flow_monthly_yr1 >= 0 ? "positive" : "negative"}
            />
            {metrics.ltv !== undefined && (
              <KpiTile
                label="LTV"
                value={`${metrics.ltv.toFixed(0)}%`}
                sentiment={metrics.ltv > 80 ? "negative" : "neutral"}
              />
            )}
            {metrics.afa_saving !== undefined && (
              <KpiTile
                label="AfA / yr"
                value={`${EUR}${Math.round(metrics.afa_saving).toLocaleString("de-DE")}`}
                context="Tax benefit"
                sentiment="positive"
              />
            )}
            {metrics.monthly_annuity !== undefined && (
              <KpiTile
                label="Annuity"
                value={`${EUR}${Math.round(metrics.monthly_annuity).toLocaleString("de-DE")}`}
                context="/ month"
              />
            )}
            {ppsqm && (
              <KpiTile
                label={`${EUR}/m²`}
                value={`${EUR}${ppsqm.toLocaleString("de-DE")}`}
              />
            )}
          </div>
        ) : (
          <div className="flex-1">
            <FinancialPending onTrigger={onTrigger} triggering={triggering} />
          </div>
        )}
      </div>

      {/* AI summary strip */}
      {compact?.one_line_summary && (
        <div className="border-t border-border-default px-6 py-3">
          <p className="text-sm italic text-text-secondary">
            <span className="mr-2 text-[10px] font-bold uppercase tracking-widest not-italic text-brand">
              AI
            </span>
            {compact.one_line_summary}
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Skeleton helpers ───────────────────────────────────── */

function ChartSkeleton() {
  return (
    <div className="flex h-44 items-end gap-3 px-4">
      {[60, 80, 70, 90, 75].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */

const POLL_MS   = 3000
const MAX_POLLS = 20

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const isDemo = id === "_demo"

  /* ── State ── */
  const [property, setProperty]               = useState<Property | null>(null)
  const [propLoading, setPropLoading]         = useState(true)
  const [propError, setPropError]             = useState<string | null>(null)

  const [compact, setCompact]                 = useState<CompactResult | null>(null)
  const [compactLoading, setCompactLoading]   = useState(true)

  const [metrics, setMetrics]                 = useState<FinancialMetrics | null>(null)
  const [metricsLoading, setMetricsLoading]   = useState(true)
  const [metricsError, setMetricsError]       = useState<string | null>(null)
  const [triggering, setTriggering]           = useState(false)

  const pollCountRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Seed demo data instantly (no API) ── */
  useEffect(() => {
    if (isDemo) {
      setProperty(DEMO_PROPERTY)
      setCompact(DEMO_COMPACT)
      setMetrics(DEMO_METRICS)
      setPropLoading(false)
      setCompactLoading(false)
      setMetricsLoading(false)
    }
  }, [isDemo])

  /* ── Property (real IDs only) ── */
  useEffect(() => {
    if (isDemo) return
    immoApi.fetchPropertyById(id).then(({ data, error }) => {
      if (data) setProperty(data)
      if (error) setPropError(error)
      setPropLoading(false)
    })
  }, [id, isDemo])

  /* ── Compact analysis (real IDs only) ── */
  useEffect(() => {
    if (isDemo) return
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
      setCompactLoading(false)
    }

    poll()
    return () => { alive = false }
  }, [id, isDemo])

  /* ── Financial metrics (real IDs only) ── */
  const startFinancialPoll = useCallback(async () => {
    if (isDemo) return
    pollCountRef.current = 0
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)

    const schedule = async () => {
      const { data, error } = await getFinancialMetrics(id)
      if (error) { setMetricsError(error); setMetricsLoading(false); return }
      if (data?.status === "generated") {
        setMetrics(data.metrics); setMetricsLoading(false); setMetricsError(null); return
      }
      if (++pollCountRef.current >= MAX_POLLS) { setMetricsLoading(false); return }
      pollTimerRef.current = setTimeout(schedule, POLL_MS)
    }
    schedule()
  }, [id, isDemo])

  useEffect(() => {
    if (isDemo) return
    startFinancialPoll()
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current) }
  }, [startFinancialPoll, isDemo])

  /* ── Manual trigger ── */
  const handleTrigger = useCallback(async () => {
    if (isDemo) return
    setTriggering(true); setMetricsError(null)
    const { data, error } = await triggerAndGetFinancialMetrics(id)
    setTriggering(false)
    if (error) { setMetricsError(error); return }
    if (data?.calculated_metrics || data?.analysis) {
      const { data: fresh } = await getFinancialMetrics(id)
      if (fresh?.metrics) { setMetrics(fresh.metrics); setMetricsLoading(false) }
    } else {
      setMetricsLoading(true); startFinancialPoll()
    }
  }, [id, isDemo, startFinancialPoll])

  /* ── Derived ── */
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

  const hasProjections = !!metrics && (metrics.irr_10 > 0 || metrics.irr_15 > 0 || metrics.irr_20 > 0)

  /* ─────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
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
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-[26px] leading-tight text-text-primary">
                  {property?.title ?? `Property ${id}`}
                </h1>
                {isDemo && (
                  <span className="rounded-full border border-brand/30 bg-brand-subtle px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                    Demo
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {[property?.address, property?.city, property?.zip_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                {property?.rooms && <span>{property.rooms} Zimmer</span>}
                {property?.living_area_sqm && <span>{property.living_area_sqm} m²</span>}
                {property?.year_built && <span>Bj. {property.year_built}</span>}
                {property?.heating_type && <span>{property.heating_type}</span>}
                {property?.days_on_market !== undefined && (
                  <span className={property.days_on_market > 60 ? "text-warning" : ""}>
                    {property.days_on_market} Tage inseriert
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
        <TabsContent value="overview" className="mt-0 flex flex-col gap-5">
          {metricsError && (
            <ErrorBanner message={metricsError} endpoint={`/api/analysis/deep/${id}`} />
          )}

          {/* Hero card: ring + KPIs + AI summary */}
          <OverviewHero
            compact={compact}
            metrics={metrics}
            property={property}
            compactLoading={compactLoading}
            metricsLoading={metricsLoading}
            onTrigger={handleTrigger}
            triggering={triggering}
          />

          {/* Cashflow chart + flags */}
          {metrics && (
            <div className="grid gap-5 lg:grid-cols-2">
              <SectionCard title="Cashflow / Month (key years)">
                {metrics.year_data.length > 0 ? (
                  <CashflowChart yearData={metrics.year_data} />
                ) : (
                  <ChartSkeleton />
                )}
              </SectionCard>

              <SectionCard title="Investment Signals">
                <FlagsList flags={flags} />
              </SectionCard>
            </div>
          )}

          {!metrics && !metricsLoading && (
            <FinancialPending onTrigger={handleTrigger} triggering={triggering} />
          )}
        </TabsContent>

        {/* ── PROJECTIONS ── */}
        <TabsContent value="projections" className="mt-0 flex flex-col gap-6">
          {metricsLoading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-[14px] border border-border-default bg-bg-surface p-5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-3 h-8 w-20" />
                  <Skeleton className="mt-4 h-3 w-24" />
                  <Skeleton className="mt-1 h-6 w-16" />
                </div>
              ))}
            </div>
          ) : metrics && hasProjections ? (
            <>
              <div>
                <h3 className="mb-4 font-serif text-lg text-text-primary">Returns at Exit</h3>
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
                <h3 className="mb-4 font-serif text-lg text-text-primary">Year-by-Year</h3>
                <ProjectionsTable yearData={metrics.year_data} />
              </div>
            </>
          ) : metrics ? (
            <SectionCard title="Projections">
              <p className="text-sm text-text-muted">
                IRR data will appear once the financial model has run.
              </p>
              <ProjectionsTable yearData={metrics.year_data} />
            </SectionCard>
          ) : (
            <FinancialPending onTrigger={handleTrigger} triggering={triggering} />
          )}
        </TabsContent>

        {/* ── AI ANALYSIS ── */}
        <TabsContent value="ai" className="mt-0 flex flex-col gap-5">
          {isDemo ? (
            <SectionCard title="AI Analysis">
              <p className="text-sm text-text-secondary">
                AI analysis runs on real properties added to your portfolio. This is a demo — add a
                property via ImmoScout24 link to see a full AI report.
              </p>
              <Link
                href="/properties"
                className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-brand-hover"
              >
                Add a property →
              </Link>
            </SectionCard>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
                  <h3 className="mb-4 font-serif text-lg text-text-primary">Quick Assessment</h3>
                  <CompactAnalysisCard propertyId={id} />
                </div>
                <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
                  <h3 className="mb-4 font-serif text-lg text-text-primary">AI Chat</h3>
                  <AnalysisChat
                    contextType="property"
                    contextId={id}
                    title={property?.title ?? `property ${id}`}
                  />
                </div>
              </div>
              <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
                <h3 className="mb-4 font-serif text-lg text-text-primary">Deep Analysis</h3>
                <DeepAnalysisReport propertyId={id} />
              </div>
            </>
          )}
        </TabsContent>

        {/* ── MARKET DATA ── */}
        <TabsContent value="market" className="mt-0 flex flex-col gap-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <MarketAnalysisCard city={property?.city ?? "Stuttgart"} />
            <SectionCard title="Market Context">
              <p className="text-sm text-text-secondary">
                Full market comparison across {property?.city ?? "this city"} will appear here.
              </p>
              <Link
                href={`/market/${(property?.city ?? "stuttgart").toLowerCase()}`}
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
