"use client"

import { EUR } from "@/lib/utils"

export interface InvestmentFlag {
  label: string
  severity: "positive" | "warning" | "danger" | "neutral"
}

/** Deterministic rule engine — derives flags from backend financial metrics. */
export function computeInvestmentFlags(params: {
  gross_yield_pct: number
  net_yield_pct: number
  kpf: number
  irr_10: number
  cash_flow_monthly_yr1: number
  ltv?: number
  days_on_market?: number | null
  price?: number | null
  closing_costs?: number
}): InvestmentFlag[] {
  const {
    gross_yield_pct,
    net_yield_pct,
    kpf,
    irr_10,
    cash_flow_monthly_yr1,
    ltv,
    days_on_market,
    price,
    closing_costs,
  } = params

  const flags: InvestmentFlag[] = []

  // Gross yield
  if (gross_yield_pct >= 5)
    flags.push({ label: `Gross yield ${gross_yield_pct.toFixed(1)}% — above 5% threshold`, severity: "positive" })
  else if (gross_yield_pct >= 3.5)
    flags.push({ label: `Gross yield ${gross_yield_pct.toFixed(1)}% — moderate, market average`, severity: "neutral" })
  else
    flags.push({ label: `Low gross yield ${gross_yield_pct.toFixed(1)}% — below 3.5%`, severity: "danger" })

  // Net yield
  if (net_yield_pct >= 4)
    flags.push({ label: `Net yield ${net_yield_pct.toFixed(1)}% — strong after costs`, severity: "positive" })
  else if (net_yield_pct < 2.5)
    flags.push({ label: `Net yield ${net_yield_pct.toFixed(1)}% — low after-cost return`, severity: "danger" })

  // Price multiplier (KPF = Kaufpreisfaktor)
  if (kpf > 0) {
    if (kpf > 30)
      flags.push({ label: `KPF ${kpf.toFixed(1)}× — high price multiplier (>30)`, severity: "danger" })
    else if (kpf < 20)
      flags.push({ label: `KPF ${kpf.toFixed(1)}× — attractive price multiplier (<20)`, severity: "positive" })
    else
      flags.push({ label: `KPF ${kpf.toFixed(1)}× — within typical range (20–30)`, severity: "neutral" })
  }

  // 10-year IRR
  if (irr_10 >= 8)
    flags.push({ label: `IRR 10y ${irr_10.toFixed(1)}% — excellent long-term return`, severity: "positive" })
  else if (irr_10 >= 5)
    flags.push({ label: `IRR 10y ${irr_10.toFixed(1)}% — solid long-term return`, severity: "positive" })
  else if (irr_10 < 3)
    flags.push({ label: `IRR 10y ${irr_10.toFixed(1)}% — below inflation target`, severity: "danger" })

  // Monthly cashflow Year 1
  if (cash_flow_monthly_yr1 > 200)
    flags.push({
      label: `Positive cashflow +${EUR}${Math.round(cash_flow_monthly_yr1).toLocaleString("de-DE")}/mo from Year 1`,
      severity: "positive",
    })
  else if (cash_flow_monthly_yr1 < 0)
    flags.push({
      label: `Negative cashflow ${EUR}${Math.round(cash_flow_monthly_yr1).toLocaleString("de-DE")}/mo in Year 1`,
      severity: "danger",
    })
  else
    flags.push({ label: `Near break-even cashflow in Year 1`, severity: "warning" })

  // LTV
  if (ltv !== undefined && ltv > 0) {
    if (ltv > 85)
      flags.push({ label: `LTV ${ltv.toFixed(0)}% — very high leverage, limited buffer`, severity: "danger" })
    else if (ltv > 75)
      flags.push({ label: `LTV ${ltv.toFixed(0)}% — above typical 75% threshold`, severity: "warning" })
  }

  // Days on market
  if (days_on_market && days_on_market > 90)
    flags.push({
      label: `Listed ${days_on_market} days — strong negotiation leverage`,
      severity: "positive",
    })
  else if (days_on_market && days_on_market > 60)
    flags.push({
      label: `Listed ${days_on_market} days — price negotiation possible`,
      severity: "warning",
    })

  // Price
  if (price && price > 750000)
    flags.push({ label: `High absolute price ${EUR}${Math.round(price / 1000)}k — liquidity risk on exit`, severity: "warning" })

  // Closing costs
  if (closing_costs && price) {
    const ccPct = (closing_costs / price) * 100
    if (ccPct > 12)
      flags.push({ label: `Closing costs ${ccPct.toFixed(1)}% — above average`, severity: "warning" })
  }

  return flags
}

/* ── UI component ── */

const dotStyle: Record<InvestmentFlag["severity"], string> = {
  positive: "bg-success",
  warning:  "bg-warning",
  danger:   "bg-danger",
  neutral:  "bg-text-muted",
}

const labelStyle: Record<InvestmentFlag["severity"], string> = {
  positive: "text-success",
  warning:  "text-warning",
  danger:   "text-danger",
  neutral:  "text-text-secondary",
}

interface FlagsListProps {
  flags: InvestmentFlag[]
}

export function FlagsList({ flags }: FlagsListProps) {
  if (flags.length === 0) {
    return (
      <p className="text-sm text-text-muted">No flags generated yet.</p>
    )
  }

  const sorted = [
    ...flags.filter((f) => f.severity === "danger"),
    ...flags.filter((f) => f.severity === "warning"),
    ...flags.filter((f) => f.severity === "positive"),
    ...flags.filter((f) => f.severity === "neutral"),
  ]

  return (
    <ul className="space-y-2">
      {sorted.map((flag, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotStyle[flag.severity]}`}
          />
          <span className={`text-sm ${labelStyle[flag.severity]}`}>
            {flag.label}
          </span>
        </li>
      ))}
    </ul>
  )
}
