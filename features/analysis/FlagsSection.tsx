"use client"

import { formatEUR } from "@/lib/format"
import type { AnalyseResponse } from "@/types/api"

type FlagLevel = "ok" | "warn" | "bad" | "info"

interface Flag {
  level: FlagLevel
  text: string
}

function buildFlags(r: AnalyseResponse): Flag[] {
  const flags: Flag[] = []

  // Net yield
  if (r.net_yield_pct >= 3.5) {
    flags.push({ level: "ok", text: `Net yield ${r.net_yield_pct.toFixed(1)}% — above threshold` })
  } else if (r.net_yield_pct >= 2.5) {
    flags.push({ level: "warn", text: `Net yield ${r.net_yield_pct.toFixed(1)}% — below 3.5% target` })
  } else {
    flags.push({ level: "bad", text: `Net yield ${r.net_yield_pct.toFixed(1)}% — low return` })
  }

  // KPF
  if (r.kpf < 22) {
    flags.push({ level: "ok", text: `Kaufpreisfaktor ${r.kpf.toFixed(1)}× — fair value` })
  } else if (r.kpf < 28) {
    flags.push({ level: "warn", text: `Kaufpreisfaktor ${r.kpf.toFixed(1)}× — above 22× threshold` })
  } else {
    flags.push({ level: "bad", text: `Kaufpreisfaktor ${r.kpf.toFixed(1)}× — above 28× threshold` })
  }

  // Cash flow
  if (r.cash_flow_monthly_yr1 >= 0) {
    flags.push({ level: "ok", text: `Cashflow positive (Yr 1)` })
  } else if (r.cash_flow_monthly_yr1 >= -200) {
    flags.push({ level: "warn", text: `Cashflow slightly negative: ${formatEUR(r.cash_flow_monthly_yr1)}/mo (Yr 1)` })
  } else {
    flags.push({ level: "bad", text: `Cashflow negative: ${formatEUR(r.cash_flow_monthly_yr1)}/mo (Yr 1)` })
  }

  // LTV
  if (r.ltv_pct != null) {
    if (r.ltv_pct < 80) {
      flags.push({ level: "ok", text: `LTV ${r.ltv_pct.toFixed(0)}% — within safe range` })
    } else if (r.ltv_pct < 90) {
      flags.push({ level: "warn", text: `LTV ${r.ltv_pct.toFixed(0)}% — above 80% threshold` })
    } else {
      flags.push({ level: "bad", text: `LTV ${r.ltv_pct.toFixed(0)}% — high leverage` })
    }
  }

  // AfA info
  if (r.afa_tax_saving_yr1 != null && r.afa_tax_saving_yr1 > 0) {
    flags.push({
      level: "info",
      text: `AfA tax saving: ${formatEUR(r.afa_tax_saving_yr1)}/yr`,
    })
  }

  return flags
}

const LEVEL_ICON: Record<FlagLevel, string> = {
  ok: "✓",
  warn: "⚠",
  bad: "✕",
  info: "ℹ",
}

const LEVEL_COLOR: Record<FlagLevel, string> = {
  ok: "text-success",
  warn: "text-warning",
  bad: "text-danger",
  info: "text-brand",
}

interface FlagsSectionProps {
  result: AnalyseResponse
}

export function FlagsSection({ result }: FlagsSectionProps) {
  const flags = buildFlags(result)

  return (
    <div className="space-y-1.5">
      {flags.map((flag, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className={`mt-0.5 shrink-0 font-bold ${LEVEL_COLOR[flag.level]}`}>
            {LEVEL_ICON[flag.level]}
          </span>
          <span className="text-text-secondary">{flag.text}</span>
        </div>
      ))}
    </div>
  )
}
