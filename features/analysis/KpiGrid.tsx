"use client"

import { formatEUR, formatPct, formatX } from "@/lib/format"
import { useLocale } from "@/lib/i18n/locale-context"
import type { AnalyseResponse } from "@/types/api"

interface KpiDef {
  key: string
  format: (r: AnalyseResponse) => string
  status: (r: AnalyseResponse) => "ok" | "warn" | "bad" | "neutral"
  tooltip: string
}

const KPI_DEFS: KpiDef[] = [
  {
    key: "netYield",
    format: (r) => formatPct(r.net_yield_pct),
    status: (r) => (r.net_yield_pct >= 3.5 ? "ok" : r.net_yield_pct >= 2.5 ? "warn" : "bad"),
    tooltip: "Annual rental income minus costs, as a percentage of the purchase price. Higher is better — above 3.5% is good for German cities.",
  },
  {
    key: "purchaseFactor",
    format: (r) => formatX(r.kpf),
    status: (r) => (r.kpf < 22 ? "ok" : r.kpf < 28 ? "warn" : "bad"),
    tooltip: "How many years of rent it takes to pay off the purchase price. Lower is better — under 22 is great, over 28 is expensive.",
  },
  {
    key: "irr10",
    format: (r) => formatPct(r.irr_10),
    status: (r) => (r.irr_10 > 6 ? "ok" : r.irr_10 > 4 ? "warn" : "bad"),
    tooltip: "Your total return on equity over 10 years, including rent, tax savings, and property appreciation. Above 6% is a strong result.",
  },
  {
    key: "cashFlowYr1",
    format: (r) => formatEUR(r.cash_flow_monthly_yr1),
    status: (r) => (r.cash_flow_monthly_yr1 >= 0 ? "ok" : r.cash_flow_monthly_yr1 >= -200 ? "warn" : "bad"),
    tooltip: "What you actually pocket (or pay out of pocket) each month after all costs and loan payments. Positive means the property pays for itself.",
  },
  {
    key: "ltv",
    format: (r) => (r.ltv_pct != null ? formatPct(r.ltv_pct) : "—"),
    status: (r) => (r.ltv_pct == null ? "neutral" : r.ltv_pct < 80 ? "ok" : r.ltv_pct < 90 ? "warn" : "bad"),
    tooltip: "How much of the property is financed by the bank loan. For example, 76% means you put down 24% as equity. Below 80% gets you better interest rates.",
  },
  {
    key: "afa",
    format: (r) => (r.afa_tax_saving_yr1 != null ? formatEUR(r.afa_tax_saving_yr1) : "—"),
    status: () => "neutral",
    tooltip: "Tax savings from depreciation (AfA). The German tax office lets you write off part of the building value each year, reducing your taxable income.",
  },
  {
    key: "annuity",
    format: (r) => (r.annuity_monthly != null ? formatEUR(r.annuity_monthly) : "—"),
    status: () => "neutral",
    tooltip: "Your fixed monthly payment to the bank, covering both interest and loan repayment.",
  },
  {
    key: "closingCosts",
    format: (r) => (r.closing_costs != null ? formatEUR(r.closing_costs) : "—"),
    status: () => "neutral",
    tooltip: "One-time costs when buying: property transfer tax, notary fees, and agent commission. Typically 7–12% of the purchase price in Germany.",
  },
]

const STATUS_CLASSES: Record<string, string> = {
  ok: "text-success",
  warn: "text-warning",
  bad: "text-danger",
  neutral: "text-text-primary",
}

const STRIPE_CLASSES: Record<string, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  bad: "bg-danger",
  neutral: "bg-border",
}

interface KpiGridProps {
  result: AnalyseResponse
}

export function KpiGrid({ result }: KpiGridProps) {
  const { t } = useLocale()

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
      {KPI_DEFS.map((kpi) => {
          const st = kpi.status(result)
          return (
            <div
              key={kpi.key}
              title={kpi.tooltip}
              className="relative overflow-hidden rounded-xl border border-border bg-bg-surface p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-help"
            >
              <div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-xl ${STRIPE_CLASSES[st]}`} />
              <p className="pl-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                {t(`analyse.kpi.${kpi.key}`)}
              </p>
              <p className={`mt-1.5 pl-2 font-mono text-xl font-bold leading-none ${STATUS_CLASSES[st]}`}>
                {kpi.format(result)}
              </p>
            </div>
          )
        })}
    </div>
  )
}
