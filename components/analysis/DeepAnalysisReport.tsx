"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { ChevronDown, Lock } from "lucide-react"
import { api } from "@/lib/api"
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
  // Section 1 - Executive Summary
  verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
  headline: string
  key_insight: string
  if_my_money: string
  // Section 2 - Property Assessment
  strengths: string[]
  weaknesses: string[]
  hidden_costs: HiddenCost[]
  // Section 3 - Valuation Analysis
  asking_price: number
  ertragswert: number
  sachwert: number
  is_fairly_priced: boolean
  valuation_commentary: string
  // Section 4 - Investment Case
  bull_case: string
  base_case: string
  bear_case: string
  // Section 5 - Risk Analysis
  overall_risk_level: "low" | "medium" | "high" | "critical"
  deal_breakers: string[]
  risks: RiskRow[]
  // Section 6 - Financing
  scenarios: FinancingScenario[]
  kfw_programs: string[]
  // Section 7 - Market Context
  market_commentary: string
  macro_risks: string[]
  // Section 8 - Action
  action: string
  recommended_offer: number
  due_diligence: string[]
  next_steps: string[]
}

/* ── Helpers ───────────────────────────────────────────── */

const LOADING_MSGS = [
  "Calculating valuations...",
  "Analysing risk factors...",
  "Running financing scenarios...",
  "Evaluating market context...",
  "Generating AI verdict...",
  "Compiling report...",
]

const severityStyle: Record<string, { bg: string; text: string }> = {
  low:      { bg: "bg-success-bg", text: "text-success" },
  medium:   { bg: "bg-warning-bg", text: "text-warning" },
  high:     { bg: "bg-danger-bg",  text: "text-danger" },
  critical: { bg: "bg-danger-bg",  text: "text-danger" },
}

function formatEur(n: number) {
  return EUR + n.toLocaleString("de-DE")
}

/* ── Component ─────────────────────────────────────────── */

export function DeepAnalysisReport({ propertyId }: { propertyId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "loaded">("idle")
  const [data, setData] = useState<DeepData | null>(null)
  const [progress, setProgress] = useState(0)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [pdfDialog, setPdfDialog] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 0: true })
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load due diligence state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`immo_dd_${propertyId}`)
      if (stored) setCheckedItems(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [propertyId])

  const saveChecked = useCallback((items: Record<number, boolean>) => {
    setCheckedItems(items)
    try {
      localStorage.setItem(`immo_dd_${propertyId}`, JSON.stringify(items))
    } catch { /* ignore */ }
  }, [propertyId])

  const handleRun = async () => {
    setState("loading")
    setProgress(0)
    setLoadingMsg(0)

    // Fake progress 0->85% in 15s
    const start = Date.now()
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(85, (elapsed / 15000) * 85)
      setProgress(pct)
    }, 100)

    // Cycle loading messages
    const msgId = setInterval(() => {
      setLoadingMsg((m) => (m + 1) % LOADING_MSGS.length)
    }, 4000)

    const { data: result } = await api.post<DeepData>(
      `/api/analysis/deep/${propertyId}`
    )

    clearInterval(progressRef.current!)
    clearInterval(msgId)
    setProgress(100)

    if (result) {
      setTimeout(() => {
        setData(result)
        setState("loaded")
      }, 300)
    } else {
      setState("idle")
    }
  }

  const toggleSection = (idx: number) => {
    setOpenSections((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  /* ── STATE A: Idle ───────────────────────────────────── */
  if (state === "idle") {
    return (
      <div className="text-center">
        <button
          onClick={handleRun}
          className="h-12 w-full rounded-xl bg-brand font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Run Deep Analysis
        </button>
        <p className="mt-2 text-center text-xs text-text-muted">
          Takes 10-20 seconds {String.fromCharCode(183)} Saved for 24 hours
        </p>
      </div>
    )
  }

  /* ── STATE B: Loading ────────────────────────────────── */
  if (state === "loading") {
    return (
      <div>
        <div className="h-1 w-full rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-center text-sm text-text-secondary">
          {LOADING_MSGS[loadingMsg]}
        </p>
      </div>
    )
  }

  /* ── STATE C: Loaded ─────────────────────────────────── */
  if (!data) return null

  const sections = [
    { title: "Executive Summary", key: "summary" },
    { title: "Property Assessment", key: "assessment" },
    { title: "Valuation Analysis", key: "valuation" },
    { title: "Investment Case", key: "investment" },
    { title: "Risk Analysis", key: "risk" },
    { title: "Financing", key: "financing" },
    { title: "Market Context", key: "market" },
    { title: "Action Plan", key: "action" },
  ]

  return (
    <div>
      {/* PDF Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setPdfDialog(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
        >
          <Lock className="h-3 w-3" /> Download PDF
        </button>
      </div>

      <Dialog open={pdfDialog} onOpenChange={setPdfDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Available in Pro plan</DialogTitle>
            <DialogDescription>
              PDF export is available on the Pro plan. Join the waitlist to be notified when it launches.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* 8 Collapsible Sections */}
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

                {/* SECTION 1 - Executive Summary */}
                {idx === 0 && (
                  <div>
                    <VerdictBadge verdict={data.verdict} className="text-xs" />
                    <h3 className="mt-3 font-serif text-2xl text-text-primary">{data.headline}</h3>
                    <div className="mt-3 rounded-xl border-l-4 border-brand bg-bg-elevated p-4">
                      <p className="text-sm italic text-text-secondary">{data.key_insight}</p>
                    </div>
                    <p className="mt-3 text-sm italic text-text-secondary">
                      If this were my money: {data.if_my_money}
                    </p>
                  </div>
                )}

                {/* SECTION 2 - Property Assessment */}
                {idx === 1 && (
                  <div>
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
                    {data.hidden_costs.length > 0 && (
                      <div className="mt-4">
                        {data.hidden_costs.map((c, i) => (
                          <div key={i} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
                            <span className="text-text-secondary">{c.item}</span>
                            <span className="font-mono text-text-primary">{c.cost}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 3 - Valuation Analysis */}
                {idx === 2 && (
                  <div>
                    {/* Valuation gap bar */}
                    <div className="mb-4 flex items-end gap-3">
                      {[
                        { label: "Ertragswert", value: data.ertragswert, color: "bg-success" },
                        { label: "Sachwert", value: data.sachwert, color: "bg-brand" },
                        { label: "Asking", value: data.asking_price, color: "bg-danger" },
                      ].map((v) => {
                        const maxVal = Math.max(data.ertragswert, data.sachwert, data.asking_price)
                        const heightPct = (v.value / maxVal) * 100
                        return (
                          <div key={v.label} className="flex flex-1 flex-col items-center gap-1">
                            <span className="font-mono text-xs text-text-secondary">{formatEur(v.value)}</span>
                            <div className="w-full rounded-t bg-bg-elevated" style={{ height: "80px" }}>
                              <div
                                className={`w-full rounded-t ${v.color} transition-all`}
                                style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-text-muted">{v.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${data.is_fairly_priced ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
                      {data.is_fairly_priced ? "Fairly Priced" : "Overpriced"}
                    </span>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                      {data.valuation_commentary}
                    </p>
                  </div>
                )}

                {/* SECTION 4 - Investment Case */}
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

                {/* SECTION 5 - Risk Analysis */}
                {idx === 4 && (
                  <div>
                    <span className={`mb-3 inline-block rounded-md px-2 py-0.5 text-xs font-bold uppercase ${(severityStyle[data.overall_risk_level] || severityStyle.medium).bg} ${(severityStyle[data.overall_risk_level] || severityStyle.medium).text}`}>
                      {data.overall_risk_level} risk
                    </span>
                    {data.deal_breakers.length > 0 && (
                      <div className="mb-3 rounded-lg border-l-4 border-danger bg-danger-bg p-3 text-sm text-text-primary">
                        {data.deal_breakers.map((d, i) => (
                          <p key={i}>{d}</p>
                        ))}
                      </div>
                    )}
                    <div>
                      {data.risks.map((r, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0">
                          <span className="text-text-primary">{r.risk}</span>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${(severityStyle[r.severity] || severityStyle.medium).bg} ${(severityStyle[r.severity] || severityStyle.medium).text}`}>
                            {r.severity}
                          </span>
                          <span className="max-w-[40%] text-right text-xs text-text-secondary">{r.mitigation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SECTION 6 - Financing */}
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
                            <p className="text-text-secondary">LTV: <span className="font-mono text-text-primary">{s.ltv}</span></p>
                            <p className="text-text-secondary">Payment: <span className="font-mono text-text-primary">{s.monthly_payment}</span></p>
                            <p className="text-text-secondary">Cashflow: <span className={`font-mono ${s.cashflow_positive ? "text-success" : "text-danger"}`}>{s.monthly_cashflow}</span></p>
                            <p className="text-text-secondary">Equity: <span className="font-mono text-text-primary">{s.equity_needed}</span></p>
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

                {/* SECTION 7 - Market Context */}
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

                {/* SECTION 8 - Action Plan */}
                {idx === 7 && (
                  <div>
                    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold uppercase ${data.action === "buy" ? "bg-success-bg text-success" : data.action === "negotiate" ? "bg-brand-subtle text-brand" : "bg-warning-bg text-warning"}`}>
                      {data.action}
                    </span>
                    <p className="mt-2 font-serif text-4xl text-success">{formatEur(data.recommended_offer)}</p>

                    {/* Due diligence checklist */}
                    <div className="mt-4 space-y-2.5">
                      {data.due_diligence.map((item, i) => (
                        <label key={i} className="flex items-center gap-2.5 text-sm text-text-primary">
                          <Checkbox
                            checked={!!checkedItems[i]}
                            onCheckedChange={(checked) => {
                              const next = { ...checkedItems, [i]: !!checked }
                              saveChecked(next)
                            }}
                          />
                          {item}
                        </label>
                      ))}
                    </div>

                    {/* Next steps */}
                    <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-text-secondary">
                      {data.next_steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
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
