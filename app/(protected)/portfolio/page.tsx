"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { MetricCard } from "@/components/metric-card"
import { VerdictBadge } from "@/components/verdict-badge"
import { useLocale } from "@/lib/i18n/locale-context"
import { EUR, cn } from "@/lib/utils"
import { immoApi } from "@/lib/immonatorApi"
import { copy } from "@/lib/copy"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { listEntries, deleteEntry, updateStatus, type ManualPortfolioEntry, type ManualPortfolioStatus } from "@/lib/manualPortfolio"
import { useAnalysisStore } from "@/store/analysisStore"


/* ── types ───────────────────────────────────────── */
interface PortfolioProperty {
  id: string
  title: string
  city: string
  price: number
  verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
  gross_yield: number
  days_listed: number
  gap_percent: number
  status: string
}

interface PortfolioAnalysis {
  quality_badge: string
  summary: string
  rankings: { rank: number; title: string; city: string; score: number }[]
  capital_plan: { title: string; amount: number; priority: string }[]
  action_items: string[]
}

interface PortfolioData {
  properties: PortfolioProperty[]
  analysis: PortfolioAnalysis | null
  total_value: number
  monthly_cashflow: number
  avg_yield: number
  equity_estimate: number
}

const TABS = ["all", "watching", "analysing", "negotiating", "purchased", "rejected"] as const

/* ── ContextHint ─────────────────────────────────── */
function ContextHint({ hintId, headline, body }: { hintId: string; headline: string; body: string }) {
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(`hint_${hintId}`) === "1")
    }
  }, [hintId])
  if (dismissed) return null
  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-subtle p-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">{headline}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{body}</p>
      </div>
      <button
        onClick={() => { localStorage.setItem(`hint_${hintId}`, "1"); setDismissed(true) }}
        className="text-xs text-text-muted hover:text-text-secondary"
        aria-label="Dismiss"
      >
        {"x"}
      </button>
    </div>
  )
}

/* ── EmptyState ──────────────────────────────────── */
function EmptyState({ icon, headline, body, actionLabel, onAction, disabled }: {
  icon: string; headline: string; body: string; actionLabel?: string; onAction?: () => void; disabled?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border-default bg-bg-surface py-20">
      <span className="text-4xl" role="img" aria-hidden="true">{icon}</span>
      <h3 className="mt-4 font-serif text-lg text-text-primary">{headline}</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">{body}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          disabled={disabled}
          className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}


/* ── ManualPortfolioSection ──────────────────────── */
const STATUS_BADGE: Record<ManualPortfolioStatus, string> = {
  watching: "bg-brand/10 text-brand",
  analysing: "bg-warning/10 text-warning",
  purchased: "bg-success/10 text-success",
}

function ManualPortfolioSection() {
  const router = useRouter()
  const { setInputA } = useAnalysisStore()
  const [entries, setEntries] = useState<ManualPortfolioEntry[]>([])

  useEffect(() => {
    setEntries(listEntries())
  }, [])

  const handleDelete = (id: string) => {
    deleteEntry(id)
    setEntries(listEntries())
  }

  const handleStatusChange = (id: string, status: ManualPortfolioStatus) => {
    updateStatus(id, status)
    setEntries(listEntries())
  }

  const handleOpen = (entry: ManualPortfolioEntry) => {
    setInputA(entry.input)
    router.push("/analyse")
  }

  if (entries.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Manual Portfolio
          <span className="ml-2 rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-normal text-text-muted">
            {entries.length}
          </span>
        </h2>
        <button
          onClick={() => router.push("/analyse")}
          className="text-xs text-brand hover:underline"
        >
          + Add from Analysis
        </button>
      </div>

      <div className="rounded-[14px] border border-border-default bg-bg-surface overflow-hidden">
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            className={cn(
              "flex flex-col gap-1.5 px-5 py-4 transition-colors hover:bg-bg-elevated/40",
              i > 0 && "border-t border-border-default"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">{entry.name}</p>
                <p className="text-xs text-text-muted">
                  Saved {new Date(entry.savedAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={entry.status}
                  onChange={(e) => handleStatusChange(entry.id, e.target.value as ManualPortfolioStatus)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase cursor-pointer border-0 outline-none",
                    STATUS_BADGE[entry.status]
                  )}
                >
                  <option value="watching">Watching</option>
                  <option value="analysing">Analysing</option>
                  <option value="purchased">Purchased</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-mono">
                <span className="text-[10px] uppercase tracking-wide text-text-muted mr-1">IRR 10yr</span>
                <span className={entry.result.irr_10 >= 5 ? "text-success" : "text-warning"}>
                  {entry.result.irr_10.toFixed(1)}%
                </span>
              </span>
              <span className="font-mono">
                <span className="text-[10px] uppercase tracking-wide text-text-muted mr-1">CF/mo</span>
                <span className={entry.result.cash_flow_monthly_yr1 >= 0 ? "text-success" : "text-danger"}>
                  {entry.result.cash_flow_monthly_yr1 >= 0 ? "+" : ""}{EUR}{Math.abs(Math.round(entry.result.cash_flow_monthly_yr1)).toLocaleString("de-DE")}
                </span>
              </span>
              <span className="font-mono">
                <span className="text-[10px] uppercase tracking-wide text-text-muted mr-1">Net Yield</span>
                <span className="text-text-primary">{entry.result.net_yield_pct.toFixed(1)}%</span>
              </span>
              <span className="font-mono">
                <span className="text-[10px] uppercase tracking-wide text-text-muted mr-1">Equity ×</span>
                <span className="text-text-primary">{entry.result.equity_multiple_10.toFixed(2)}×</span>
              </span>
            </div>

            <div className="flex gap-2 mt-0.5">
              <button
                onClick={() => handleOpen(entry)}
                className="text-xs text-brand hover:underline"
              >
                Open Analysis →
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-xs text-text-muted hover:text-danger transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────── */
export default function PortfolioPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>("all")
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [analysing, setAnalysing] = useState(false)

  useEffect(() => {
    Promise.all([immoApi.getPortfolio(), immoApi.getPortfolioAnalysis()]).then(([portfolioRes, analysisRes]) => {
      if (portfolioRes.data) {
        // Backend returns {items: PortfolioItem[], total: number}
        // Map to the local PortfolioData shape
        const items = portfolioRes.data.items ?? []
        const properties: PortfolioProperty[] = items.map((item) => ({
          id: item.property_id ?? item.id ?? "",
          title: item.title ?? "Untitled",
          city: item.city ?? "",
          price: item.purchase_price ?? item.asking_price ?? 0,
          verdict: (item.compact_analysis as any)?.verdict ?? "worth_analysing",
          gross_yield: item.gross_yield ?? 0,
          days_listed: item.days_on_market ?? 0,
          gap_percent: 0,
          status: item.status ?? "watching",
        }))

        const prices = properties.map((p) => p.price).filter(Boolean)
        const yields = properties.map((p) => p.gross_yield).filter(Boolean)

        const next: PortfolioData = {
          properties,
          analysis: analysisRes.data ? analysisRes.data as unknown as PortfolioAnalysis : null,
          total_value: prices.reduce((a, b) => a + b, 0),
          monthly_cashflow: 0,  // Backend doesn't aggregate this — show 0 until deep analysis runs
          avg_yield: yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : 0,
          equity_estimate: prices.reduce((a, b) => a + b, 0) * 0.2,  // Rough estimate
        }
        setData(next)
      }
      setLoading(false)
    })
  }, [])

  const runAnalysis = useCallback(async () => {
    setAnalysing(true)
    const { data: d } = await immoApi.triggerPortfolioAnalysis() as unknown as { data: { analysis?: PortfolioAnalysis } | null }
    if (d?.analysis) {
      setData((prev) => (prev ? { ...prev, analysis: d.analysis || null } : prev))
    }
    setAnalysing(false)
    setAnalysisOpen(true)
  }, [])

  const filtered = data?.properties.filter((p) => tab === "all" || p.status === tab) ?? []

  /* ── Loading skeleton ─────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="h-8 w-48 rounded-lg bg-bg-elevated animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[130px] rounded-[14px] bg-bg-elevated animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-[14px] bg-bg-elevated animate-pulse" />
      </div>
    )
  }

  /* ── Empty portfolio ──────────────────────────── */
  if (!data || data.properties.length === 0) {
    return (
      <div className="flex flex-col gap-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">{t("portfolio.title")}</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label={t("portfolio.metric.totalValue")} value={0} prefix={EUR} sentiment="neutral" />
          <MetricCard label={t("portfolio.metric.cashFlow")} value={0} prefix={EUR} sentiment="neutral" />
          <MetricCard label={t("portfolio.metric.avgYield")} value={0} suffix="%" sentiment="neutral" />
          <MetricCard label={t("portfolio.metric.properties")} value={0} sentiment="neutral" />
        </div>
        <EmptyState
          icon={String.fromCharCode(128278)}
          headline={t("portfolio.empty.title")}
          body={t("portfolio.empty.body")}
          actionLabel={copy.portfolio.browseCta}
          onAction={() => router.push("/properties")}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-text-primary">{t("portfolio.title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {`${data.properties.length} ${t("portfolio.subtitle")} ${String.fromCharCode(183)} Est. equity: ${EUR}${(data.equity_estimate ?? 0).toLocaleString("de-DE")}`}
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analysing}
          className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {analysing ? copy.portfolio.analysing : t("portfolio.analyse")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <MetricCard label={t("portfolio.metric.totalValue")} value={data.total_value} prefix={EUR} sentiment="neutral" />
        <MetricCard label={t("portfolio.metric.cashFlow")} value={data.monthly_cashflow} prefix={EUR} suffix="/mo" sentiment={data.monthly_cashflow >= 0 ? "positive" : "negative"} />
        <MetricCard label={t("portfolio.metric.avgYield")} value={data.avg_yield} suffix="%" sentiment={data.avg_yield >= 5 ? "positive" : "neutral"} />
        <MetricCard label={t("portfolio.metric.properties")} value={data.properties.length} sentiment="neutral" />
      </div>

      {/* Manual Portfolio */}
      <ManualPortfolioSection />

      {/* Portfolio Analysis */}
      <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border-default bg-bg-surface px-5 py-4 text-left transition-colors hover:bg-bg-hover">
          <span className="font-display text-lg text-text-primary">{t("portfolio.analysis")}</span>
          <ChevronDown className={cn("h-4 w-4 text-text-muted transition-transform", analysisOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-xl border border-border-default bg-bg-surface p-6">
          {!data.analysis ? (
            <EmptyState
              icon={String.fromCharCode(128202)}
              headline={copy.portfolio.analysisEmptyHeadline}
              body={copy.portfolio.analysisEmptyBody}
              actionLabel={copy.portfolio.analysisEmptyCta}
              onAction={runAnalysis}
              disabled={data.properties.length < 2}
            />
          ) : (
            <div className="space-y-6">
              {/* Quality badge + summary */}
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-brand-subtle px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
                  {data.analysis.quality_badge}
                </span>
                <p className="text-sm text-text-secondary">{data.analysis.summary}</p>
              </div>
              {/* Rankings */}
              <div>
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-3">{copy.portfolio.rankingsLabel}</h4>
                <div className="space-y-2">
                  {(data.analysis.rankings ?? []).map((r) => (
                    <div key={r.rank} className="flex items-center justify-between rounded-lg border border-border-default px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold text-brand">
                          {r.rank}
                        </span>
                        <span className="text-sm font-medium text-text-primary">{r.title}</span>
                        <span className="text-xs text-text-muted">{r.city}</span>
                      </div>
                      <span className="font-mono text-sm text-text-secondary">{r.score}/100</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Capital plan */}
              <div className="overflow-hidden rounded-xl border border-border-default">
                <table className="w-full text-sm">
                  <thead className="bg-bg-elevated">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.property}</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.allocation}</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.priority}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.analysis.capital_plan ?? []).map((c) => (
                      <tr key={c.title} className="border-t border-border-default hover:bg-bg-hover">
                        <td className="px-4 py-3 text-text-primary">{c.title}</td>
                        <td className="px-4 py-3 text-right font-mono text-text-primary">{EUR}{(c.amount ?? 0).toLocaleString("de-DE")}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                            c.priority === "high" && "bg-success-bg text-success",
                            c.priority === "medium" && "bg-warning-bg text-warning",
                            c.priority === "low" && "bg-bg-elevated text-text-muted",
                          )}>
                            {c.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Action items */}
              <div>
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-3">{copy.portfolio.actionPlanLabel}</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {(data.analysis.action_items ?? []).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="mt-0.5 text-success">{"+"}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <ContextHint
        hintId="portfolio-analysis-tip"
        headline={copy.portfolio.contextHintHeadline}
        body={copy.portfolio.contextHintBody}
      />

      {/* Status Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-auto bg-transparent p-0 gap-0 border-b border-border-default rounded-none w-full justify-start">
          {TABS.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className={cn(
                "rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm text-text-secondary capitalize transition-colors",
                "data-[state=active]:border-brand data-[state=active]:text-brand data-[state=active]:shadow-none"
              )}
            >
              {t === "all" ? `All (${data.properties.length})` : t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Desktop Table */}
      {filtered.length > 0 ? (
        <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-border-default bg-bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.property}</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.status}</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.price}</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.verdict}</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.yield}</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.days}</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">{copy.portfolio.tableHeaders.gap}</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">···</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/properties/${p.id}`)}
                    className="cursor-pointer border-t border-border-default transition-colors hover:bg-bg-hover"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{p.title}</div>
                      <div className="text-xs text-text-muted">{p.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-bg-elevated px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">{EUR}{(p.price ?? 0).toLocaleString("de-DE")}</td>
                    <td className="px-4 py-3"><VerdictBadge verdict={p.verdict} /></td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">{(p.gross_yield ?? 0).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-mono text-text-muted">{p.days_listed ?? 0}</td>
                    <td className={cn("px-4 py-3 text-right font-mono", p.gap_percent < 0 ? "text-success" : "text-danger")}>
                      {(p.gap_percent ?? 0) > 0 ? "+" : ""}{(p.gap_percent ?? 0).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">···</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/properties/${p.id}`)}
                className="cursor-pointer rounded-xl border border-border-default bg-bg-surface p-4 transition-colors hover:bg-bg-hover"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{p.title}</p>
                    <p className="text-xs text-text-muted">{p.city}</p>
                  </div>
                  <VerdictBadge verdict={p.verdict} />
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="font-mono text-text-primary">{EUR}{(p.price ?? 0).toLocaleString("de-DE")}</span>
                  <span className="font-mono text-text-secondary">{(p.gross_yield ?? 0).toFixed(1)}%</span>
                  <span className={cn("ml-auto font-mono text-xs", p.gap_percent < 0 ? "text-success" : "text-danger")}>
                    {(p.gap_percent ?? 0) > 0 ? "+" : ""}{(p.gap_percent ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={String.fromCharCode(128278)}
          headline={copy.portfolio.emptyHeadline}
          body={copy.portfolio.emptyBody}
          actionLabel={copy.portfolio.browseCta}
          onAction={() => router.push("/properties")}
        />
      )}
    </div>
  )
}
