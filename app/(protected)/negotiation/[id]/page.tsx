"use client"

import { use, useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react"
import { immoApi } from "@/lib/immonatorApi"
import { AnalysisChat } from "@/components/chat/AnalysisChat"
import { EUR } from "@/lib/utils"
import type { NegotiationBrief } from "@/types/api"

/* ── Brief display ──────────────────────────────────── */

function BriefDisplay({ brief, propertyId }: { brief: NegotiationBrief; propertyId: string }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Price targets */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-[14px] border border-success/30 bg-success-bg/30 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Recommended Offer
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-success">
            {brief.recommended_offer != null ? `${EUR}${brief.recommended_offer.toLocaleString("de-DE")}` : "—"}
          </p>
        </div>
        <div className="rounded-[14px] border border-danger/30 bg-danger-bg/30 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Walk-Away Price
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-danger">
            {brief.walk_away_price != null ? `${EUR}${brief.walk_away_price.toLocaleString("de-DE")}` : "—"}
          </p>
        </div>
      </div>

      {/* Strategy */}
      {brief.strategy && (
        <div className="rounded-[14px] border border-border-default bg-bg-surface p-5">
          <h3 className="mb-2 font-serif text-base text-text-primary">Strategy</h3>
          <p className="text-sm leading-relaxed text-text-secondary">{brief.strategy}</p>
        </div>
      )}

      {/* Leverage points */}
      {brief.leverage_points?.length > 0 && (
        <div className="rounded-[14px] border border-border-default bg-bg-surface p-5">
          <h3 className="mb-3 font-serif text-base text-text-primary">Leverage Points</h3>
          <ul className="space-y-2">
            {brief.leverage_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="mt-0.5 text-brand">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Talking points */}
      {(brief.talking_points_de?.length > 0 || brief.talking_points_en?.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {brief.talking_points_de?.length > 0 && (
            <div className="rounded-[14px] border border-border-default bg-bg-surface p-5">
              <h3 className="mb-3 font-serif text-base text-text-primary">Talking Points (DE)</h3>
              <ul className="space-y-2">
                {brief.talking_points_de.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="mt-0.5 text-brand">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {brief.talking_points_en?.length > 0 && (
            <div className="rounded-[14px] border border-border-default bg-bg-surface p-5">
              <h3 className="mb-3 font-serif text-base text-text-primary">Talking Points (EN)</h3>
              <ul className="space-y-2">
                {brief.talking_points_en.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="mt-0.5 text-brand">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Offer letter draft */}
      {brief.offer_letter_draft && (
        <div className="rounded-[14px] border border-border-default bg-bg-surface p-5">
          <h3 className="mb-3 font-serif text-base text-text-primary">Offer Letter Draft</h3>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary">
            {brief.offer_letter_draft}
          </pre>
        </div>
      )}

      {/* AI Chat for follow-up questions */}
      <div className="rounded-[14px] border border-border-default bg-bg-surface p-5">
        <h3 className="mb-3 font-serif text-base text-text-primary">Ask the AI</h3>
        <AnalysisChat
          contextType="property"
          contextId={propertyId}
          title="negotiation"
        />
      </div>
    </div>
  )
}

/* ── Loading state ──────────────────────────────────── */

function BriefLoading({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[14px] border border-dashed border-border-default bg-bg-elevated py-16 text-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────── */

export default function NegotiationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [brief, setBrief] = useState<NegotiationBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBrief = useCallback(async () => {
    const { data, error: err } = await immoApi.getNegotiationBrief(id)
    if (data?.brief) {
      setBrief(data.brief)
      setLoading(false)
      return true
    }
    if (err && err !== "Not found") {
      setError(err)
      setLoading(false)
    }
    return false
  }, [id])

  const generateBrief = useCallback(async () => {
    setGenerating(true)
    setError(null)

    const { data, error: err } = await immoApi.generateNegotiationBrief(id)
    if (data?.brief) {
      setBrief(data.brief)
      setGenerating(false)
      setLoading(false)
      return
    }
    if (err) {
      setError(err)
      setGenerating(false)
      setLoading(false)
      return
    }

    // Poll until ready (backend may generate async)
    let attempts = 0
    const poll = async () => {
      if (attempts++ > 20) {
        setError("Brief generation timed out — please try again")
        setGenerating(false)
        setLoading(false)
        return
      }
      const done = await fetchBrief()
      if (!done) setTimeout(poll, 3000)
      else setGenerating(false)
    }
    poll()
  }, [id, fetchBrief])

  // On mount: try to fetch existing brief first
  useEffect(() => {
    fetchBrief().then((found) => {
      if (!found) {
        // No brief yet — auto-generate on first load
        generateBrief()
      }
    })
  }, [fetchBrief, generateBrief])

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Back link */}
      <Link
        href={`/properties/${id}`}
        className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Property
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[26px] text-text-primary">Negotiation Brief</h1>
          <p className="mt-1 text-sm text-text-secondary">
            AI-generated strategy and talking points
          </p>
        </div>
        {brief && !generating && (
          <button
            onClick={generateBrief}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </button>
        )}
      </div>

      {/* Content */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3">
          <AlertCircle className="h-4 w-4 text-danger" />
          <p className="text-sm text-danger">{error}</p>
          <button
            onClick={generateBrief}
            className="ml-auto text-xs font-medium text-brand hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {generating && (
        <BriefLoading message="Generating your negotiation brief — this takes 10–30 seconds…" />
      )}

      {!generating && loading && !error && (
        <BriefLoading message="Loading brief…" />
      )}

      {!generating && !loading && brief && (
        <BriefDisplay brief={brief} propertyId={id} />
      )}
    </div>
  )
}
