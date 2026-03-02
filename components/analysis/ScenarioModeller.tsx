"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import { MetricCard } from "@/components/metric-card"
import { VerdictBadge } from "@/components/verdict-badge"
import { EUR, cn } from "@/lib/utils"
import { immoApi } from "@/lib/immonatorApi"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ScenarioModellerProps {
  propertyId: string
  askingPrice: number
  monthlyRent: number
}

interface SliderDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  unit: string
  advanced?: boolean
}

interface AiComment {
  verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
  one_line_summary: string
  commentary: string[]
  suggestion: string
}

const SLIDERS: SliderDef[] = [
  { key: "price", label: "Purchase Price", min: 50000, max: 2000000, step: 5000, unit: EUR },
  { key: "down", label: "Down Payment", min: 5, max: 50, step: 1, unit: "%" },
  { key: "rate", label: "Interest Rate", min: 1, max: 8, step: 0.1, unit: "%" },
  { key: "years", label: "Loan Term", min: 5, max: 35, step: 1, unit: "yr" },
  { key: "rent", label: "Monthly Rent", min: 200, max: 5000, step: 25, unit: EUR },
  { key: "vacancy", label: "Vacancy Rate", min: 0, max: 15, step: 1, unit: "%" },
  { key: "mgmt", label: "Management %", min: 0, max: 15, step: 0.5, unit: "%", advanced: true },
  { key: "maintenance", label: "Maintenance €", min: 0, max: 6000, step: 50, unit: EUR, advanced: true },
]

function formatValue(value: number, unit: string): string {
  if (unit === EUR) return `${EUR}${value.toLocaleString("de-DE")}`
  if (unit === "yr") return `${value}yr`
  return `${value}${unit}`
}

export function ScenarioModeller({ propertyId, askingPrice, monthlyRent }: ScenarioModellerProps) {
  const [values, setValues] = useState<Record<string, number>>({
    price: askingPrice,
    down: 20,
    rate: 3.8,
    years: 25,
    rent: monthlyRent,
    vacancy: 3,
    mgmt: 5,
    maintenance: 100,
  })

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [aiComment, setAiComment] = useState<AiComment | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [scenarioName, setScenarioName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [savedScenarios, setSavedScenarios] = useState<{ name: string; values: Record<string, number> }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const set = (key: string, val: number) => setValues((prev) => ({ ...prev, [key]: val }))

  /* ── Client-side math ─────────────────────────── */
  const { price, down, rate, years, rent, vacancy, mgmt, maintenance } = values

  const loan = price * (1 - down / 100)
  const equity = price * (down / 100) + price * 0.095
  const r = rate / 100 / 12
  const n = years * 12
  const mortgage = r > 0 ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan / n
  const effRent = rent * (1 - vacancy / 100)
  const cashflow = effRent - mortgage - effRent * (mgmt / 100) - maintenance / 12
  const grossYield = price > 0 ? (rent * 12) / price * 100 : 0
  const netYield = price > 0 ? ((effRent - effRent * (mgmt / 100) - maintenance) * 12) / price * 100 : 0
  const dscr = mortgage > 0 ? (effRent * 12) / (mortgage * 12) : 0
  const cashOnCash = equity > 0 ? (cashflow * 12) / equity * 100 : 0

  /* ── AI commentary debounce ───────────────────── */
  const fetchAi = useCallback(async () => {
    setAiLoading(true)
    const scenarioParams = {
      purchase_price: values.price,
      down_payment_pct: values.down,
      interest_rate_pct: values.rate,
      loan_term_years: values.years,
      monthly_rent: values.rent,
      vacancy_rate_pct: values.vacancy,
      management_cost_pct: values.mgmt,
      maintenance_cost_annual: values.maintenance,
    }
    const { data } = await immoApi.runScenario(propertyId, scenarioParams) as unknown as {
      data: { ai_commentary?: AiComment } | null
    }
    if (data?.ai_commentary) setAiComment(data.ai_commentary)
    setAiLoading(false)
  }, [propertyId, values])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchAi, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchAi])

  /* ── Load saved scenarios from localStorage ───── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`scenarios_${propertyId}`)
      if (raw) setSavedScenarios(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [propertyId])

  const saveScenario = () => {
    const name = scenarioName.trim() || `Scenario ${savedScenarios.length + 1}`
    const updated = [...savedScenarios, { name, values }]
    setSavedScenarios(updated)
    localStorage.setItem(`scenarios_${propertyId}`, JSON.stringify(updated))
    setScenarioName("")
    setShowNameInput(false)
  }

  const loadScenario = (s: { name: string; values: Record<string, number> }) => {
    setValues(s.values)
  }

  const basicSliders = SLIDERS.filter((s) => !s.advanced)
  const advancedSliders = SLIDERS.filter((s) => s.advanced)

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* LEFT -- SLIDERS */}
      <div className="space-y-5">
        {basicSliders.map((s) => (
          <div key={s.key}>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs uppercase tracking-wider text-text-muted">{s.label}</span>
              <span className="text-sm font-mono font-medium text-text-primary">{formatValue(values[s.key], s.unit)}</span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={values[s.key]}
              onChange={(e) => set(s.key, Number(e.target.value))}
              className="w-full h-1.5 rounded-full accent-[#3B7BF5]"
            />
          </div>
        ))}

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors">
            Advanced
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-5">
            {advancedSliders.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs uppercase tracking-wider text-text-muted">{s.label}</span>
                  <span className="text-sm font-mono font-medium text-text-primary">{formatValue(values[s.key], s.unit)}</span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={values[s.key]}
                  onChange={(e) => set(s.key, Number(e.target.value))}
                  className="w-full h-1.5 rounded-full accent-[#3B7BF5]"
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* RIGHT -- RESULTS */}
      <div>
        {/* Monthly Cashflow hero */}
        <div className="text-center mb-6">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">Monthly Cashflow</p>
          <p className={cn("font-display text-5xl mt-2", cashflow >= 0 ? "text-success" : "text-danger")}>
            {cashflow >= 0 ? "+" : ""}{EUR}{Math.round(Math.abs(cashflow)).toLocaleString("de-DE")}/mo
          </p>
          <p className="text-xs text-text-muted mt-1">per month after all costs</p>
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Gross Yield" value={grossYield.toFixed(1)} suffix="%" sentiment={grossYield >= 5 ? "positive" : "neutral"} />
          <MetricCard label="Net Yield" value={netYield.toFixed(1)} suffix="%" sentiment={netYield >= 3.5 ? "positive" : "neutral"} />
          <MetricCard label="DSCR" value={dscr.toFixed(2)} sentiment={dscr >= 1.2 ? "positive" : dscr >= 1 ? "neutral" : "negative"} />
          <MetricCard label="Cash-on-Cash" value={cashOnCash.toFixed(1)} suffix="%" sentiment={cashOnCash >= 5 ? "positive" : "neutral"} />
        </div>

        {/* Equity info */}
        <div className="mt-3 text-sm text-text-secondary">
          <p>{EUR}{Math.round(equity).toLocaleString("de-DE")} total equity required</p>
          <p className="text-xs text-text-muted">
            {EUR}{((price * (down / 100)) / 1000).toFixed(0)}k down + {EUR}{((price * 0.095) / 1000).toFixed(0)}k closing costs
          </p>
        </div>

        {/* AI Commentary */}
        <div className={cn(
          "mt-4 rounded-xl border bg-bg-surface p-4 relative",
          aiLoading ? "border-brand/40 animate-pulse" : "border-border-default"
        )}>
          {aiComment && !aiLoading ? (
            <>
              <div className="absolute top-3 right-3">
                <VerdictBadge verdict={aiComment.verdict} />
              </div>
              <p className="text-base font-semibold text-text-primary pr-24">{aiComment.one_line_summary}</p>
              <div className="mt-2 space-y-1">
                {aiComment.commentary.map((line, i) => (
                  <p key={i} className="text-sm text-text-secondary">{line}</p>
                ))}
              </div>
              {aiComment.suggestion && (
                <p className="mt-2 text-xs italic text-brand">{aiComment.suggestion}</p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
              Analysing scenario...
            </div>
          )}
        </div>

        {/* Save / Load */}
        <div className="flex gap-3 mt-5">
          {showNameInput ? (
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Scenario name..."
                className="flex-1 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveScenario()}
              />
              <button onClick={saveScenario} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNameInput(true)}
              className="rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            >
              Save This Scenario
            </button>
          )}
          {savedScenarios.length > 0 && (
            <Select onValueChange={(value) => {
              const idx = Number(value)
              if (!isNaN(idx) && savedScenarios[idx]) loadScenario(savedScenarios[idx])
            }}>
              <SelectTrigger className="h-auto rounded-xl border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary">
                <SelectValue placeholder="Saved Scenarios ▾" />
              </SelectTrigger>
              <SelectContent>
                {savedScenarios.map((s, i) => (
                  <SelectItem key={i} value={String(i)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  )
}
