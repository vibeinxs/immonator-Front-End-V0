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

type BankabilityVerdict = {
  label: string
  tone: "positive" | "neutral" | "negative"
}

type BankabilityCard = {
  plainTitle: string
  technicalName: string
  value: string
  verdict: BankabilityVerdict
  explanation: string
  details: {
    formula: string
    thresholds: string
    whyItMatters: string
  }
}

const STRESS_TEST = {
  RENT_FACTOR: 0.9,
  VACANCY_INCREASE_PCT: 3,
  VACANCY_CAP_PCT: 30,
  INTEREST_RATE_INCREASE_PCT: 1,
} as const

const DSCR_THRESHOLDS = {
  STRONG: 1.2,
  BREAKEVEN: 1,
} as const

const LTV_THRESHOLDS = {
  LOW_RISK: 75,
  WATCH: 80,
} as const

const CASHFLOW_THRESHOLDS = {
  POSITIVE: 0,
  NEAR_BREAKEVEN: -150,
} as const

const STRESS_SCORE_THRESHOLDS = {
  RESILIENT: 120,
  BORDERLINE: 100,
} as const

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
  const ltv          = price > 0 ? (loan / price) * 100 : 0
  const stressedRent = rent * STRESS_TEST.RENT_FACTOR
  const stressedVacancyPct = Math.min(vacancy + STRESS_TEST.VACANCY_INCREASE_PCT, STRESS_TEST.VACANCY_CAP_PCT)
  const stressedEffRent = stressedRent * (1 - stressedVacancyPct / 100)
  const stressedRate = (rate + STRESS_TEST.INTEREST_RATE_INCREASE_PCT) / 100 / 12
  const stressedMortgage = stressedRate > 0
    ? loan * (stressedRate * Math.pow(1 + stressedRate, n)) / (Math.pow(1 + stressedRate, n) - 1)
    : loan / n
  const stressedDscr = stressedMortgage > 0 ? stressedEffRent / stressedMortgage : 0
  const stressResilienceScore = Math.max(0, stressedDscr * 100)

  const dscrVerdict: BankabilityVerdict = dscr >= DSCR_THRESHOLDS.STRONG
    ? { label: "Bank-friendly", tone: "positive" }
    : dscr >= DSCR_THRESHOLDS.BREAKEVEN
      ? { label: "Tight", tone: "neutral" }
      : { label: "At risk", tone: "negative" }

  const ltvVerdict: BankabilityVerdict = ltv <= LTV_THRESHOLDS.LOW_RISK
    ? { label: "Low risk", tone: "positive" }
    : ltv <= LTV_THRESHOLDS.WATCH
      ? { label: "Watch closely", tone: "neutral" }
      : { label: "High risk", tone: "negative" }

  const cashflowVerdict: BankabilityVerdict = cashflow >= CASHFLOW_THRESHOLDS.POSITIVE
    ? { label: "Positive", tone: "positive" }
    : cashflow >= CASHFLOW_THRESHOLDS.NEAR_BREAKEVEN
      ? { label: "Near break-even", tone: "neutral" }
      : { label: "Negative", tone: "negative" }

  const stressVerdict: BankabilityVerdict = stressResilienceScore >= STRESS_SCORE_THRESHOLDS.RESILIENT
    ? { label: "Resilient", tone: "positive" }
    : stressResilienceScore >= STRESS_SCORE_THRESHOLDS.BORDERLINE
      ? { label: "Borderline", tone: "neutral" }
      : { label: "Fragile", tone: "negative" }

  const bankabilityCards: BankabilityCard[] = [
    {
      plainTitle: "Can the rent cover the loan?",
      technicalName: "Debt Service Coverage Ratio (DSCR)",
      value: `${dscr.toFixed(2)}×`,
      verdict: dscrVerdict,
      explanation: "This checks whether rental income can comfortably pay the monthly debt.",
      details: {
        formula: "DSCR = Net operating rent income ÷ Annual debt service",
        thresholds: `Typical lender comfort: ≥${DSCR_THRESHOLDS.STRONG.toFixed(2)}× (${DSCR_THRESHOLDS.BREAKEVEN.toFixed(2)}× means just enough to pay debt)`,
        whyItMatters: "A stronger DSCR gives banks confidence that payments can still be made if income dips.",
      },
    },
    {
      plainTitle: "How much bank risk is in this deal?",
      technicalName: "Loan-to-Value (LTV)",
      value: `${ltv.toFixed(1)}%`,
      verdict: ltvVerdict,
      explanation: "This shows how much of the purchase price is financed by debt.",
      details: {
        formula: "LTV = Loan amount ÷ Property value",
        thresholds: `Typical lender range: ≤${LTV_THRESHOLDS.WATCH}% (lower is safer for both borrower and bank)`,
        whyItMatters: "Lower LTV means more equity buffer if prices fall or exit takes longer.",
      },
    },
    {
      plainTitle: "Will money be left each month?",
      technicalName: "Cash Flow After Debt Service",
      value: `${cashflow >= 0 ? "+" : "-"}${EUR}${Math.round(Math.abs(cashflow)).toLocaleString("de-DE")}/mo`,
      verdict: cashflowVerdict,
      explanation: "This is monthly money left over after financing and core operating costs.",
      details: {
        formula: "Cash Flow After Debt Service = Effective rent − Mortgage − Opex",
        thresholds: "Target is positive; negative values mean the owner must top up monthly.",
        whyItMatters: "Positive cash flow improves affordability and reduces repayment stress.",
      },
    },
    {
      plainTitle: "Could this survive worse conditions?",
      technicalName: "Stress Resilience Score",
      value: `${Math.round(stressResilienceScore)}`,
      verdict: stressVerdict,
      explanation: "This stress test assumes lower rent and higher rates to see downside durability.",
      details: {
        formula: `Stress score = Stressed DSCR × 100 (stress case: rent −${Math.round((1 - STRESS_TEST.RENT_FACTOR) * 100)}%, vacancy +${STRESS_TEST.VACANCY_INCREASE_PCT}pp capped at ${STRESS_TEST.VACANCY_CAP_PCT}%, rate +${STRESS_TEST.INTEREST_RATE_INCREASE_PCT}pp)`,
        thresholds: `${STRESS_SCORE_THRESHOLDS.BORDERLINE}+ means debt coverage remains at or above break-even under stress.`,
        whyItMatters: "Banks favor properties that still cover debt when conditions worsen.",
      },
    },
  ]

  const verdictChipTone: Record<BankabilityVerdict["tone"], string> = {
    positive: "bg-success-bg text-success border-success/25",
    neutral: "bg-warning-bg text-warning border-warning/25",
    negative: "bg-danger-bg text-danger border-danger/25",
  }

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
          <MetricCard
            label="Debt Service Coverage Ratio (DSCR)"
            value={dscr.toFixed(2)}
            sentiment={dscr >= DSCR_THRESHOLDS.STRONG ? "positive" : dscr >= DSCR_THRESHOLDS.BREAKEVEN ? "neutral" : "negative"}
          />
          <MetricCard label="Cash-on-Cash" value={cashOnCash.toFixed(1)} suffix="%" sentiment={cashOnCash >= 5 ? "positive" : "neutral"} />
        </div>

        {/* Bankability & Financing Strength */}
        <div className="mt-5 rounded-2xl border border-border-default bg-bg-surface p-4">
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Bankability &amp; Financing Strength</p>
            <p className="mt-1 text-xs text-text-secondary">Designed so non-finance users can read lender-style KPIs quickly.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {bankabilityCards.map((card) => (
              <Collapsible key={card.technicalName} className="rounded-xl border border-border-default bg-bg-base p-3">
                <p className="text-sm font-semibold text-text-primary">{card.plainTitle}</p>
                <p className="mt-1 text-xs text-text-secondary">{card.technicalName}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="font-mono text-2xl font-bold text-text-primary">{card.value}</p>
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", verdictChipTone[card.verdict.tone])}>
                    {card.verdict.label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{card.explanation}</p>
                <CollapsibleTrigger className="mt-2 text-xs font-medium text-brand hover:text-brand-hover">
                  Show formula and thresholds
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-muted">
                  <p><span className="font-semibold text-text-secondary">Formula:</span> {card.details.formula}</p>
                  <p><span className="font-semibold text-text-secondary">Thresholds:</span> {card.details.thresholds}</p>
                  <p><span className="font-semibold text-text-secondary">Why it matters:</span> {card.details.whyItMatters}</p>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-border-default bg-bg-base p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">What Banks Care About</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "Debt Service Coverage Ratio (DSCR)",
                "Interest Coverage Ratio (ICR)",
                "Loan-to-Value (LTV)",
                "Debt Yield",
                "Break-even Occupancy Rate",
              ].map((item) => (
                <span key={item} className="rounded-full border border-border-default bg-bg-surface px-2.5 py-1 text-xs text-text-secondary">
                  {item}
                </span>
              ))}
            </div>
          </div>
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
