"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { MetricCard } from "@/components/metric-card"
import { VerdictBadge } from "@/components/verdict-badge"
import { useLocale } from "@/lib/i18n/locale-context"
import { EUR } from "@/lib/utils"
import { immoApi } from "@/lib/immonatorApi"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiToUiStatus, UI_STATUS_ORDER, type UiPortfolioStatus, uiToApiStatus } from "@/lib/portfolioStatus"
import type { PortfolioItem } from "@/types/api"

interface PortfolioRow {
  id: string
  propertyId: string
  title: string
  city: string
  address: string
  price: number
  status: UiPortfolioStatus
  addedAt: string
  verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
  irr10: number | null
  yieldPct: number | null
  cashflow: number | null
}

function toNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function mapItem(item: PortfolioItem): PortfolioRow {
  const metrics = item.compact_analysis?.calculated_metrics ?? {}
  return {
    id: item.portfolio_id,
    propertyId: item.property_id,
    title: item.title ?? "Untitled",
    city: item.city ?? "",
    address: item.address ?? "",
    price: item.purchase_price ?? item.asking_price ?? 0,
    status: apiToUiStatus(item.status),
    addedAt: item.added_at,
    verdict: item.compact_analysis?.verdict ?? "worth_analysing",
    irr10: toNumber(metrics.irr_10),
    yieldPct: toNumber(metrics.net_yield_pct ?? metrics.gross_yield),
    cashflow: toNumber(metrics.cash_flow_monthly_yr1),
  }
}

export default function PortfolioPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [items, setItems] = useState<PortfolioRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<UiPortfolioStatus | "all">("all")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPortfolio = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await immoApi.getPortfolio()
    if (!res.data) {
      setError(res.error ?? t("portfolio.loadError"))
      setLoading(false)
      return
    }
    setItems((res.data.items ?? []).map(mapItem))
    setLoading(false)
  }, [t])

  useEffect(() => {
    loadPortfolio()
    const handler = () => loadPortfolio()
    window.addEventListener("portfolio:changed", handler)
    return () => window.removeEventListener("portfolio:changed", handler)
  }, [loadPortfolio])

  const filtered = useMemo(
    () => items.filter((item) => statusFilter === "all" || item.status === statusFilter),
    [items, statusFilter]
  )

  const totalValue = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items])
  const avgYield = useMemo(() => {
    const vals = items.map((i) => i.yieldPct).filter((v): v is number => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }, [items])
  const monthlyCashflow = useMemo(() => items.reduce((sum, i) => sum + (i.cashflow ?? 0), 0), [items])

  const handleStatusUpdate = async (id: string, next: UiPortfolioStatus) => {
    setBusyId(id)
    const res = await immoApi.updatePortfolioStatus(id, uiToApiStatus(next))
    if (!res.data?.success) {
      setError(res.error ?? t("portfolio.statusUpdateError"))
      setBusyId(null)
      return
    }
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, status: next } : row)))
    setBusyId(null)
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    const res = await immoApi.removeFromPortfolio(id)
    if (!res.data?.success) {
      setError(res.error ?? t("portfolio.deleteError"))
      setBusyId(null)
      return
    }
    setItems((prev) => prev.filter((row) => row.id !== id))
    setBusyId(null)
  }

  if (loading) {
    return <div className="py-10 text-sm text-text-secondary">{t("portfolio.loading")}</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">{t("portfolio.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("portfolio.subtitle")}</p>
      </div>

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <MetricCard label={t("portfolio.metric.totalValue")} value={totalValue} prefix={EUR} sentiment="neutral" />
        <MetricCard label={t("portfolio.metric.cashFlow")} value={monthlyCashflow} prefix={EUR} suffix="/mo" sentiment={monthlyCashflow >= 0 ? "positive" : "negative"} />
        <MetricCard label={t("portfolio.metric.avgYield")} value={avgYield} suffix="%" sentiment={avgYield >= 5 ? "positive" : "neutral"} />
        <MetricCard label={t("portfolio.metric.properties")} value={items.length} sentiment="neutral" />
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as UiPortfolioStatus | "all")}>
        <TabsList className="h-auto bg-transparent p-0 gap-0 border-b border-border-default rounded-none w-full justify-start">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">{t("portfolio.filter.all")} ({items.length})</TabsTrigger>
          {UI_STATUS_ORDER.map((status) => (
            <TabsTrigger key={status} value={status} className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-brand data-[state=active]:text-brand">
              {t(`portfolio.status.${status}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-border-default bg-bg-surface py-16 text-center text-sm text-text-secondary">
          {t("portfolio.emptyFiltered")}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-border-default bg-bg-surface p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-base font-semibold text-text-primary">{item.title}</p>
                  <p className="text-sm text-text-secondary">{item.address || item.city}</p>
                  <p className="mt-1 text-xs text-text-muted">{t("portfolio.updated")} {new Date(item.addedAt).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusUpdate(item.id, e.target.value as UiPortfolioStatus)}
                    disabled={busyId === item.id}
                    className="rounded-lg border border-border-default bg-bg-base px-2.5 py-1.5 text-xs font-semibold text-text-primary"
                  >
                    {UI_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {t(`portfolio.status.${status}`)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg border border-border-default p-2 text-text-muted hover:text-danger"
                    aria-label={t("portfolio.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                <div className="rounded-md bg-bg-elevated px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">{t("portfolio.kpi.irr10")}</p>
                  <p className="font-mono text-text-primary">{item.irr10 != null ? `${item.irr10.toFixed(1)}%` : "—"}</p>
                </div>
                <div className="rounded-md bg-bg-elevated px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">{t("portfolio.kpi.yield")}</p>
                  <p className="font-mono text-text-primary">{item.yieldPct != null ? `${item.yieldPct.toFixed(1)}%` : "—"}</p>
                </div>
                <div className="rounded-md bg-bg-elevated px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">{t("portfolio.kpi.cashflow")}</p>
                  <p className="font-mono text-text-primary">{item.cashflow != null ? `${item.cashflow.toFixed(0)}€` : "—"}</p>
                </div>
                <div className="rounded-md bg-bg-elevated px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">{t("portfolio.kpi.verdict")}</p>
                    <VerdictBadge verdict={item.verdict} />
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/analyse?portfolioId=${item.id}`)}
                    className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
                  >
                    {t("portfolio.openInAnalyse")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
