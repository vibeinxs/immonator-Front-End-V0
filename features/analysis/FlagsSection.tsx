"use client"

import { useLocale } from "@/lib/i18n/locale-context"
import type { AnalyseResponse } from "@/types/api"

type FlagLevel = "ok" | "warn" | "bad" | "info"

interface Flag {
  level: FlagLevel
  text: string
}

const FLAG_THRESHOLDS = {
  NET_YIELD_OK: 3.5,
  KPF_OK: 22,
  CASHFLOW_OK: 0,
  LTV_OK: 80,
} as const

function buildFlags(r: AnalyseResponse, t: (key: string) => string): Flag[] {
  const flags: Flag[] = []

  if (r.net_yield_pct >= FLAG_THRESHOLDS.NET_YIELD_OK) flags.push({ level: "ok", text: t("analyse.flags.netYieldOnTarget") })
  else flags.push({ level: "bad", text: t("analyse.flags.netYieldBelowTarget") })

  if (r.kpf < FLAG_THRESHOLDS.KPF_OK) flags.push({ level: "ok", text: t("analyse.flags.purchaseFactorWithinTarget") })
  else flags.push({ level: "bad", text: t("analyse.flags.purchaseFactorAboveTarget") })

  if (r.cash_flow_monthly_yr1 >= FLAG_THRESHOLDS.CASHFLOW_OK) flags.push({ level: "ok", text: t("analyse.flags.cashFlowPositiveYear1") })
  else flags.push({ level: "bad", text: t("analyse.flags.cashFlowNegativeYear1") })

  if (r.ltv_pct != null) {
    if (r.ltv_pct < FLAG_THRESHOLDS.LTV_OK) flags.push({ level: "ok", text: t("analyse.flags.ltvWithinThreshold") })
    else flags.push({ level: "bad", text: t("analyse.flags.ltvAboveThreshold") })
  }

  if (r.afa_tax_saving_yr1 != null && r.afa_tax_saving_yr1 > 0) {
    flags.push({ level: "info", text: t("analyse.flags.taxDepreciationSavings") })
  }

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
  const { t } = useLocale()
  const flags = buildFlags(result, t)

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
