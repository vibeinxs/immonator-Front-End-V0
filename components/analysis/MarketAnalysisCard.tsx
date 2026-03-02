"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { EUR } from "@/lib/utils"
import Link from "next/link"

interface MarketStats {
  avg_price_per_sqm: number
  avg_yield: number
  avg_days_on_market: number
  temperature: "hot" | "warm" | "neutral"
}

interface MarketAI {
  headline: string
}

const tempStyle: Record<string, { bg: string; text: string; label: string }> = {
  hot:     { bg: "bg-danger-bg",  text: "text-danger",  label: "Hot" },
  warm:    { bg: "bg-warning-bg", text: "text-warning", label: "Warm" },
  neutral: { bg: "bg-brand-subtle", text: "text-brand", label: "Neutral" },
}

export function MarketAnalysisCard({ city }: { city: string }) {
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [ai, setAI] = useState<MarketAI | null>(null)

  useEffect(() => {
    api.get<MarketStats>(`/api/analysis/market/${city}/stats`).then(({ data }) => {
      if (data) setStats(data)
    })
    api.get<MarketAI>(`/api/analysis/market/${city}`).then(({ data }) => {
      if (data) setAI(data)
    })
  }, [city])

  const temp = stats ? tempStyle[stats.temperature] || tempStyle.neutral : null

  return (
    <div
      className="rounded-xl border border-border bg-white p-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">{city} Market</span>
        {temp && (
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${temp.bg} ${temp.text}`}>
            {temp.label}
          </span>
        )}
      </div>

      {stats && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-bg-elevated px-2.5 py-1 font-mono text-xs text-text-secondary">
            Avg {EUR}/m{String.fromCharCode(178)}: {stats.avg_price_per_sqm.toLocaleString("de-DE")}
          </span>
          <span className="rounded-lg bg-bg-elevated px-2.5 py-1 font-mono text-xs text-text-secondary">
            Avg Yield: {stats.avg_yield.toFixed(1)}%
          </span>
          <span className="rounded-lg bg-bg-elevated px-2.5 py-1 font-mono text-xs text-text-secondary">
            Avg {stats.avg_days_on_market} days
          </span>
        </div>
      )}

      {ai && (
        <p className="mt-3 text-xs italic text-text-secondary">{ai.headline}</p>
      )}

      <Link
        href={`/market/${city.toLowerCase()}`}
        className="mt-3 inline-block text-xs text-brand hover:underline"
      >
        {"View Full Report →"}
      </Link>
    </div>
  )
}
