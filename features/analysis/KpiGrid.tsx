"use client"

import { useMemo, useState } from "react"
import { formatEUR, formatPct, formatX } from "@/lib/format"
import { useLocale } from "@/lib/i18n/locale-context"
import type { AnalyseResponse } from "@/types/api"

interface KpiDef {
  key: string
  group: "core" | "extended"
  format: (r: AnalyseResponse) => string
  status: (r: AnalyseResponse) => "ok" | "warn" | "bad" | "neutral"
}

const KPI_DEFS: KpiDef[] = [
  {
    key: "netYield",
    group: "core",
    format: (r) => formatPct(r.net_yield_pct),
    status: (r) => (r.net_yield_pct >= 3.5 ? "ok" : r.net_yield_pct >= 2.5 ? "warn" : "bad"),
  },
  {
    key: "purchaseFactor",
    group: "core",
    format: (r) => formatX(r.kpf),
    status: (r) => (r.kpf < 22 ? "ok" : r.kpf < 28 ? "warn" : "bad"),
  },
  {
    key: "irr10",
    group: "core",
    format: (r) => formatPct(r.irr_10),
    status: (r) => (r.irr_10 > 6 ? "ok" : r.irr_10 > 4 ? "warn" : "bad"),
  },
  {
    key: "cashFlowYr1",
    group: "core",
    format: (r) => formatEUR(r.cash_flow_monthly_yr1),
    status: (r) => (r.cash_flow_monthly_yr1 >= 0 ? "ok" : r.cash_flow_monthly_yr1 >= -200 ? "warn" : "bad"),
  },
  {
    key: "ltv",
    group: "extended",
    format: (r) => (r.ltv_pct != null ? formatPct(r.ltv_pct) : "—"),
    status: (r) => (r.ltv_pct == null ? "neutral" : r.ltv_pct < 80 ? "ok" : r.ltv_pct < 90 ? "warn" : "bad"),
  },
  {
    key: "afa",
    group: "extended",
    format: (r) => (r.afa_tax_saving_yr1 != null ? formatEUR(r.afa_tax_saving_yr1) : "—"),
    status: () => "neutral",
  },
  {
    key: "annuity",
    group: "extended",
    format: (r) => (r.annuity_monthly != null ? formatEUR(r.annuity_monthly) : "—"),
    status: () => "neutral",
  },
  {
    key: "closingCosts",
    group: "extended",
    format: (r) => (r.closing_costs != null ? formatEUR(r.closing_costs) : "—"),
    status: () => "neutral",
  },
]

const STATUS_CLASSES: Record<string, string> = {
  ok: "text-success",
  warn: "text-warning",
  bad: "text-danger",
  neutral: "text-text-primary",
}

const STATUS_BADGE: Record<string, string> = {
  ok: "bg-success/10 border-success/20",
  warn: "bg-warning/10 border-warning/20",
  bad: "bg-danger/10 border-danger/20",
  neutral: "bg-bg-surface border-border-default",
}

interface KpiGridProps {
  result: AnalyseResponse
  defaultExpanded?: boolean
}

export function KpiGrid({ result, defaultExpanded = false }: KpiGridProps) {
  const { t } = useLocale()
  const [showAll, setShowAll] = useState(defaultExpanded)

  const kpis = useMemo(() => KPI_DEFS.filter((kpi) => showAll || kpi.group === "core"), [showAll])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpis.map((kpi) => {
          const st = kpi.status(result)
          return (
            <div key={kpi.key} className={`rounded-lg border p-3 ${STATUS_BADGE[st]}`}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                {t(`analyse.kpi.${kpi.key}`)}
              </p>
              <p className={`mt-1 font-mono text-base font-bold ${STATUS_CLASSES[st]}`}>
                {kpi.format(result)}
              </p>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
        className="text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
      >
        {showAll ? t("analyse.kpi.showFewer") : t("analyse.kpi.showAll")}
      </button>
    </div>
  )
}
