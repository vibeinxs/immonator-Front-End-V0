// OFFLINE PREVIEW ONLY — do not use for displayed KPIs.
// All authoritative financial calculations live on the Python backend.
// This file is kept for offline/fallback use only.
// Exact port of localCompute() from index.html — all math is identical

export interface FormParams {
  address: string
  sqm: number
  year_built: number
  condition: "existing" | "newbuild"
  purchase_price: number
  equity: number
  interest_rate: number
  repayment_rate: number
  transfer_tax_pct: number
  notary_pct: number
  land_share_pct: number
  rent_monthly: number
  hausgeld_monthly: number
  maintenance_nd: number
  management_nd: number
  rent_growth: number
  appreciation: number
  tax_rate: number
  vacancy_rate: number
  holding_years: number
  afa_rate_input: number
  special_afa_enabled: boolean
  special_afa_rate_input?: number
  special_afa_years?: number
}

export interface YearData {
  year: number
  rent_gross: number
  interest: number
  afa: number
  taxable_income: number
  tax_impact: number
  cash_flow: number
  property_value: number
  net_worth: number
  equity_multiple: number
}

export interface ComputeResult {
  score: number
  verdict: string
  purchase_price: number
  equity: number
  loan: number
  closing_costs: number
  ltv_pct: number
  afa_basis: number
  annual_afa: number
  afa_rate_pct: number
  afa_tax_saving_yr1: number
  annuity_monthly: number
  gross_yield_pct: number
  net_yield_pct: number
  kpf: number
  irr_10: number
  irr_15: number
  irr_20: number
  equity_multiple_10: number
  equity_multiple_15: number
  equity_multiple_20: number
  cash_flow_monthly_yr1: number
  year_data: YearData[]
  // Populated from backend
  market_rent_m2: number | null
  bodenrichtwert_m2: number | null
  current_mortgage_rate: number | null
  location_score: number | null
  population_trend: string | null
  ai_analysis: string | null
  address_resolved: string
}

function calcIRR(flows: number[]): number {
  let r = 0.08
  for (let i = 0; i < 300; i++) {
    let n = 0
    let d = 0
    for (let t = 0; t < flows.length; t++) {
      const p = Math.pow(1 + r, t)
      n += flows[t] / p
      d -= (t * flows[t]) / ((1 + r) * p)
    }
    if (Math.abs(d) < 1e-12) break
    const rn = r - n / d
    if (Math.abs(rn - r) < 1e-9) return rn * 100
    r = rn
  }
  return r * 100
}

export function localCompute(p: FormParams): ComputeResult {
  const grEst = (p.purchase_price * p.transfer_tax_pct) / 100
  const notary = (p.purchase_price * p.notary_pct) / 100
  const closing = grEst + notary
  const loan = p.purchase_price + closing - p.equity
  const ltv = loan / p.purchase_price

  const landV = (p.purchase_price * p.land_share_pct) / 100
  const afaBasis = p.purchase_price + closing - landV

  // afa_rate_input is in percent (e.g. 2.0 = 2%); >1 means it's a percent, divide by 100
  const afaRateRaw =
    p.afa_rate_input > 0 ? p.afa_rate_input : p.condition === "newbuild" ? 3 : 2
  const afaRate = afaRateRaw > 1 ? afaRateRaw / 100 : afaRateRaw
  const annAfA = afaBasis * afaRate

  const mRate = p.interest_rate / 100 / 12
  const annMo = loan * (p.repayment_rate / 100 / 12 + mRate)
  const annAnn = annMo * 12

  let rem = loan
  let cumCF = 0
  const yrs: YearData[] = []
  const iF: Record<number, number[]> = {
    10: [-p.equity],
    15: [-p.equity],
    20: [-p.equity],
  }

  for (let yr = 1; yr <= 30; yr++) {
    const rg =
      p.rent_monthly *
      12 *
      Math.pow(1 + p.rent_growth / 100, yr - 1) *
      (1 - p.vacancy_rate / 100)
    const iy = rem * (p.interest_rate / 100)
    const py = Math.min(annAnn - iy, rem)
    rem = Math.max(0, rem - py)

    const hAnn = p.hausgeld_monthly * 12
    const ti = rg - iy - hAnn - annAfA
    const tax = ti * (p.tax_rate / 100)

    const nd = p.maintenance_nd + p.management_nd
    const aa = rem > 0 ? annAnn : iy + py
    const cf = rg - aa - nd - tax
    cumCF += cf

    const pv = p.purchase_price * Math.pow(1 + p.appreciation / 100, yr)
    const nw = pv - rem
    const em = (nw + cumCF) / p.equity

    yrs.push({
      year: yr,
      rent_gross: rg,
      interest: iy,
      afa: annAfA,
      taxable_income: ti,
      tax_impact: tax,
      cash_flow: cf,
      property_value: pv,
      net_worth: nw,
      equity_multiple: em,
    })

    const ex = pv - rem
    ;[10, 15, 20].forEach((h) => {
      if (yr < h) iF[h].push(cf)
      else if (yr === h) iF[h].push(cf + ex)
    })
  }

  const ar = p.rent_monthly * 12
  const gy = (ar / p.purchase_price) * 100
  const noi =
    ar * (1 - p.vacancy_rate / 100) - p.hausgeld_monthly * 12 - p.maintenance_nd
  const ny = (noi / p.purchase_price) * 100
  const kpf = p.purchase_price / ar

  const yr1 = yrs[0]
  const ts = Math.abs(Math.min(0, yr1.taxable_income * (p.tax_rate / 100)))

  const i10 = calcIRR(iF[10])
  const i15 = calcIRR(iF[15])
  const i20 = calcIRR(iF[20])

  // Score function (identical to index.html)
  const cfMo = yr1.cash_flow / 12
  let s = 0
  s += ny >= 4 ? 2.5 : ny >= 3 ? 1.5 : ny >= 2 ? 0.8 : 0
  s += kpf < 18 ? 2 : kpf < 22 ? 1.5 : kpf < 28 ? 1 : 0.3
  s += i10 > 8 ? 2.5 : i10 > 6 ? 2 : i10 > 4 ? 1.2 : 0.3
  s += cfMo > 0 ? 1.5 : cfMo > -200 ? 0.8 : 0
  s += ltv < 0.6 ? 1.5 : ltv < 0.7 ? 1 : ltv < 0.8 ? 0.5 : 0
  const score = Math.round(Math.min(10, Math.max(0, s)) * 10) / 10

  const verdict =
    score >= 7.5
      ? "Strong Buy"
      : score >= 6.5
        ? "Buy"
        : score >= 5
          ? "Hold / Review"
          : score >= 3.5
            ? "Caution"
            : "Avoid"

  const KEY_YEARS = [1, 2, 3, 5, 7, 10, 15, 20]

  return {
    score,
    verdict,
    purchase_price: p.purchase_price,
    equity: p.equity,
    loan: Math.round(loan),
    closing_costs: Math.round(closing),
    ltv_pct: ltv * 100,
    afa_basis: Math.round(afaBasis),
    annual_afa: Math.round(annAfA),
    afa_rate_pct: afaRate * 100,
    afa_tax_saving_yr1: Math.round(ts),
    annuity_monthly: Math.round(annMo),
    gross_yield_pct: gy,
    net_yield_pct: ny,
    kpf,
    irr_10: i10,
    irr_15: i15,
    irr_20: i20,
    equity_multiple_10: yrs[9]?.equity_multiple ?? 0,
    equity_multiple_15: yrs[14]?.equity_multiple ?? 0,
    equity_multiple_20: yrs[19]?.equity_multiple ?? 0,
    cash_flow_monthly_yr1: cfMo,
    year_data: yrs.filter((y) => KEY_YEARS.includes(y.year)),
    market_rent_m2: null,
    bodenrichtwert_m2: null,
    current_mortgage_rate: null,
    location_score: null,
    population_trend: null,
    ai_analysis: null,
    address_resolved: p.address,
  }
}
