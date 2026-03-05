"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, X } from "lucide-react"
import { useCompare } from "@/store/compareStore"
import { immoApi, getCompactAnalysis } from "@/lib/immonatorApi"
import { VerdictBadge } from "@/components/verdict-badge"
import { EUR } from "@/lib/utils"
import type { Property } from "@/types/api"

/* ── Types ─────────────────────────────────────────── */

interface CompactSummary {
  verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
  confidence_score: number
  one_line_summary: string
  top_3_positives: string[]
  top_3_risks: string[]
}

interface CompareSlot {
  property: Property | null
  compact: CompactSummary | null
  loading: boolean
  error: string | null
}

/* ── Helpers ────────────────────────────────────────── */

function fmt(value: number | null | undefined, decimals = 0, suffix = "") {
  if (value == null) return "—"
  return value.toLocaleString("de-DE", { maximumFractionDigits: decimals }) + suffix
}

function fmtEur(value: number | null | undefined) {
  if (value == null) return "—"
  return EUR + value.toLocaleString("de-DE")
}

function fmtPct(value: number | null | undefined) {
  if (value == null) return "—"
  return value.toFixed(1) + "%"
}

/* ── KPI row ────────────────────────────────────────── */

function KpiRow({
  label,
  values,
  highlight,
  format,
}: {
  label: string
  values: (string | null)[]
  highlight?: (v: string | null) => boolean
  format?: "default" | "mono"
}) {
  return (
    <tr className="border-b border-border-default">
      <td className="py-3 pr-4 text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`py-3 text-center text-sm font-semibold ${
            format === "mono" ? "font-mono" : ""
          } ${highlight && highlight(v) ? "text-success" : "text-text-primary"}`}
        >
          {v ?? "—"}
        </td>
      ))}
    </tr>
  )
}

/* ── Slot card ──────────────────────────────────────── */

function SlotCard({
  slot,
  onRemove,
  idx,
}: {
  slot: CompareSlot
  onRemove: () => void
  idx: number
}) {
  if (slot.loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-[14px] border border-border-default bg-bg-surface">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  if (slot.error || !slot.property) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-border-default bg-bg-elevated text-sm text-text-muted">
        <span>Failed to load property</span>
        <button onClick={onRemove} className="text-xs text-brand hover:underline">
          Remove
        </button>
      </div>
    )
  }

  const p = slot.property

  return (
    <div className="relative rounded-[14px] border border-border-default bg-bg-surface p-5">
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 text-text-muted hover:text-text-primary"
        aria-label="Remove from compare"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Image thumbnail */}
      <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-bg-elevated">
        {p.images_urls?.[0] ? (
          <img
            src={p.images_urls[0]}
            alt={p.title}
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">🏢</div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/properties/${p.id}`}
            className="line-clamp-2 text-sm font-semibold text-text-primary hover:text-brand"
          >
            {p.title}
          </Link>
          <p className="mt-0.5 text-xs text-text-muted">
            {p.city}{p.zip_code ? `, ${p.zip_code}` : ""}
          </p>
        </div>
        {slot.compact && <VerdictBadge verdict={slot.compact.verdict} />}
      </div>

      {slot.compact && (
        <p className="mt-2 line-clamp-2 text-[11px] italic text-text-secondary">
          {slot.compact.one_line_summary}
        </p>
      )}
    </div>
  )
}

/* ── Empty state ────────────────────────────────────── */

function EmptyCompare() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[14px] border border-dashed border-border-default bg-bg-elevated py-20 text-center">
      <p className="font-serif text-xl text-text-primary">No properties selected</p>
      <p className="max-w-xs text-sm text-text-secondary">
        Select 2 properties from the Properties page using the compare icon
        to see a side-by-side analysis.
      </p>
      <Link
        href="/properties"
        className="mt-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Browse Properties →
      </Link>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────── */

export default function ComparePage() {
  const { ids, remove } = useCompare()
  const [slots, setSlots] = useState<CompareSlot[]>([])

  // Fetch data for each selected property
  useEffect(() => {
    if (ids.length === 0) {
      setSlots([])
      return
    }

    // Initialize loading slots
    setSlots(ids.map(() => ({ property: null, compact: null, loading: true, error: null })))

    ids.forEach(async (id, idx) => {
      try {
        const [propRes, compactRes] = await Promise.all([
          immoApi.fetchPropertyById(id),
          getCompactAnalysis(id),
        ])

        const compact =
          compactRes.data?.status === "generated" && compactRes.data?.analysis?.verdict
            ? {
                verdict: compactRes.data.analysis.verdict,
                confidence_score: Number(compactRes.data.analysis.confidence_score ?? 0),
                one_line_summary: compactRes.data.analysis.one_line_summary ?? "—",
                top_3_positives: compactRes.data.analysis.top_3_positives ?? [],
                top_3_risks: compactRes.data.analysis.top_3_risks ?? [],
              }
            : null

        setSlots((prev) => {
          const next = [...prev]
          next[idx] = {
            property: propRes.data ?? null,
            compact,
            loading: false,
            error: propRes.error,
          }
          return next
        })
      } catch {
        setSlots((prev) => {
          const next = [...prev]
          next[idx] = { property: null, compact: null, loading: false, error: "Failed to load" }
          return next
        })
      }
    })
  }, [ids])

  const colCount = ids.length
  const loaded = slots.filter((s) => !s.loading && s.property)

  // Build KPI comparison values per property
  const getKpis = (slot: CompareSlot) => {
    const p = slot.property
    if (!p) return null
    return {
      price: fmtEur(p.asking_price),
      pricePerSqm: p.price_per_sqm ? `${EUR}${Math.round(p.price_per_sqm).toLocaleString("de-DE")}/m²` : "—",
      grossYield: fmtPct((p as any).gross_yield ?? (p as any).gross_yield_pct),
      sqm: fmt(p.living_area_sqm, 0, " m²"),
      rooms: fmt(p.rooms, 0),
      yearBuilt: p.year_built ? String(p.year_built) : "—",
      daysListed: fmt(p.days_on_market, 0, " days"),
      rent: fmtEur(p.monthly_rent),
      confidence: slot.compact ? `${slot.compact.confidence_score}/10` : "—",
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Back link */}
      <Link
        href="/properties"
        className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Properties
      </Link>

      <div>
        <h1 className="font-serif text-[26px] text-text-primary">Compare Properties</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Side-by-side comparison of key metrics
        </p>
      </div>

      {ids.length === 0 ? (
        <EmptyCompare />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Property header cards */}
          <div className={`grid gap-4 ${colCount >= 2 ? "grid-cols-2" : "grid-cols-1 max-w-sm"}`}>
            {slots.map((slot, i) => (
              <SlotCard
                key={ids[i]}
                slot={slot}
                idx={i}
                onRemove={() => remove(ids[i])}
              />
            ))}
          </div>

          {/* KPI comparison table — shown once at least 1 loaded */}
          {loaded.length > 0 && (
            <div className="overflow-x-auto rounded-[14px] border border-border-default bg-bg-surface">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default bg-bg-elevated">
                    <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Metric
                    </th>
                    {slots.map((_, i) => (
                      <th key={i} className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Property {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default px-4">
                  {[
                    { label: "Asking Price", key: "price", format: "mono" as const },
                    { label: "Price / m²", key: "pricePerSqm", format: "mono" as const },
                    { label: "Gross Yield", key: "grossYield", format: "mono" as const },
                    { label: "Area", key: "sqm" },
                    { label: "Rooms", key: "rooms" },
                    { label: "Year Built", key: "yearBuilt" },
                    { label: "Days Listed", key: "daysListed" },
                    { label: "Monthly Rent", key: "rent", format: "mono" as const },
                    { label: "AI Confidence", key: "confidence" },
                  ].map((row) => (
                    <KpiRow
                      key={row.label}
                      label={row.label}
                      values={slots.map((s) => getKpis(s)?.[row.key as keyof ReturnType<typeof getKpis>] ?? "—")}
                      format={row.format}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* AI verdict comparison */}
          {loaded.some((s) => s.compact) && (
            <div className={`grid gap-4 ${colCount >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {slots.map((slot, i) => (
                slot.compact && (
                  <div key={i} className="rounded-[14px] border border-border-default bg-bg-surface p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Property {i + 1} · AI Verdict
                      </p>
                      <VerdictBadge verdict={slot.compact.verdict} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                          Positives
                        </p>
                        {slot.compact.top_3_positives.map((p, j) => (
                          <p key={j} className="text-xs text-text-primary">
                            <span className="text-success">✓ </span>{p}
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                          Risks
                        </p>
                        {slot.compact.top_3_risks.map((r, j) => (
                          <p key={j} className="text-xs text-text-primary">
                            <span className="text-warning">⚠ </span>{r}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Links to full detail */}
          {loaded.length > 0 && (
            <div className={`grid gap-4 ${colCount >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {slots.map((slot, i) =>
                slot.property ? (
                  <Link
                    key={i}
                    href={`/properties/${slot.property.id}`}
                    className="flex items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand-subtle py-2.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-colors"
                  >
                    View Full Analysis →
                  </Link>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
