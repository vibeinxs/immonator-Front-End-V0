"use client"

import { useState, useCallback } from "react"
import { RotateCcw, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { analyseProperty } from "@/lib/analyseApi"
import { CashflowChart, type YearData } from "@/components/analysis/CashflowChart"
import { VerdictRing } from "@/components/analysis/VerdictRing"
import { KpiGrid } from "@/features/analysis/KpiGrid"
import { FlagsSection } from "@/features/analysis/FlagsSection"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"

// ─── Field configuration ───────────────────────────────────────────────────

interface FieldDef {
  key: keyof AnalyseRequest
  label: string
  type: "text" | "number" | "select"
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  advanced?: boolean
}

const FIELDS: FieldDef[] = [
  // Core
  { key: "address", label: "Address", type: "text" },
  { key: "sqm", label: "Living Area (m²)", type: "number", min: 1 },
  { key: "purchase_price", label: "Purchase Price (€)", type: "number", min: 1 },
  { key: "equity", label: "Equity (€)", type: "number", min: 0 },
  { key: "rent_monthly", label: "Monthly Rent (€)", type: "number", min: 0 },
  { key: "year_built", label: "Year Built", type: "number", min: 1850, max: 2030 },
  {
    key: "condition",
    label: "Condition",
    type: "select",
    options: [
      { value: "existing", label: "Existing" },
      { value: "newbuild", label: "New Build" },
    ],
  },
  // Financing (advanced)
  { key: "interest_rate", label: "Interest Rate (%)", type: "number", min: 0, max: 20, step: 0.1, advanced: true },
  { key: "repayment_rate", label: "Repayment Rate (%)", type: "number", min: 0, max: 20, step: 0.1, advanced: true },
  { key: "transfer_tax_pct", label: "Transfer Tax (%)", type: "number", min: 0, max: 10, step: 0.1, advanced: true },
  { key: "notary_pct", label: "Notary (%)", type: "number", min: 0, max: 5, step: 0.1, advanced: true },
  { key: "agent_pct", label: "Agent Fee (%)", type: "number", min: 0, max: 10, step: 0.01, advanced: true },
  { key: "land_share_pct", label: "Land Share (%)", type: "number", min: 0, max: 80, step: 1, advanced: true },
  // Running costs (advanced)
  { key: "hausgeld_monthly", label: "Hausgeld (€/mo)", type: "number", min: 0, advanced: true },
  { key: "maintenance_nd", label: "Maintenance (€/yr)", type: "number", min: 0, advanced: true },
  { key: "management_nd", label: "Management (€/yr)", type: "number", min: 0, advanced: true },
  // Assumptions (advanced)
  { key: "tax_rate", label: "Tax Rate (%)", type: "number", min: 0, max: 100, step: 0.5, advanced: true },
  { key: "rent_growth", label: "Rent Growth (%/yr)", type: "number", min: 0, max: 10, step: 0.1, advanced: true },
  { key: "appreciation", label: "Appreciation (%/yr)", type: "number", min: 0, max: 10, step: 0.1, advanced: true },
  { key: "vacancy_rate", label: "Vacancy (%)", type: "number", min: 0, max: 30, step: 0.5, advanced: true },
  { key: "holding_years", label: "Horizon (years)", type: "number", min: 1, max: 30, step: 1, advanced: true },
  { key: "afa_rate_input", label: "AfA Rate (%)", type: "number", min: 0, max: 7, step: 0.5, advanced: true },
]

const CORE_FIELDS = FIELDS.filter((f) => !f.advanced)
const ADVANCED_FIELDS = FIELDS.filter((f) => f.advanced)

// ─── Year data mapping ──────────────────────────────────────────────────────

function toChartData(yearData: AnalyseResponse["year_data"]): YearData[] {
  return yearData.map((y) => ({
    year: y.year,
    cashflow_monthly:
      y.cash_flow_monthly ?? (y.cash_flow != null ? y.cash_flow / 12 : undefined),
    equity: y.net_worth,
  }))
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validate(input: AnalyseRequest): string | null {
  if (!input.address.trim()) return "Address is required."
  if (input.sqm <= 0) return "Living area must be greater than 0."
  if (input.purchase_price <= 0) return "Purchase price must be greater than 0."
  if (input.equity < 0) return "Equity cannot be negative."
  if (input.equity >= input.purchase_price) return "Equity must be less than purchase price."
  if (input.rent_monthly <= 0) return "Monthly rent must be greater than 0."
  if (input.year_built < 1850 || input.year_built > 2030) return "Year built must be between 1850 and 2030."
  return null
}

// ─── Component ──────────────────────────────────────────────────────────────

interface PropertyPanelProps {
  label: string
  input: AnalyseRequest
  result: AnalyseResponse | null
  onInputChange: (input: AnalyseRequest) => void
  onResult: (result: AnalyseResponse | null) => void
}

export function PropertyPanel({
  label,
  input,
  result,
  onInputChange,
  onResult,
}: PropertyPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleChange = useCallback(
    (key: keyof AnalyseRequest, rawValue: string) => {
      const field = FIELDS.find((f) => f.key === key)
      let value: string | number = rawValue
      if (field && field.type === "number") {
        // Allow empty input — don't replace with 0 so users can clear and retype
        if (rawValue === "" || rawValue === "-") {
          value = rawValue
        } else {
          const parsed = Number(rawValue)
          // Revert to previous valid value if the result is not a finite number
          value = Number.isFinite(parsed) ? parsed : (input[key] as number)
        }
      }
      onInputChange({ ...input, [key]: value })
      // Clear stale result when inputs change
      if (result) onResult(null)
    },
    [input, result, onInputChange, onResult]
  )

  const handleAnalyse = useCallback(async () => {
    const validationError = validate(input)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { data, error: apiError } = await analyseProperty(input)
      if (apiError || !data) {
        setError(apiError ?? "Analysis failed. Please try again.")
      } else {
        onResult(data)
      }
    } finally {
      setLoading(false)
    }
  }, [input, onResult])

  const renderField = (field: FieldDef) => {
    const value = input[field.key]

    if (field.type === "select") {
      return (
        <div key={field.key}>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-text-muted mb-1">
            {field.label}
          </label>
          <select
            value={String(value ?? "")}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className="w-full rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-brand"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    return (
      <div key={field.key}>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-text-muted mb-1">
          {field.label}
        </label>
        <input
          type={field.type}
          value={value ?? ""}
          min={field.min}
          max={field.max}
          step={field.step ?? (field.type === "number" ? "any" : undefined)}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className="w-full rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-brand"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-text-primary">
          {label}
        </h2>
        {result && (
          <button
            onClick={() => { onResult(null) }}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
            title="Reset results"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-4">
        {/* Core fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CORE_FIELDS.map(renderField)}
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Hide advanced
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Advanced inputs
            </>
          )}
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 border-t border-border-default pt-3">
            {ADVANCED_FIELDS.map(renderField)}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {/* Analyse button */}
        <button
          onClick={handleAnalyse}
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analysing…
            </>
          ) : (
            `Analyse ${label}`
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Verdict ring */}
          <div className="flex justify-center rounded-xl border border-border-default bg-bg-surface py-6">
            <VerdictRing score={result.score} verdict={result.verdict} size={128} />
          </div>

          {/* KPI grid */}
          <KpiGrid result={result} />

          {/* Cashflow chart */}
          <div className="rounded-xl border border-border-default bg-bg-surface p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              Annual Cashflow (€/mo)
            </p>
            <CashflowChart yearData={toChartData(result.year_data)} />
          </div>

          {/* Flags */}
          <div className="rounded-xl border border-border-default bg-bg-surface p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
              Investment Signals
            </p>
            <FlagsSection result={result} />
          </div>

          {/* IRR projections */}
          <div className="rounded-xl border border-border-default bg-bg-surface p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
              Returns at Exit
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(
                [
                  { label: "10 yr", irr: result.irr_10, mult: result.equity_multiple_10 },
                  { label: "15 yr", irr: result.irr_15, mult: result.equity_multiple_15 },
                  { label: "20 yr", irr: result.irr_20, mult: result.equity_multiple_20 },
                ] as const
              ).map(({ label: yr, irr, mult }) => (
                <div key={yr} className="rounded-lg bg-bg-elevated px-2 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                    {yr}
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-text-primary">
                    {irr.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    {mult.toFixed(2)}×
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
