"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import { MetricCard } from "@/components/metric-card"
import { VerdictBadge } from "@/components/verdict-badge"
import { Switch } from "@/components/ui/switch"
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
import { copy } from "@/lib/copy"

interface ScenarioModellerProps {
  propertyId: string
  askingPrice: number
  monthlyRent: number
}

interface AiComment {
  verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
  one_line_summary: string
  commentary: string[]
  suggestion: string
}

function formatValue(value: number, unit: string): string {
  if (unit === EUR) return `${EUR}${value.toLocaleString("de-DE")}`
  if (unit === "yr") return `${value} yr`
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
    maintenance: 1200,
  })

  const [useAfa, setUseAfa] = useState(false)
  const [useSonderAfa, setUseSonderAfa] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [aiComment, setAiComment] = useState<AiComment | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [scenarioName, setScenarioName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [savedScenarios, setSavedScenarios] = useState<{ name: string; values: Record<string, number>; useAfa?: boolean; useSonderAfa?: boolean }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const set = (key: string, val: number) => setValues((prev) => ({ ...prev, [key]: val }))

  /* ── Slider definitions (dynamic ranges based on props) ─────────────────── */
  const BASIC_SLIDERS = [
    { key: "price",    label: "Purchase Price",  min: Math.round(askingPrice * 0.7 / 5000) * 5000, max: Math.round(askingPrice * 1.1 / 5000) * 5000, step: 5000, unit: EUR },
    { key: "down",     label: "Down Payment %",  min: 10,  max: 40,  step: 5,   unit: "%" },
    { key: "rate",     label: "Interest Rate %", min: 2.0, max: 7.0, step: 0.1, unit: "%" },
    { key: "years",    label: "Loan Term",       min: 10,  max: 30,  step: 5,   unit: "yr" },
    { key: "rent",     label: "Monthly Rent",    min: Math.round(monthlyRent * 0.7 / 50) * 50, max: Math.round(monthlyRent * 1.5 / 50) * 50, step: 50, unit: EUR },
    { key: "vacancy",  label: "Vacancy Rate %",  min: 0,   max: 15,  step: 1,   unit: "%" },
  ]

  const ADVANCED_SLIDERS = [
    { key: "mgmt",        label: "Management Cost %", min: 0, max: 15,    step: 1,   unit: "%" },
    { key: "maintenance", label: "Maintenance €/yr",  min: 0, max: 10000, step: 100, unit: EUR },
  ]

  /* ── Client-side math ───────────────────────────────────────────────────── */
  const { price, down, rate, years, rent, vacancy, mgmt, maintenance } = values

  const loan = price * (1 - down / 100)
  const equity = price * (down / 100) + price * 0.095
  const r = rate / 100 / 12
  const n = years * 12
  const mortgage = r > 0 ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan / n
  const effRent = rent * (1 - vacancy / 100)
  const mgmtCost = effRent * (mgmt / 100)
  const cashflow = effRent - mortgage - mgmtCost - maintenance / 12
  const afaBenefit    = useAfa       ? (price * 0.02 / 12 * 0.42) : 0
  const sonderBenefit = useSonderAfa ? (price * 0.05 / 12 * 0.42) : 0
  const cashflowAfterTax = cashflow + afaBenefit + sonderBenefit
  const grossYield   = price > 0 ? (rent * 12) / price * 100 : 0
  const netYield     = price > 0 ? ((effRent - mgmtCost) * 12 - maintenance) / price * 100 : 0
  const dscr         = mortgage > 0 ? (effRent * 12) / (mortgage * 12) : 0
  const cashOnCash   = equity > 0 ? (cashflow * 12) / equity * 100 : 0

  /* ── Handle Sonder-AfA dependency on Linear AfA ─────────────────────────── */
  const handleAfaToggle = (checked: boolean) => {
    setUseAfa(checked)
    if (!checked) setUseSonderAfa(false)
  }

  /* ── AI commentary debounce ─────────────────────────────────────────────── */
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
      use_afa: useAfa,
      use_sonder_afa: useSonderAfa,
    }
    const { data } = await immoApi.runScenario(propertyId, scenarioParams) as unknown as {
      data: { ai_commentary?: AiComment } | null
    }
    if (data?.ai_commentary) setAiComment(data.ai_commentary)
    setAiLoading(false)
  }, [propertyId, values, useAfa, useSonderAfa])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchAi, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchAi])

  /* ── Load saved scenarios from localStorage ─────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`scenarios_${propertyId}`)
      if (raw) setSavedScenarios(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [propertyId])

  const saveScenario = () => {
    const name = scenarioName.trim() || `Scenario ${savedScenarios.length + 1}`
    const updated = [...savedScenarios, { name, values, useAfa, useSonderAfa }]
    setSavedScenarios(updated)
    localStorage.setItem(`scenarios_${propertyId}`, JSON.stringify(updated))
    setScenarioName("")
    setShowNameInput(false)
  }

  const loadScenario = (s: { name: string; values: Record<string, number>; useAfa?: boolean; useSonderAfa?: boolean }) => {
    setValues(s.values)
    setUseAfa(s.useAfa ?? false)
    setUseSonderAfa(s.useSonderAfa ?? false)
  }

  const showAfaTax = useAfa || useSonderAfa

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* LEFT — SLIDERS */}
      <div className="space-y-5">
        {BASIC_SLIDERS.map((s) => (
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
            {ADVANCED_SLIDERS.map((s) => (
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

        {/* AfA Toggles */}
        <div className="pt-2 space-y-3 border-t border-border-default">
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Tax Depreciation (AfA)</p>

          {/* Linear AfA */}
          <div className="flex items-start gap-3">
            <Switch
              id="afa-linear"
              checked={useAfa}
              onCheckedChange={handleAfaToggle}
              className="mt-0.5 shrink-0"
            />
            <label htmlFor="afa-linear" className="cursor-pointer">
              <p className="text-sm font-medium text-text-primary leading-none mb-0.5">Linear AfA</p>
              <p className="text-xs text-text-muted">2%/year tax deduction on purchase price</p>
            </label>
          </div>

          {/* Sonder-AfA */}
          <div className={cn("flex items-start gap-3", !useAfa && "opacity-40")}>
            <Switch
              id="afa-sonder"
              checked={useSonderAfa}
              onCheckedChange={setUseSonderAfa}
              disabled={!useAfa}
              className="mt-0.5 shrink-0"
            />
            <label htmlFor="afa-sonder" className={cn("cursor-pointer", !useAfa && "cursor-not-allowed")}>
              <p className="text-sm font-medium text-text-primary leading-none mb-0.5">Sonder-AfA</p>
              <p className="text-xs text-text-muted">5%/year for 4 years (new builds only)</p>
            </label>
          </div>
        </div>
      </div>

      {/* RIGHT — RESULTS */}
      <div>
        {/* Monthly Cashflow hero */}
        <div className="text-center mb-6">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">
            {showAfaTax ? "Monthly Cashflow (after tax)" : copy.scenarioModeller.monthlyCashflow}
          </p>
          <p className={cn("font-mono text-5xl font-bold mt-2 tabular-nums", cashflowAfterTax >= 0 ? "text-success" : "text-danger")}>
            {cashflowAfterTax >= 0 ? "+" : ""}{EUR}{Math.round(Math.abs(cashflowAfterTax)).toLocaleString("de-DE")}/mo
          </p>
          {showAfaTax && (
            <p className="text-xs text-text-muted mt-1">
              pre-tax: {cashflow >= 0 ? "+" : ""}{EUR}{Math.round(Math.abs(cashflow)).toLocaleString("de-DE")}/mo
              {" · "}AfA savings: +{EUR}{Math.round(afaBenefit + sonderBenefit).toLocaleString("de-DE")}/mo
            </p>
          )}
          {!showAfaTax && (
            <p className="text-xs text-text-muted mt-1">{copy.scenarioModeller.perMonthAfterCosts}</p>
          )}
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Gross Yield" value={grossYield.toFixed(1)} suffix="%" sentiment={grossYield >= 5 ? "positive" : "neutral"} />
          <MetricCard label="Net Yield"   value={netYield.toFixed(1)}   suffix="%" sentiment={netYield >= 3.5 ? "positive" : "neutral"} />
          <MetricCard label="DSCR"        value={dscr.toFixed(2)}             sentiment={dscr >= 1.2 ? "positive" : dscr >= 1 ? "neutral" : "negative"} />
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
              {copy.scenarioModeller.analysing}
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
                {copy.scenarioModeller.save}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNameInput(true)}
              className="rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            >
              {copy.scenarioModeller.saveScenario}
            </button>
          )}
          {savedScenarios.length > 0 && (
            <Select onValueChange={(value) => {
              const idx = Number(value)
              if (!isNaN(idx) && savedScenarios[idx]) loadScenario(savedScenarios[idx])
            }}>
              <SelectTrigger className="h-auto rounded-xl border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary">
                <SelectValue placeholder={copy.scenarioModeller.savedScenariosPlaceholder} />
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
