"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { ChevronDown, Lock } from "lucide-react"
import { immoApi } from "@/lib/immonatorApi"
import { EUR } from "@/lib/utils"
import { VerdictBadge } from "@/components/verdict-badge"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { copy } from "@/lib/copy"

/* ── Types ─────────────────────────────────────────────── */

interface HiddenCost {
  item: string
  cost: string
}

interface RiskRow {
  risk: string
  severity: "low" | "medium" | "high" | "critical"
  mitigation: string
}

interface FinancingScenario {
  label: string
  ltv: string
  monthly_payment: string
  monthly_cashflow: string
  cashflow_positive: boolean
  equity_needed: string
}

interface DeepData {
  verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
  headline: string
  key_insight: string
  if_my_money: string
  strengths: string[]
  weaknesses: string[]
  hidden_costs: HiddenCost[]
  asking_price: number
  ertragswert: number
  sachwert: number
  is_fairly_priced: boolean
  valuation_commentary: string
  bull_case: string
  base_case: string
  bear_case: string
  overall_risk_level: "low" | "medium" | "high" | "critical"
  deal_breakers: string[]
  risks: RiskRow[]
  scenarios: FinancingScenario[]
  kfw_programs: string[]
  market_commentary: string
  macro_risks: string[]
  action: string
  recommended_offer: number
  due_diligence: string[]
  next_steps: string[]
}

/* ── Helpers ───────────────────────────────────────────── */

const PROGRESS_STEPS = copy.analysis.progressSteps

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 20

const severityStyle: Record<string, { bg: string; text: string }> = {
  low:      { bg: "bg-success-bg", text: "text-success" },
  medium:   { bg: "bg-warning-bg", text: "text-warning" },
  high:     { bg: "bg-danger-bg",  text: "text-danger" },
  critical: { bg: "bg-danger-bg",  text: "text-danger" },
}

function formatEur(n: number) {
  return EUR + n.toLocaleString("de-DE")
}

const VERDICTS = new Set<DeepData["verdict"]>(["strong_buy", "worth_analysing", "proceed_with_caution", "avoid"])
const RISK_LEVELS = new Set<DeepData["overall_risk_level"]>(["low", "medium", "high", "critical"])

function parseVerdict(v: unknown): DeepData["verdict"] {
  return VERDICTS.has(v as DeepData["verdict"]) ? (v as DeepData["verdict"]) : "worth_analysing"
}
function parseRiskLevel(v: unknown): DeepData["overall_risk_level"] {
  return RISK_LEVELS.has(v as DeepData["overall_risk_level"]) ? (v as DeepData["overall_risk_level"]) : "medium"
}

function parseDeepData(result: Record<string, unknown>): DeepData {
  const analysis = (result.analysis as Record<string, unknown>) ?? {}
  const metrics  = (result.calculated_metrics as Record<string, unknown>) ?? {}
  const m = { ...analysis, ...metrics }
  return {
    verdict:             parseVerdict(m.verdict),
    headline:            (m.headline as string) ?? "—",
    key_insight:         (m.key_insight as string) ?? "—",
    if_my_money:         (m.if_my_money as string) ?? "—",
    strengths:           (m.strengths as string[]) ?? [],
    weaknesses:          (m.weaknesses as string[]) ?? [],
    hidden_costs:        (m.hidden_costs as HiddenCost[]) ?? [],
    asking_price:        Number(m.asking_price ?? 0),
    ertragswert:         Number(m.ertragswert ?? 0),
    sachwert:            Number(m.sachwert ?? 0),
    is_fairly_priced:    Boolean(m.is_fairly_priced),
    valuation_commentary:(m.valuation_commentary as string) ?? "—",
    bull_case:           (m.bull_case as string) ?? "—",
    base_case:           (m.base_case as string) ?? "—",
    bear_case:           (m.bear_case as string) ?? "—",
    overall_risk_level:  parseRiskLevel(m.overall_risk_level),
    deal_breakers:       (m.deal_breakers as string[]) ?? [],
    risks:               (m.risks as RiskRow[]) ?? [],
    scenarios:           (m.scenarios as FinancingScenario[]) ?? [],
    kfw_programs:        (m.kfw_programs as string[]) ?? [],
    market_commentary:   (m.market_commentary as string) ?? "—",
    macro_risks:         (m.macro_risks as string[]) ?? [],
    action:              (m.action as string) ?? "hold",
    recommended_offer:   Number(m.recommended_offer ?? 0),
    due_diligence:       (m.due_diligence as string[]) ?? [],
    next_steps:          (m.next_steps as string[]) ?? [],
  }
}

const ALL_OPEN = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, true]))

/* ── Component ─────────────────────────────────────────── */

export function DeepAnalysisReport({ propertyId }: { propertyId: string }) {
  const [state, setState]           = useState<"idle" | "loading" | "loaded">("idle")
  const [data, setData]             = useState<DeepData | null>(null)
  const [progress, setProgress]     = useState(0)
  const [stepIdx, setStepIdx]       = useState(0)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)
  const [pdfDialog, setPdfDialog]   = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})
  const [openSections, setOpenSections] = useState<Record<number, boolean>>(ALL_OPEN)

  const pollRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)

  // Restore due-diligence checklist state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`immo_dd_${propertyId}`)
      if (stored) setCheckedItems(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [propertyId])

  // Trigger CSS progress animation when entering loading state (0 → 85% over 15 s)
  useEffect(() => {
    if (state !== "loading") return
    // Double RAF ensures the 0% frame has painted before starting the transition
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setProgress(85))
      return () => cancelAnimationFrame(raf2)
    })
    return () => cancelAnimationFrame(raf1)
  }, [state])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current)    clearTimeout(pollRef.current)
      if (stepRef.current)    clearInterval(stepRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const saveChecked = useCallback((items: Record<number, boolean>) => {
    setCheckedItems(items)
    try { localStorage.setItem(`immo_dd_${propertyId}`, JSON.stringify(items)) } catch { /* ignore */ }
  }, [propertyId])

  const stopAll = () => {
    if (pollRef.current)    { clearTimeout(pollRef.current);    pollRef.current = null }
    if (stepRef.current)    { clearInterval(stepRef.current);   stepRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }

  const handleRun = async () => {
    setErrorMsg(null)
    setData(null)
    setState("loading")
    setProgress(0)
    setStepIdx(0)
    attemptsRef.current = 0

    // Cycle progress steps every 4 s (CSS handles the 0→85% animation via useEffect)
    stepRef.current = setInterval(() => {
      setStepIdx((s) => (s + 1) % PROGRESS_STEPS.length)
    }, 4000)

    // Trigger; backend may return a cached completed result — short-circuit if so
    const { data: triggerResult, error: triggerError } = await immoApi.triggerDeepAnalysis(propertyId) as unknown as {
      data: { analysis?: Record<string, unknown>; calculated_metrics?: Record<string, unknown> } | null
      error?: unknown
    }

    if (triggerError || !triggerResult) {
      stopAll()
      setProgress(0)
      setState("idle")
      setErrorMsg(copy.errors.generic)
      return
    }

    if (triggerResult.analysis) {
      stopAll()
      setProgress(100)
      setData(parseDeepData(triggerResult as Record<string, unknown>))
      timeoutRef.current = setTimeout(() => setState("loaded"), 300)
      return
    }

    // Self-scheduling poll: awaits each request before scheduling the next tick,
    // preventing concurrent overlapping requests on slow connections.
    const schedulePoll = () => {
      pollRef.current = setTimeout(async () => {
        attemptsRef.current += 1

        if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
          stopAll()
          setProgress(0)
          setState("idle")
          setErrorMsg(copy.errors.generic)
          return
        }

        const { data: result } = await immoApi.getDeepAnalysis(propertyId) as unknown as {
          data: { analysis?: Record<string, unknown>; calculated_metrics?: Record<string, unknown> } | null
        }

        if (result?.analysis) {
          stopAll()
          setProgress(100)
          setData(parseDeepData(result as Record<string, unknown>))
          timeoutRef.current = setTimeout(() => setState("loaded"), 300)
          return
        }

        // Not ready yet — schedule next tick only after this request completes
        schedulePoll()
      }, POLL_INTERVAL_MS)
    }

    schedulePoll()
  }

  const toggleSection = (idx: number) =>
    setOpenSections((prev) => ({ ...prev, [idx]: !prev[idx] }))

  /* ── STATE A ─────────────────────────────────────────── */
  if (state === "idle") {
    return (
      <div className="text-center">
        {errorMsg && (
          <p className="mb-3 text-sm text-danger">{errorMsg}</p>
        )}
        <button
          onClick={handleRun}
          className="h-12 w-full rounded-xl bg-brand font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          {copy.analysis.deepAnalysisButton}
        </button>
        <p className="mt-2 text-center text-xs text-text-muted">
          {copy.analysis.deepAnalysisHint}
        </p>
      </div>
    )
  }

  /* ── STATE B ─────────────────────────────────────────── */
  if (state === "loading") {
    return (
      <div>
        <div className="h-1 w-full rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-brand"
            style={{
              width: `${progress}%`,
              transition: progress === 0 ? "none" : progress >= 100 ? "width 0.2s ease" : "width 15s linear",
            }}
          />
        </div>
        <p className="mt-3 text-center text-sm text-text-secondary">
          {PROGRESS_STEPS[stepIdx]}
        </p>
      </div>
    )
  }

  /* ── STATE C ─────────────────────────────────────────── */
  if (!data) return null

  const sections = [
    { title: copy.analysis.sectionTitles[0], key: "summary" },
    { title: copy.analysis.sectionTitles[1], key: "assessment" },
    { title: copy.analysis.sectionTitles[2], key: "valuation" },
    { title: copy.analysis.sectionTitles[3], key: "investment" },
    { title: copy.analysis.sectionTitles[4], key: "risk" },
    { title: copy.analysis.sectionTitles[5], key: "financing" },
    { title: copy.analysis.sectionTitles[6], key: "market" },
    { title: copy.analysis.sectionTitles[7], key: "action" },
  ]

  return (
    <div>
      {/* PDF Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setPdfDialog(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
        >
          <Lock className="h-3 w-3" /> {copy.analysis.downloadPdf}
        </button>
      </div>

      <Dialog open={pdfDialog} onOpenChange={setPdfDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.analysis.pdfProTitle}</DialogTitle>
            <DialogDescription>{copy.analysis.pdfProDescription}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* 8 Collapsible Sections — all open by default */}
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <Collapsible
            key={section.key}
            open={!!openSections[idx]}
            onOpenChange={() => toggleSection(idx)}
          >
            <div
              className="animate-fade-up rounded-xl border border-border bg-white"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover">
                {section.title}
                <ChevronDown
                  className={`h-4 w-4 text-text-muted transition-transform duration-200 ${openSections[idx] ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">

                {/* 1 · Executive Summary */}
                {idx === 0 && (
                  <div>
                    <VerdictBadge verdict={data.verdict} className="text-xs" />
                    <h3 className="mt-3 font-serif text-2xl text-text-primary">{data.headline}</h3>
                    <div className="mt-3 rounded-xl border-l-4 border-brand bg-bg-elevated p-4">
                      <p className="text-sm italic text-text-secondary">{data.key_insight}</p>
                    </div>
                  </div>
                )}

                {/* 2 · Strengths | Weaknesses */}
                {idx === 1 && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1.5">
                      {data.strengths.map((s, i) => (
                        <p key={i} className="text-text-primary">
                          <span className="text-success">{"✓ "}</span>{s}
                        </p>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {data.weaknesses.map((w, i) => (
                        <p key={i} className="text-text-primary">
                          <span className="text-danger">{"✗ "}</span>{w}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3 · Valuation */}
                {idx === 2 && (
                  <div>
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${data.is_fairly_priced ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
                      {data.is_fairly_priced ? copy.analysis.fairlyPriced : copy.analysis.overpriced}
                    </span>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                      {data.valuation_commentary}
                    </p>
                  </div>
                )}

                {/* 4 · Investment Case */}
                {idx === 3 && (
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl border border-success/20 bg-success-bg p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-success">BULL</p>
                      <p className="text-text-primary">{data.bull_case}</p>
                    </div>
                    <div className="rounded-xl border border-brand/20 bg-brand-subtle p-4 ring-1 ring-brand/30">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand">BASE</p>
                      <p className="text-text-primary">{data.base_case}</p>
                    </div>
                    <div className="rounded-xl border border-warning/20 bg-warning-bg p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-warning">BEAR</p>
                      <p className="text-text-primary">{data.bear_case}</p>
                    </div>
                  </div>
                )}

                {/* 5 · Risks */}
                {idx === 4 && (
                  <div>
                    <span className={`mb-3 inline-block rounded-md px-2 py-0.5 text-xs font-bold uppercase ${(severityStyle[data.overall_risk_level] ?? severityStyle.medium).bg} ${(severityStyle[data.overall_risk_level] ?? severityStyle.medium).text}`}>
                      {data.overall_risk_level} {copy.analysis.riskSuffix}
                    </span>
                    <div className="mt-2">
                      {data.risks.map((r, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0">
                          <span className="flex-1 text-text-primary">{r.risk}</span>
                          <span className={`mx-3 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${(severityStyle[r.severity] ?? severityStyle.medium).bg} ${(severityStyle[r.severity] ?? severityStyle.medium).text}`}>
                            {r.severity}
                          </span>
                          <span className="max-w-[40%] text-right text-xs text-text-secondary">{r.mitigation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6 · Financing */}
                {idx === 5 && (
                  <div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {data.scenarios.map((s, i) => (
                        <div
                          key={s.label}
                          className={`rounded-xl bg-bg-elevated p-4 ${i === 1 ? "ring-1 ring-brand" : ""}`}
                        >
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">{s.label}</p>
                          <div className="space-y-1">
                            <p className="text-text-secondary">{copy.analysis.financingLabels.ltv} <span className="font-mono text-text-primary">{s.ltv}</span></p>
                            <p className="text-text-secondary">{copy.analysis.financingLabels.payment} <span className="font-mono text-text-primary">{s.monthly_payment}</span></p>
                            <p className="text-text-secondary">{copy.analysis.financingLabels.cashflow} <span className={`font-mono ${s.cashflow_positive ? "text-success" : "text-danger"}`}>{s.monthly_cashflow}</span></p>
                            <p className="text-text-secondary">{copy.analysis.financingLabels.equity} <span className="font-mono text-text-primary">{s.equity_needed}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {data.kfw_programs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {data.kfw_programs.map((k, i) => (
                          <span key={i} className="rounded-full bg-brand-subtle px-3 py-1 text-xs text-brand">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 7 · Market Context */}
                {idx === 6 && (
                  <div>
                    <p className="text-sm leading-relaxed text-text-secondary">{data.market_commentary}</p>
                    {data.macro_risks.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {data.macro_risks.map((r, i) => (
                          <span key={i} className="rounded-full bg-warning-bg px-3 py-1 text-xs text-warning">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 8 · Action */}
                {idx === 7 && (
                  <div>
                    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold uppercase ${data.action === "buy" ? "bg-success-bg text-success" : data.action === "negotiate" ? "bg-brand-subtle text-brand" : "bg-warning-bg text-warning"}`}>
                      {data.action}
                    </span>
                    <p className="mt-2 font-serif text-4xl text-success">{formatEur(data.recommended_offer)}</p>

                    {data.due_diligence.length > 0 && (
                      <div className="mt-4 space-y-2.5">
                        {data.due_diligence.map((item, i) => (
                          <label key={i} className="flex items-center gap-2.5 text-sm text-text-primary">
                            <Checkbox
                              checked={!!checkedItems[i]}
                              onCheckedChange={(checked) => saveChecked({ ...checkedItems, [i]: !!checked })}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    )}

                    {data.next_steps.length > 0 && (
                      <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-text-secondary">
                        {data.next_steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}
