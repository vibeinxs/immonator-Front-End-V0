"use client"

import { formatEUR } from "@/lib/format"
import { useLocale } from "@/lib/i18n/locale-context"
import type { AnalyseResponse } from "@/types/api"

type FlagLevel = "ok" | "warn" | "bad" | "info"

interface Flag {
  level: FlagLevel
  text: string
}

const FLAG_THRESHOLDS = {
  NET_YIELD_OK: 3.5,
  NET_YIELD_WARN: 2.5,
  KPF_OK: 22,
  KPF_WARN: 28,
  CASHFLOW_OK: 0,
  CASHFLOW_WARN: -200,
  LTV_OK: 80,
  LTV_WARN: 90,
} as const

function buildFlags(r: AnalyseResponse, locale: "en" | "de"): Flag[] {
  const flags: Flag[] = []

  if (locale === "de") {
    if (r.net_yield_pct >= FLAG_THRESHOLDS.NET_YIELD_OK) flags.push({ level: "ok", text: `Nettorendite ${r.net_yield_pct.toFixed(1)}% — über Zielwert` })
    else if (r.net_yield_pct >= FLAG_THRESHOLDS.NET_YIELD_WARN) flags.push({ level: "warn", text: `Nettorendite ${r.net_yield_pct.toFixed(1)}% — unter ${FLAG_THRESHOLDS.NET_YIELD_OK}% Ziel` })
    else flags.push({ level: "bad", text: `Nettorendite ${r.net_yield_pct.toFixed(1)}% — niedrige Rendite` })

    if (r.kpf < FLAG_THRESHOLDS.KPF_OK) flags.push({ level: "ok", text: `Kaufpreisfaktor ${r.kpf.toFixed(1)}× — fair bewertet` })
    else if (r.kpf < FLAG_THRESHOLDS.KPF_WARN) flags.push({ level: "warn", text: `Kaufpreisfaktor ${r.kpf.toFixed(1)}× — über ${FLAG_THRESHOLDS.KPF_OK}× Schwelle` })
    else flags.push({ level: "bad", text: `Kaufpreisfaktor ${r.kpf.toFixed(1)}× — über ${FLAG_THRESHOLDS.KPF_WARN}× Schwelle` })

    if (r.cash_flow_monthly_yr1 >= FLAG_THRESHOLDS.CASHFLOW_OK) flags.push({ level: "ok", text: "Cashflow positiv (Jahr 1)" })
    else if (r.cash_flow_monthly_yr1 >= FLAG_THRESHOLDS.CASHFLOW_WARN) flags.push({ level: "warn", text: `Cashflow leicht negativ: ${formatEUR(r.cash_flow_monthly_yr1)}/Monat (Jahr 1)` })
    else flags.push({ level: "bad", text: `Cashflow negativ: ${formatEUR(r.cash_flow_monthly_yr1)}/Monat (Jahr 1)` })

    if (r.ltv_pct != null) {
      if (r.ltv_pct < FLAG_THRESHOLDS.LTV_OK) flags.push({ level: "ok", text: `LTV ${r.ltv_pct.toFixed(0)}% — im sicheren Bereich` })
      else if (r.ltv_pct < FLAG_THRESHOLDS.LTV_WARN) flags.push({ level: "warn", text: `LTV ${r.ltv_pct.toFixed(0)}% — über ${FLAG_THRESHOLDS.LTV_OK}% Schwelle` })
      else flags.push({ level: "bad", text: `LTV ${r.ltv_pct.toFixed(0)}% — hohe Hebelwirkung` })
    }

    if (r.afa_tax_saving_yr1 != null && r.afa_tax_saving_yr1 > 0) flags.push({ level: "info", text: `AfA Steuerersparnis: ${formatEUR(r.afa_tax_saving_yr1)}/Jahr` })

    return flags
  }

  if (r.net_yield_pct >= FLAG_THRESHOLDS.NET_YIELD_OK) flags.push({ level: "ok", text: "Net Yield is on target" })
  else flags.push({ level: "bad", text: "Net Yield is below target" })

  if (r.kpf < FLAG_THRESHOLDS.KPF_OK) flags.push({ level: "ok", text: "Purchase Factor is within target" })
  else flags.push({ level: "bad", text: "Purchase Factor is above target" })

  if (r.cash_flow_monthly_yr1 >= FLAG_THRESHOLDS.CASHFLOW_OK) flags.push({ level: "ok", text: "Monthly cash flow is positive in Year 1" })
  else flags.push({ level: "bad", text: "Monthly cash flow is negative in Year 1" })

  if (r.ltv_pct != null) {
    if (r.ltv_pct < FLAG_THRESHOLDS.LTV_OK) flags.push({ level: "ok", text: "Loan to Value is within the preferred range" })
    else flags.push({ level: "bad", text: "Loan to Value is above the preferred threshold" })
  }

  if (r.afa_tax_saving_yr1 != null && r.afa_tax_saving_yr1 > 0) flags.push({ level: "info", text: `Tax depreciation provides annual savings (${formatEUR(r.afa_tax_saving_yr1)})` })

  return flags
}

const LEVEL_DOT: Record<FlagLevel, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  bad: "bg-danger",
  info: "bg-brand",
}

interface FlagsSectionProps {
  result: AnalyseResponse
}

export function FlagsSection({ result }: FlagsSectionProps) {
  const { locale } = useLocale()
  const flags = buildFlags(result, locale)

  return (
    <div className="space-y-2">
      {flags.map((flag) => (
        <div key={flag.text} className="flex items-start gap-2 text-sm">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[flag.level]}`} />
          <span className="text-text-secondary">{flag.text}</span>
        </div>
      ))}
    </div>
  )
}
