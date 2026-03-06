import type { AnalyseRequest, AnalyseResponse, AnalyseYearData } from "@/types/api"
import {
  localCompute,
  type FormParams,
  type ComputeResult,
  type YearData,
} from "@/lib/localCompute"

export function toFormParams(r: AnalyseRequest): FormParams {
  return {
    address: r.address,
    sqm: r.sqm,
    year_built: r.year_built,
    condition: r.condition,
    purchase_price: r.purchase_price,
    equity: r.equity,
    interest_rate: r.interest_rate ?? 3.8,
    repayment_rate: r.repayment_rate ?? 2.0,
    transfer_tax_pct: r.transfer_tax_pct ?? 6.0,
    notary_pct: r.notary_pct ?? 2.0,
    land_share_pct: r.land_share_pct ?? 20.0,
    rent_monthly: r.rent_monthly,
    hausgeld_monthly: r.hausgeld_monthly ?? 0,
    maintenance_nd: r.maintenance_nd ?? 0,
    management_nd: r.management_nd ?? 0,
    rent_growth: r.rent_growth ?? 2.0,
    appreciation: r.appreciation ?? 2.0,
    tax_rate: r.tax_rate ?? 42.0,
    vacancy_rate: r.vacancy_rate ?? 1.0,
    holding_years: r.holding_years ?? 10,
    afa_rate_input: r.afa_rate_input ?? 2.0,
    special_afa_enabled: r.special_afa_enabled ?? false,
    special_afa_rate_input: r.special_afa_rate_input,
    special_afa_years: r.special_afa_years,
  }
}

function mapYearData(y: YearData): AnalyseYearData {
  return {
    year: y.year,
    rent_gross: y.rent_gross,
    interest: y.interest,
    afa: y.afa,
    taxable_income: y.taxable_income,
    tax_impact: y.tax_impact,
    cash_flow: y.cash_flow,
    cash_flow_monthly: y.cash_flow / 12,
    property_value: y.property_value,
    net_worth: y.net_worth,
    equity_multiple: y.equity_multiple,
  }
}

export function toAnalyseResponse(c: ComputeResult): AnalyseResponse {
  return {
    score: c.score,
    verdict: c.verdict,
    purchase_price: c.purchase_price,
    equity: c.equity,
    loan: c.loan,
    closing_costs: c.closing_costs,
    ltv_pct: c.ltv_pct,
    afa_basis: c.afa_basis,
    annual_afa: c.annual_afa,
    afa_rate_pct: c.afa_rate_pct,
    afa_tax_saving_yr1: c.afa_tax_saving_yr1,
    gross_yield_pct: c.gross_yield_pct,
    net_yield_pct: c.net_yield_pct,
    kpf: c.kpf,
    annuity_monthly: c.annuity_monthly,
    cash_flow_monthly_yr1: c.cash_flow_monthly_yr1,
    irr_10: c.irr_10,
    irr_15: c.irr_15,
    irr_20: c.irr_20,
    equity_multiple_10: c.equity_multiple_10,
    equity_multiple_15: c.equity_multiple_15,
    equity_multiple_20: c.equity_multiple_20,
    year_data: c.year_data.map(mapYearData),
    market_rent_m2: c.market_rent_m2,
    bodenrichtwert_m2: c.bodenrichtwert_m2,
    current_mortgage_rate: c.current_mortgage_rate,
    location_score: c.location_score,
    population_trend: c.population_trend,
    ai_analysis: c.ai_analysis ?? undefined,
    address_resolved: c.address_resolved,
  }
}

/** Run localCompute and return an AnalyseResponse-shaped result */
export function runLocalCompute(r: AnalyseRequest): AnalyseResponse {
  return toAnalyseResponse(localCompute(toFormParams(r)))
}
