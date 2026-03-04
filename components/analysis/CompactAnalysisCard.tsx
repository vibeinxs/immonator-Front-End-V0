"use client"

import { useEffect, useState, useRef } from "react"
import { immoApi } from "@/lib/immonatorApi"
import { VerdictBadge } from "@/components/verdict-badge"
import { copy } from "@/lib/copy"

interface CompactData {
  verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
  confidence_score: number
  one_line_summary: string
  top_3_positives: string[]
  top_3_risks: string[]
}

function LoadingState() {
  const [dots, setDots] = useState(".")
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."))
    }, 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-36 flex-col items-center justify-center">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 animate-pulse rounded-full bg-brand"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-text-muted">
        {copy.analysis.analysingText.replace(/\.+$/, "")}{dots}
      </p>
    </div>
  )
}

export function CompactAnalysisCard({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<CompactData | null>(null)
  const [loading, setLoading] = useState(true)
  const badgeRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let polling = true

    async function fetchData() {
      const { data: result } = await immoApi.getCompactAnalysis(propertyId) as {
        data: { status: string; analysis?: CompactData | null } | null
      }
      if (!polling) return

      if (!result) {
        setLoading(false)
        return
      }

      if (result.status === "generated" && result.analysis?.verdict) {
        setData({
          verdict: result.analysis.verdict || "worth_analysing",
          confidence_score: Number(result.analysis.confidence_score ?? 0),
          one_line_summary: result.analysis.one_line_summary ?? "—",
          top_3_positives: result.analysis.top_3_positives ?? [],
          top_3_risks: result.analysis.top_3_risks ?? [],
        })
        setLoading(false)
        return
      }

      if (result.status === "not_generated") {
        setTimeout(fetchData, 3000)
        return
      }

      setLoading(false)
    }

    fetchData()
    return () => { polling = false }
  }, [propertyId])

  // Pulse badge once on mount
  useEffect(() => {
    if (data && !badgeRef.current && cardRef.current) {
      badgeRef.current = true
      const badge = cardRef.current.querySelector("[data-slot='verdict-badge']")
      if (badge) {
        badge.classList.add("animate-pulse-badge")
      }
    }
  }, [data])

  if (loading) return <LoadingState />

  if (!data) return null

  return (
    <div
      ref={cardRef}
      className="rounded-xl border border-border bg-white p-5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between">
        <VerdictBadge verdict={data.verdict} data-slot="verdict-badge" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {copy.analysis.confidence} {data.confidence_score}{copy.analysis.confidenceScale}
          </span>
          <div className="h-1.5 w-16 rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${data.confidence_score * 10}%` }}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-base font-semibold text-text-primary">
        {data.one_line_summary}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {copy.analysis.positives}
          </p>
          <div className="space-y-1.5">
            {data.top_3_positives.map((p, i) => (
              <p key={i} className="text-sm text-text-primary">
                <span className="text-success">{"✓ "}</span>{p}
              </p>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {copy.analysis.risks}
          </p>
          <div className="space-y-1.5">
            {data.top_3_risks.map((r, i) => (
              <p key={i} className="text-sm text-text-primary">
                <span className="text-warning">{"⚠ "}</span>{r}
              </p>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-right text-[11px] text-text-muted">
        {copy.analysis.aiLabel} {String.fromCharCode(183)} {copy.analysis.aiJustNow}
      </p>
    </div>
  )
}
