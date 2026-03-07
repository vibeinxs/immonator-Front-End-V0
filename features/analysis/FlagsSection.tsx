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

const LEVEL_DOT: Record<FlagLevel, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  bad: "bg-danger",
  info: "bg-brand",
}

function buildFlags(r: AnalyseResponse, t: (key: string) => string): Flag[] {
  const tf = (key: string, vars: Record<string, string | number>) => {
    let text = t(key)
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replaceAll(`{${k}}`, String(v))
    })
    return text
  }

  const flags: Flag[] = []

  if (r.net_yield_pct >= FLAG_THRESHOLDS.NET_YIELD_OK) {
    flags.push({ level: "ok", text: tf("analyse.flags.netYield.ok", { value: r.net_yield_pct.toFixed(1) }) })
  } else if (r.net_yield_pct >= FLAG_THRESHOLDS.NET_YIELD_WARN) {
    flags.push({ level: "warn", text: tf("analyse.flags.netYield.warn", { value: r.net_yield_pct.toFixed(1), target: FLAG_THRESHOLDS.NET_YIELD_OK }) })
  } else {
    flags.push({ level: "bad", text: tf("analyse.flags.netYield.bad", { value: r.net_yield_pct.toFixed(1) }) })
  }

  if (r.kpf < FLAG_THRESHOLDS.KPF_OK) {
    flags.push({ level: "ok", text: tf("analyse.flags.kpf.ok", { value: r.kpf.toFixed(1) }) })
  } else if (r.kpf < FLAG_THRESHOLDS.KPF_WARN) {
    flags.push({ level: "warn", text: tf("analyse.flags.kpf.warn", { value: r.kpf.toFixed(1), target: FLAG_THRESHOLDS.KPF_OK }) })
  } else {
    flags.push({ level: "bad", text: tf("analyse.flags.kpf.bad", { value: r.kpf.toFixed(1), target: FLAG_THRESHOLDS.KPF_WARN }) })
  }

  if (r.cash_flow_monthly_yr1 >= FLAG_THRESHOLDS.CASHFLOW_OK) {
    flags.push({ level: "ok", text: t("analyse.flags.cashflow.ok") })
  } else if (r.cash_flow_monthly_yr1 >= FLAG_THRESHOLDS.CASHFLOW_WARN) {
    flags.push({ level: "warn", text: tf("analyse.flags.cashflow.warn", { value: formatEUR(r.cash_flow_monthly_yr1) }) })
  } else {
    flags.push({ level: "bad", text: tf("analyse.flags.cashflow.bad", { value: formatEUR(r.cash_flow_monthly_yr1) }) })
  }

  if (r.ltv_pct != null) {
    if (r.ltv_pct < FLAG_THRESHOLDS.LTV_OK) {
      flags.push({ level: "ok", text: tf("analyse.flags.ltv.ok", { value: r.ltv_pct.toFixed(0) }) })
    } else if (r.ltv_pct < FLAG_THRESHOLDS.LTV_WARN) {
      flags.push({ level: "warn", text: tf("analyse.flags.ltv.warn", { value: r.ltv_pct.toFixed(0), target: FLAG_THRESHOLDS.LTV_OK }) })
    } else {
      flags.push({ level: "bad", text: tf("analyse.flags.ltv.bad", { value: r.ltv_pct.toFixed(0) }) })
    }
  }

  if (r.afa_tax_saving_yr1 != null && r.afa_tax_saving_yr1 > 0) {
    flags.push({ level: "info", text: tf("analyse.flags.afa.info", { value: formatEUR(r.afa_tax_saving_yr1) }) })
  }

  return flags
}

interface FlagsSectionProps {
  result: AnalyseResponse
}

export function FlagsSection({ result }: FlagsSectionProps) {
  const { t } = useLocale()
  const flags = buildFlags(result, t)

  return (
    <div className="space-y-2">
      {flags.map((flag, index) => (
        <div key={`${flag.level}-${index}-${flag.text}`} className="flex items-start gap-2 text-sm">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[flag.level]}`} />
          <span className="text-text-secondary">{flag.text}</span>
        </div>
      ))}
    </div>
  )
}
