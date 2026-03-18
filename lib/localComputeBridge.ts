/**
 * localComputeBridge.ts
 *
 * Stability layer between AnalyseRequest form state and localCompute().
 * Maps AnalyseRequest → FormParams (for local preview) and
 * ComputeResult → AnalyseResponse-compatible shape (for UI consumption).
 *
 * ─── UNMAPPED FIELDS ────────────────────────────────────────────────────────
 *
 * The following AnalyseRequest fields have NO effect on local computation
 * because FormParams / localCompute() does not model them. They are dropped
 * at the FormParams boundary and documented here so callers are never
 * surprised by silent divergence from the backend result.
 *
 *   afa_method
 *     Not present in FormParams. localCompute() uses straight-line only.
 *     The value from AnalyseRequest is echoed in the response for display
 *     but has no effect on the computed figures.
 *
 * ─── MAPPING DECISIONS ──────────────────────────────────────────────────────
 *
 *   afa_rate_input
 *     Type is `number | null | undefined` on AnalyseRequest.
 *     Mapped as: `n(r.afa_rate_input, 0)` — null/undefined/NaN → 0.
 *     When 0, localCompute() falls back to condition-based defaults
 *     (newbuild → 3%, existing → 2%), preserving its own logic.
 *     We do NOT substitute a hardcoded 2.0 for null so the fallback
 *     chain stays inside localCompute rather than the bridge.
 *
 *   agent_pct  (Maklerprovision)
 *     Mapped to FormParams.agent_pct. Included in closing costs and AfA
 *     basis. Default 0 (omitted if caller does not supply it).
 *
 *   grundsteuer_annual
 *     Mapped to FormParams.grundsteuer_annual. Deducted from taxable income
 *     and from cash flow. Default 0.
 *
 *   energy_class
 *     Mapped to FormParams.energy_class as metadata passthrough. Has no
 *     effect on local calculations — localCompute() does not gate any logic
 *     on it. The backend uses it for §7b EStG Sonder-AfA eligibility.
 *
 *   special_afa_rate_input / special_afa_years
 *     Passed to FormParams and now fully implemented in localCompute():
 *     Sonder-AfA is computed per year for yr ≤ special_afa_years and
 *     deducted from taxable income. afa_sonder in year_data is populated.
 *
 *   land_share_pct  (Bodenanteil)
 *     Clamped to [0, 100]. Default 20.0 (typical German residential
 *     Bodenanteil; used only when the caller passes no value).
 *
 *   interest_rate / repayment_rate / transfer_tax_pct / notary_pct
 *     All carry reasonable German-market defaults (3.8 / 2.0 / 6.0 / 2.0).
 *
 *   hausgeld_monthly / maintenance_nd / management_nd
 *     Default 0; callers should supply these for meaningful previews.
 *
 *   rent_growth / appreciation
 *     Default 2.0 (conservative German average).
 *
 *   tax_rate
 *     Default 42.0 (top German income-tax bracket used as conservative
 *     fallback; callers should supply the actual marginal rate).
 *
 *   vacancy_rate
 *     Default 1.0 (1%).
 *
 *   holding_years
 *     Default 10. Affects IRR horizon selection in localCompute.
 *
 *   special_afa_enabled
 *     Default false. When true (with special_afa_rate_input and
 *     special_afa_years set), localCompute() deducts Sonder-AfA from
 *     taxable income for years 1..special_afa_years.
 *
 *   year_data
 *     localCompute() emits rows [1,2,3,5,7,10,15,20].
 *     Bridge adds cash_flow_monthly (= cash_flow / 12).
 *     afa_sonder is non-null for years where Sonder-AfA was active.
 *
 *   verdict
 *     localCompute() returns human-readable strings ("Strong Buy" etc.).
 *     These are kept as-is; AnalyseResponse.verdict is typed `string`.
 *     The backend uses snake_case ("strong_buy") — do not normalise here
 *     or consumers that compare the two will need separate handling.
 */

import type { AnalyseRequest, AnalyseResponse, AnalyseYearData } from "@/types/api"
import {
  localCompute,
  type FormParams,
  type ComputeResult,
  type YearData,
} from "@/lib/localCompute"

// ─── Numeric safety helpers ───────────────────────────────────────────────────

/**
 * Return `value` if it is a finite number, otherwise return `fallback`.
 * Handles null, undefined, and NaN in one call.
 */
function n(value: number | null | undefined, fallback: number): number {
  return value != null && isFinite(value) ? value : fallback
}

/** Clamp `value` to the inclusive range [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ─── AnalyseRequest → FormParams ─────────────────────────────────────────────

/**
 * Map an AnalyseRequest to the FormParams shape expected by localCompute().
 *
 * All optional numeric fields are resolved to safe defaults here so that
 * localCompute() never receives NaN or undefined.
 */
export function toFormParams(r: AnalyseRequest): FormParams {
  /**
   * Like n() but for optional numeric fields that must stay `undefined`
   * (not a numeric fallback) when absent or invalid. Returns the value if
   * finite, otherwise undefined.
   */
  const opt = (v: number | null | undefined): number | undefined =>
    v != null && isFinite(v) ? v : undefined

  return {
    // ── Identity ──────────────────────────────────────────────────────────
    address: r.address,
    sqm: n(r.sqm, 0),
    year_built: n(r.year_built, 2000),
    condition: r.condition,

    // ── Purchase & financing ──────────────────────────────────────────────
    purchase_price: n(r.purchase_price, 0),
    equity: n(r.equity, 0),
    interest_rate: n(r.interest_rate, 3.8),
    repayment_rate: n(r.repayment_rate, 2.0),
    transfer_tax_pct: n(r.transfer_tax_pct, 6.0),
    notary_pct: n(r.notary_pct, 2.0),
    // agent_pct (Maklerprovision): added to closing costs and AfA basis
    agent_pct: n(r.agent_pct, 0),

    // land_share_pct: clamp to valid percent range; default 20%
    land_share_pct: clamp(n(r.land_share_pct, 20.0), 0, 100),

    // ── Income & costs ────────────────────────────────────────────────────
    rent_monthly: n(r.rent_monthly, 0),
    hausgeld_monthly: n(r.hausgeld_monthly, 0),
    maintenance_nd: n(r.maintenance_nd, 0),
    management_nd: n(r.management_nd, 0),
    // grundsteuer_annual: deducted from taxable income and cash flow
    grundsteuer_annual: n(r.grundsteuer_annual, 0),

    // ── Assumptions ───────────────────────────────────────────────────────
    rent_growth: n(r.rent_growth, 2.0),
    appreciation: n(r.appreciation, 2.0),
    tax_rate: n(r.tax_rate, 42.0),
    vacancy_rate: n(r.vacancy_rate, 1.0),
    holding_years: n(r.holding_years, 10),

    // ── AfA (depreciation) ────────────────────────────────────────────────
    // Intentionally NOT defaulting to 2.0 when null/undefined — passing 0
    // lets localCompute() apply its own condition-based fallback (3% new /
    // 2% existing), which is the correct authoritative source of the default.
    afa_rate_input: n(r.afa_rate_input, 0),

    // special_afa_*: fully implemented in localCompute() — Sonder-AfA is
    // computed per year and deducted from taxable income.
    special_afa_enabled: r.special_afa_enabled ?? false,
    special_afa_rate_input: opt(r.special_afa_rate_input),
    special_afa_years: opt(r.special_afa_years),

    // energy_class: metadata passthrough — no effect on local calculations
    energy_class: r.energy_class,
  }
}

// ─── YearData → AnalyseYearData ──────────────────────────────────────────────

/**
 * Map a single localCompute YearData row to the AnalyseYearData shape.
 *
 * cash_flow_monthly: derived as cash_flow / 12 (not stored in YearData).
 * afa_sonder:        taken from YearData.afa_sonder (non-null only for years
 *                    where Sonder-AfA was active, i.e. yr ≤ special_afa_years).
 */
function mapYearData(y: YearData): AnalyseYearData {
  return {
    year: y.year,
    rent_gross: y.rent_gross,
    interest: y.interest,
    afa: y.afa,
    afa_sonder: y.afa_sonder,
    taxable_income: y.taxable_income,
    tax_impact: y.tax_impact,
    cash_flow: y.cash_flow,
    cash_flow_monthly: y.cash_flow / 12,
    property_value: y.property_value,
    net_worth: y.net_worth,
    equity_multiple: y.equity_multiple,
  }
}

// ─── ComputeResult → AnalyseResponse ─────────────────────────────────────────

/**
 * Map a localCompute ComputeResult to an AnalyseResponse-compatible shape.
 *
 * Callers may optionally supply the original AnalyseRequest so that
 * passthrough fields (afa_method, energy_class annotation) can be echoed.
 */
export function toAnalyseResponse(
  c: ComputeResult,
  source?: AnalyseRequest
): AnalyseResponse {
  return {
    // ── Scoring ───────────────────────────────────────────────────────────
    score: c.score,
    verdict: c.verdict,

    // ── Financing summary ─────────────────────────────────────────────────
    purchase_price: c.purchase_price,
    equity: c.equity,
    loan: c.loan,
    closing_costs: c.closing_costs,
    ltv_pct: c.ltv_pct,

    // ── AfA (depreciation) ────────────────────────────────────────────────
    afa_basis: c.afa_basis,
    annual_afa: c.annual_afa,
    afa_rate_pct: c.afa_rate_pct,
    // Echo the method from the original request; default "linear" because
    // localCompute() uses straight-line depreciation only.
    afa_method: source?.afa_method ?? "linear",
    afa_tax_saving_yr1: c.afa_tax_saving_yr1,

    // ── Yield & cashflow ──────────────────────────────────────────────────
    gross_yield_pct: c.gross_yield_pct,
    net_yield_pct: c.net_yield_pct,
    kpf: c.kpf,
    annuity_monthly: c.annuity_monthly,
    cash_flow_monthly_yr1: c.cash_flow_monthly_yr1,

    // ── IRR & multiples ───────────────────────────────────────────────────
    irr_10: c.irr_10,
    irr_15: c.irr_15,
    irr_20: c.irr_20,
    equity_multiple_10: c.equity_multiple_10,
    equity_multiple_15: c.equity_multiple_15,
    equity_multiple_20: c.equity_multiple_20,

    // ── Year-by-year ──────────────────────────────────────────────────────
    year_data: c.year_data.map(mapYearData),

    // ── Market enrichment (backend-only; always null from local compute) ──
    market_rent_m2: c.market_rent_m2,
    bodenrichtwert_m2: c.bodenrichtwert_m2,
    current_mortgage_rate: c.current_mortgage_rate,
    location_score: c.location_score,
    population_trend: c.population_trend,
    ai_analysis: c.ai_analysis ?? undefined,
    address_resolved: c.address_resolved,
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Run the full local-compute pipeline for offline / preview use.
 *
 * Input:  AnalyseRequest (form state)
 * Output: AnalyseResponse-compatible shape (UI-ready)
 *
 * This is the only function most callers need.
 */
export function runLocalCompute(r: AnalyseRequest): AnalyseResponse {
  return toAnalyseResponse(localCompute(toFormParams(r)), r)
}
