"use client"

import { useEffect, useState } from "react"
import { immoApi } from "@/lib/immonatorApi"
import { EUR } from "@/lib/utils"
import Link from "next/link"

interface MarketStats {
  avg_price_per_sqm: number
  avg_days_on_market: number
  total_listings: number
}

interface MarketAI {
  analysis: {
    headline?: string
  }
}

export function MarketAnalysisCard({ city }: { city: string }) {
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [ai, setAI] = useState<MarketAI | null>(null)

  useEffect(() => {
    immoApi.getMarketStats(city).then(({ data }) => {
      if (data) setStats(data as unknown as MarketStats)
    })
    immoApi.getMarketAnalysis(city).then(({ data }) => {
      if (data) setAI(data as unknown as MarketAI)
    })
  }, [city])

  return (
    <div
      className="rounded-xl border border-border bg-white p-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">{city} Market</span>
        {stats && (
          <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-[10px] font-bold uppercase text-text-secondary">
            {stats.total_listings} listings
          </span>
        )}
      </div>

      {stats && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-bg-elevated px-2.5 py-1 font-mono text-xs text-text-secondary">
            Avg {EUR}/m{String.fromCharCode(178)}: {stats.avg_price_per_sqm.toLocaleString("de-DE")}
          </span>
          <span className="rounded-lg bg-bg-elevated px-2.5 py-1 font-mono text-xs text-text-secondary">
            Avg {stats.avg_days_on_market} days
          </span>
        </div>
      )}

      {ai?.analysis?.headline && (
        <p className="mt-3 text-xs italic text-text-secondary">{ai.analysis.headline}</p>
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
