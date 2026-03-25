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
}

type BankabilityMetricRow = {
  label: string
  value: string
}

const STRESS_TEST = {
  RENT_FACTOR: 0.9,
  VACANCY_INCREASE_PCT: 3,
  VACANCY_CAP_PCT: 30,
  INTEREST_RATE_INCREASE_PCT: 1,
  VACANCY_SHOCK_INCREASE_PCT: 8,
  VACANCY_SHOCK_CAP_PCT: 35,
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

function getDscrScenarioVerdict(dscrValue: number): { verdict: "Pass" | "Watch" | "Fail"; tone: BankabilityVerdict["tone"] } {
  if (dscrValue >= DSCR_THRESHOLDS.STRONG) return { verdict: "Pass", tone: "positive" }
  if (dscrValue >= DSCR_THRESHOLDS.BREAKEVEN) return { verdict: "Watch", tone: "neutral" }
  return { verdict: "Fail", tone: "negative" }
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
  const ltv          = price > 0 ? (loan / price) * 100 : 0
  const annualDebtService = mortgage * 12
  const noi = (effRent - mgmtCost) * 12 - maintenance
  const annualInterestExpense = loan * (rate / 100)
  const icr = annualInterestExpense > 0 ? noi / annualInterestExpense : 0
  const debtYield = loan > 0 ? (noi / loan) * 100 : 0
  const effectiveAnnualRent = (rent * 12) * (1 - mgmt / 100)
  const breakEvenCostBase = annualDebtService + maintenance
  const breakEvenOccupancyRatio = effectiveAnnualRent > 0 ? breakEvenCostBase / effectiveAnnualRent : 0
  const breakEvenOccupancy = rent > 0
    ? Math.max(0, Math.min(100, breakEvenOccupancyRatio * 100))
    : 0
  const cfadsAnnual = cashflow * 12
  const stressedRent = rent * STRESS_TEST.RENT_FACTOR
  const stressedVacancyPct = Math.min(vacancy + STRESS_TEST.VACANCY_INCREASE_PCT, STRESS_TEST.VACANCY_CAP_PCT)
  const stressedEffRent = stressedRent * (1 - stressedVacancyPct / 100)
  const stressedRate = (rate + STRESS_TEST.INTEREST_RATE_INCREASE_PCT) / 100 / 12
  const stressedMortgage = stressedRate > 0
    ? loan * (stressedRate * Math.pow(1 + stressedRate, n)) / (Math.pow(1 + stressedRate, n) - 1)
    : loan / n
  const stressedDscr = stressedMortgage > 0 ? stressedEffRent / stressedMortgage : 0
  const stressResilienceScore = Math.max(0, stressedDscr * 100)
  const vacancyShockRate = Math.min(vacancy + STRESS_TEST.VACANCY_SHOCK_INCREASE_PCT, STRESS_TEST.VACANCY_SHOCK_CAP_PCT)
  const vacancyShockDscr = mortgage > 0 ? (rent * (1 - vacancyShockRate / 100)) / mortgage : 0

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
      plainTitle: "Can the property cover the loan?",
      technicalName: "Debt Service Coverage Ratio (DSCR)",
      value: `${dscr.toFixed(2)}×`,
      verdict: dscrVerdict,
      explanation: "This checks whether rental income can comfortably pay the monthly debt.",
    },
    {
      plainTitle: "How risky does this look for a bank?",
      technicalName: "Loan-to-Value (LTV)",
      value: `${ltv.toFixed(1)}%`,
      verdict: ltvVerdict,
      explanation: "This shows how much of the purchase price is financed by debt.",
    },
    {
      plainTitle: "Will money be left after debt payments?",
      technicalName: "Cash Flow After Debt Service",
      value: `${cashflow >= 0 ? "+" : "-"}${EUR}${Math.round(Math.abs(cashflow)).toLocaleString("de-DE")}/mo`,
      verdict: cashflowVerdict,
      explanation: "This is monthly money left over after financing and core operating costs.",
    },
    {
      plainTitle: "Could this survive worse conditions?",
      technicalName: "Stress Resilience Score",
      value: `${Math.round(stressResilienceScore)}`,
      verdict: stressVerdict,
      explanation: "This stress test assumes lower rent and higher rates to see downside durability.",
    },
  ]

  const advancedBankMetrics: BankabilityMetricRow[] = [
    { label: "Debt Service Coverage Ratio (DSCR)", value: `${dscr.toFixed(2)}×` },
    { label: "Interest Coverage Ratio (ICR)", value: `${icr.toFixed(2)}×` },
    { label: "Loan-to-Value (LTV)", value: `${ltv.toFixed(1)}%` },
    { label: "Debt Yield", value: `${debtYield.toFixed(2)}%` },
    { label: "Break-even Occupancy Rate", value: `${breakEvenOccupancy.toFixed(1)}%` },
    { label: "Net Operating Income (NOI)", value: `${EUR}${Math.round(noi).toLocaleString("de-DE")}/yr` },
    { label: "Cash Flow After Debt Service (CFADS)", value: `${cfadsAnnual >= 0 ? "+" : "-"}${EUR}${Math.round(Math.abs(cfadsAnnual)).toLocaleString("de-DE")}/yr` },
  ]

  const stressedRentScenarioVerdict = getDscrScenarioVerdict(stressedDscr)
  const vacancyShockScenarioVerdict = getDscrScenarioVerdict(vacancyShockDscr)

  const stressScenarios = [
    {
      label: `Rent -${Math.round((1 - STRESS_TEST.RENT_FACTOR) * 100)}%, rate +${STRESS_TEST.INTEREST_RATE_INCREASE_PCT}%`,
      metric: `Stressed DSCR ${stressedDscr.toFixed(2)}×`,
      verdict: stressedRentScenarioVerdict.verdict,
      tone: stressedRentScenarioVerdict.tone,
    },
    {
      label: `Vacancy up to ${vacancyShockRate.toFixed(0)}%`,
      metric: `DSCR ${vacancyShockDscr.toFixed(2)}×`,
      verdict: vacancyShockScenarioVerdict.verdict,
      tone: vacancyShockScenarioVerdict.tone,
    },
  ] as const

  const portfolioScalingMetrics: BankabilityMetricRow[] = [
    { label: "Cash-on-Cash Return", value: `${cashOnCash.toFixed(1)}%` },
    { label: "Annual Cash Left to Reinvest", value: `${cfadsAnnual >= 0 ? "+" : "-"}${EUR}${Math.round(Math.abs(cfadsAnnual)).toLocaleString("de-DE")}` },
    { label: "Total Equity Needed", value: `${EUR}${Math.round(equity).toLocaleString("de-DE")}` },
  ]

  const allVerdicts = [dscrVerdict, ltvVerdict, cashflowVerdict, stressVerdict]
  const hasNegative = allVerdicts.some((verdict) => verdict.tone === "negative")
  const hasNeutral = allVerdicts.some((verdict) => verdict.tone === "neutral")

  const overallBankabilityVerdict: BankabilityVerdict = hasNegative
    ? { label: "Needs caution", tone: "negative" }
    : hasNeutral
      ? { label: "Borderline", tone: "neutral" }
      : { label: "Bank-friendly", tone: "positive" }

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
            <p className="mt-1 text-sm text-text-primary">Quick read: {overallBankabilityVerdict.label}</p>
            <p className="mt-1 text-xs text-text-secondary">A simple lender view first. Expand for full underwriting metrics.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {bankabilityCards.map((card) => (
              <div key={card.technicalName} className="rounded-xl border border-border-default bg-bg-base p-3">
                <p className="text-sm font-semibold text-text-primary">{card.plainTitle}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-secondary">{card.verdict.label}</p>
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", verdictChipTone[card.verdict.tone])}>
                    {card.value}
                  </span>
                </div>
                <p className="mt-2 text-xs text-text-secondary">{card.technicalName}: <span className="font-mono">{card.value}</span></p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-border-default bg-bg-base p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Stress Scenarios</p>
            <div className="mt-2 space-y-2">
              {stressScenarios.map((scenario) => (
                <div key={scenario.label} className="flex items-center justify-between gap-3 rounded-lg border border-border-default px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-text-primary">{scenario.label}</p>
                    <p className="text-xs text-text-secondary">{scenario.metric}</p>
                  </div>
                  <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold", verdictChipTone[scenario.tone])}>
                    {scenario.verdict}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Collapsible className="mt-4 rounded-xl border border-border-default bg-bg-base p-3">
            <CollapsibleTrigger className="text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text-secondary">
              Detailed Lender Metrics
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {advancedBankMetrics.map((metric) => (
                <div key={metric.label} className="flex items-center justify-between gap-3 rounded-lg border border-border-default px-3 py-2">
                  <p className="text-xs text-text-secondary">{metric.label}</p>
                  <p className="text-xs font-mono font-semibold text-text-primary">{metric.value}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="mt-3 rounded-2xl border border-border-default bg-bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Portfolio Scaling Potential</p>
          <p className="mt-1 text-xs text-text-secondary">Separate from bankability: these numbers show how quickly this deal can help fund the next one.</p>
          <div className="mt-3 grid gap-2">
            {portfolioScalingMetrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-bg-base px-3 py-2">
                <p className="text-xs text-text-secondary">{metric.label}</p>
                <p className="text-xs font-mono font-semibold text-text-primary">{metric.value}</p>
              </div>
            ))}
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
