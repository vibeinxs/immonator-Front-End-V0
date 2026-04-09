"use client"

import { useState, useRef } from "react"
import { Calculator, Link2, Loader2, X } from "lucide-react"
import { localCompute, type FormParams, type ComputeResult } from "@/lib/localCompute"
import { cn } from "@/lib/utils"

// ─── Config ──────────────────────────────────────────────────────────────────
const BACKEND_URL = "https://web-production-61c120.up.railway.app"

const DEFAULTS = {
  address: "Rotebühlstraße 120, 70197 Stuttgart",
  sqm: 78,
  year_built: 1992,
  condition: "existing" as const,
  purchase_price: 420000,
  equity: 100000,
  interest_rate: 3.8,
  repayment_rate: 2.0,
  transfer_tax_pct: 6.0,
  notary_pct: 2.0,
  land_share_pct: 20,
  rent_monthly: 1420,
  hausgeld_monthly: 200,
  maintenance_nd: 1200,
  management_nd: 600,
  rent_growth: 2.0,
  appreciation: 2.0,
  tax_rate: 44,
  holding_years: 10,
}

const STEPS = [
  "Computing closing costs…",
  "Building AfA schedule…",
  "Running amortisation table…",
  "Calculating taxable income…",
  "Computing IRR…",
  "Fetching market data…",
]

type Tab = "overview" | "projections" | "ai" | "market"
type VacancyOpt = 1 | 3 | 5 | 8
type FlagType = "ok" | "warn" | "bad" | "info"

// ─── Formatters ──────────────────────────────────────────────────────────────
const EU = "€\u202f"
const fE = (v: number) =>
  EU + Math.abs(v).toLocaleString("de-DE", { maximumFractionDigits: 0 })
const fP = (v: number, d = 1) => v.toFixed(d).replace(".", ",") + "\u202f%"
const fX = (v: number) => v.toFixed(2).replace(".", ",") + "\u202f×"
const fSign = (v: number) => (v >= 0 ? "+" : "−")

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const R = 31
  const C = 2 * Math.PI * R
  const arc = C * 0.75
  const fill = (score / 10) * arc
  const color = score >= 7 ? "#22c55e" : score >= 5 ? "#f97316" : "#ef4444"
  return (
    <div className="relative w-[74px] h-[74px] shrink-0">
      <svg
        width="74"
        height="74"
        viewBox="0 0 74 74"
        style={{ transform: "rotate(-225deg)" }}
      >
        <circle
          cx="37"
          cy="37"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className="text-border-default"
          strokeDasharray={`${arc} ${C - arc}`}
        />
        <circle
          cx="37"
          cy="37"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${C}`}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[18px] font-bold leading-none">
          {score.toFixed(1)}
        </span>
        <span className="text-[10px] text-text-muted leading-none">/10</span>
      </div>
    </div>
  )
}

// ─── Sidebar helpers ──────────────────────────────────────────────────────────
function SbSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="px-3.5 pb-3.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted mb-1.5 pl-0.5">
        {label}
      </div>
      <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function SbRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-[8px] border-b border-border-default last:border-0">
      <span className="text-[12px] text-text-secondary flex-1 leading-snug">{label}</span>
      <div className="flex items-center gap-1 shrink-0">{children}</div>
    </div>
  )
}

function Num({
  v,
  set,
  unit,
  step = 1,
  min,
  max,
  w = "w-[60px]",
}: {
  v: number
  set: (n: number) => void
  unit: string
  step?: number
  min?: number
  max?: number
  w?: string
}) {
  return (
    <>
      <input
        type="number"
        value={v}
        step={step}
        min={min}
        max={max}
        onChange={(e) => set(Number(e.target.value))}
        className={cn(
          "bg-transparent font-mono text-[12.5px] font-semibold text-right text-text-primary outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          w
        )}
      />
      <span className="font-mono text-[11px] text-text-muted w-5 shrink-0">{unit}</span>
    </>
  )
}

// Half-row split
function HalfRow({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div className="flex border-b border-border-default last:border-0">
      <div className="flex-1 flex items-center gap-1.5 px-3 py-[8px] border-r border-border-default min-w-0">
        {left}
      </div>
      <div className="flex-1 flex items-center gap-1.5 px-3 py-[8px] min-w-0">
        {right}
      </div>
    </div>
  )
}

function HalfLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] text-text-secondary flex-1 truncate">{children}</span>
  )
}

// ─── Investment flags ─────────────────────────────────────────────────────────
function buildFlags(
  d: ComputeResult,
  p: FormParams
): Array<[FlagType, string]> {
  const cf = d.cash_flow_monthly_yr1
  const flags: Array<[FlagType, string]> = []

  flags.push([
    d.kpf < 25 ? "ok" : "warn",
    `Kaufpreisfaktor ${fX(d.kpf)} — ${d.kpf < 25 ? "fair value" : "above 25× threshold"}`,
  ])

  if (d.net_yield_pct > 3.5)
    flags.push(["ok", `Net yield ${fP(d.net_yield_pct)} exceeds 3.5% target`])
  else if (d.net_yield_pct > 2.5)
    flags.push(["warn", `Net yield ${fP(d.net_yield_pct)} — below 3.5% target`])
  else
    flags.push(["bad", `Net yield ${fP(d.net_yield_pct)} — significantly below market`])

  flags.push([
    cf >= 0 ? "ok" : "warn",
    `Yr 1 cash flow: ${fSign(cf)}€${Math.abs(Math.round(cf)).toLocaleString("de-DE")}/mo after tax & debt`,
  ])

  flags.push([
    d.ltv_pct <= 80 ? "ok" : "bad",
    `LTV ${fP(d.ltv_pct)} — ${d.ltv_pct <= 80 ? "within bank limits" : "exceeds 80% limit"}`,
  ])

  flags.push([
    "info",
    `AfA €${d.annual_afa.toLocaleString("de-DE")}/yr → €${d.afa_tax_saving_yr1.toLocaleString("de-DE")} tax saving yr 1`,
  ])

  if (d.market_rent_m2 && p.sqm > 0) {
    const rentM2 = p.rent_monthly / p.sqm
    flags.push([
      rentM2 > d.market_rent_m2 * 1.1 ? "warn" : "ok",
      `Rent €${rentM2.toFixed(1)}/m² vs market €${d.market_rent_m2}/m²`,
    ])
  }

  return flags
}

const flagDotCls: Record<FlagType, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  bad: "bg-danger",
  info: "bg-brand",
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StandaloneAnalyser() {
  // ── Form state ──────────────────────────────────────────────────────────
  const [addr, setAddr] = useState(DEFAULTS.address)
  const [sqm, setSqm] = useState(DEFAULTS.sqm)
  const [yearBuilt, setYearBuilt] = useState(DEFAULTS.year_built)
  const [condition, setCondition] = useState<"existing" | "newbuild">(
    DEFAULTS.condition
  )
  const [price, setPrice] = useState(DEFAULTS.purchase_price)
  const [equity, setEquity] = useState(DEFAULTS.equity)
  const [interest, setInterest] = useState(DEFAULTS.interest_rate)
  const [repayment, setRepayment] = useState(DEFAULTS.repayment_rate)
  const [grest, setGrest] = useState(DEFAULTS.transfer_tax_pct)
  const [notary, setNotary] = useState(DEFAULTS.notary_pct)
  const [landShare, setLandShare] = useState(DEFAULTS.land_share_pct)
  const [rent, setRent] = useState(DEFAULTS.rent_monthly)
  const [hausgeld, setHausgeld] = useState(DEFAULTS.hausgeld_monthly)
  const [maintenance, setMaintenance] = useState(DEFAULTS.maintenance_nd)
  const [mgmt, setMgmt] = useState(DEFAULTS.management_nd)
  const [rentGrowth, setRentGrowth] = useState(DEFAULTS.rent_growth)
  const [apprecRate, setApprecRate] = useState(DEFAULTS.appreciation)
  const [taxRate, setTaxRate] = useState(DEFAULTS.tax_rate)
  const [horizon, setHorizon] = useState(DEFAULTS.holding_years)
  const [afaRate, setAfaRate] = useState(2.0)
  const [sonderAfa, setSonderAfa] = useState(false)
  const [vacancy, setVacancy] = useState<VacancyOpt>(3)

  // ── UI state ─────────────────────────────────────────────────────────────
  const [result, setResult] = useState<ComputeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [tab, setTab] = useState<Tab>("overview")
  const [urlInput, setUrlInput] = useState("")
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [urlBusy, setUrlBusy] = useState(false)
  const [urlDone, setUrlDone] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Build FormParams from current state ──────────────────────────────────
  const formParams = (): FormParams => ({
    address: addr,
    sqm,
    year_built: yearBuilt,
    condition,
    purchase_price: price,
    equity,
    interest_rate: interest,
    repayment_rate: repayment,
    transfer_tax_pct: grest,
    notary_pct: notary,
    land_share_pct: landShare,
    rent_monthly: rent,
    hausgeld_monthly: hausgeld,
    maintenance_nd: maintenance,
    management_nd: mgmt,
    rent_growth: rentGrowth,
    appreciation: apprecRate,
    tax_rate: taxRate,
    vacancy_rate: vacancy,
    holding_years: horizon,
    afa_rate_input: afaRate,
    special_afa_enabled: sonderAfa,
  })

  // ── Run analysis ─────────────────────────────────────────────────────────
  async function runAnalysis() {
    setLoading(true)
    setResult(null)
    setTab("overview")
    setStepIdx(0)

    let si = 0
    timerRef.current = setInterval(() => {
      si = Math.min(si + 1, STEPS.length - 1)
      setStepIdx(si)
    }, 750)

    const p = formParams()
    const computed = localCompute(p)

    try {
      const res = await fetch(`${BACKEND_URL}/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      })
      if (res.ok) {
        const data = await res.json()
        computed.market_rent_m2 = data.market_rent_m2 ?? null
        computed.bodenrichtwert_m2 = data.bodenrichtwert_m2 ?? null
        computed.current_mortgage_rate = data.current_mortgage_rate ?? null
        computed.location_score = data.location_score ?? null
        computed.population_trend = data.population_trend ?? null
        computed.address_resolved = data.address_resolved || addr
        if (data.ai_analysis) computed.ai_analysis = data.ai_analysis
      }
    } catch {
      // Market data optional — local calculations are still complete
    }

    if (timerRef.current) clearInterval(timerRef.current)
    setResult(computed)
    setLoading(false)
  }

  // ── Add via URL ───────────────────────────────────────────────────────────
  async function submitUrl() {
    if (!urlInput.trim()) return
    setUrlBusy(true)
    try {
      const res = await fetch(`${BACKEND_URL}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.price) setPrice(data.price)
        if (data.rent_monthly) setRent(data.rent_monthly)
        if (data.sqm) setSqm(data.sqm)
        if (data.address) setAddr(data.address)
        if (data.year_built) setYearBuilt(data.year_built)
      }
    } catch {
      // Silently show done — user can correct fields manually
    }
    setUrlBusy(false)
    setUrlDone(true)
  }

  const p = formParams()

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100dvh-58px-74px)] md:h-[calc(100dvh-58px)] overflow-hidden bg-bg-base">
      {/* ══════════════════ SIDEBAR ══════════════════ */}
      <aside className="w-[336px] shrink-0 flex flex-col overflow-hidden bg-bg-surface border-r border-border-default">
        {/* Header */}
        <div className="px-3.5 pt-4 pb-3 border-b border-border-default shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-[16px] font-bold tracking-tight text-text-primary">
                Property Analysis
              </h1>
              <p className="text-[11px] text-text-muted mt-0.5">
                AfA · IRR · 20-yr projection · AI
              </p>
            </div>
            <button
              onClick={() => {
                setShowUrlDialog(true)
                setUrlDone(false)
                setUrlInput("")
              }}
              className="flex items-center gap-1.5 text-[11.5px] font-semibold text-brand bg-brand-subtle px-2.5 py-1.5 rounded-lg hover:bg-brand/15 transition-colors shrink-0"
            >
              <Link2 className="w-3.5 h-3.5" />
              Add via URL
            </button>
          </div>
        </div>

        {/* Scrollable inputs */}
        <div className="flex-1 overflow-y-auto pt-3 space-y-0">
          {/* Property */}
          <SbSection label="Property">
            <div className="flex items-start gap-2 px-3 py-[8px] border-b border-border-default">
              <span className="text-[12px] text-text-secondary mt-px shrink-0">
                Address
              </span>
              <input
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                className="flex-1 bg-transparent text-[12px] font-medium text-text-primary text-right outline-none min-w-0"
                placeholder="Enter address"
              />
            </div>
            <HalfRow
              left={
                <>
                  <HalfLabel>Area</HalfLabel>
                  <Num v={sqm} set={setSqm} unit="m²" w="w-10" />
                </>
              }
              right={
                <>
                  <HalfLabel>Built</HalfLabel>
                  <Num
                    v={yearBuilt}
                    set={setYearBuilt}
                    unit=""
                    step={1}
                    min={1800}
                    max={2030}
                    w="w-12"
                  />
                </>
              }
            />
            <SbRow label="Condition">
              <select
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value as "existing" | "newbuild")
                }
                className="bg-transparent text-[12.5px] font-semibold text-text-primary outline-none cursor-pointer"
              >
                <option value="existing">Existing building</option>
                <option value="newbuild">New build (3% AfA)</option>
              </select>
            </SbRow>
          </SbSection>

          {/* Financing */}
          <SbSection label="Financing">
            <SbRow label="Purchase price">
              <Num v={price} set={setPrice} unit="€" step={5000} w="w-[72px]" />
            </SbRow>
            <HalfRow
              left={
                <>
                  <HalfLabel>Equity</HalfLabel>
                  <Num v={equity} set={setEquity} unit="€" step={5000} w="w-[54px]" />
                </>
              }
              right={
                <>
                  <HalfLabel>Interest</HalfLabel>
                  <Num v={interest} set={setInterest} unit="%" step={0.1} min={0} w="w-9" />
                </>
              }
            />
            <HalfRow
              left={
                <>
                  <HalfLabel>Repayment</HalfLabel>
                  <Num v={repayment} set={setRepayment} unit="%" step={0.1} min={0} w="w-9" />
                </>
              }
              right={
                <>
                  <HalfLabel>GrESt</HalfLabel>
                  <Num v={grest} set={setGrest} unit="%" step={0.5} min={0} w="w-9" />
                </>
              }
            />
            <HalfRow
              left={
                <>
                  <HalfLabel>Notary</HalfLabel>
                  <Num v={notary} set={setNotary} unit="%" step={0.1} min={0} w="w-9" />
                </>
              }
              right={
                <>
                  <HalfLabel>Land share</HalfLabel>
                  <Num
                    v={landShare}
                    set={setLandShare}
                    unit="%"
                    step={5}
                    min={0}
                    max={100}
                    w="w-9"
                  />
                </>
              }
            />
          </SbSection>

          {/* Income & Costs */}
          <SbSection label="Income & Costs">
            <HalfRow
              left={
                <>
                  <HalfLabel>Cold rent</HalfLabel>
                  <Num v={rent} set={setRent} unit="€" step={50} w="w-[52px]" />
                </>
              }
              right={
                <>
                  <HalfLabel>Hausgeld</HalfLabel>
                  <Num v={hausgeld} set={setHausgeld} unit="€" step={10} w="w-[52px]" />
                </>
              }
            />
            <HalfRow
              left={
                <>
                  <HalfLabel>Maintenance</HalfLabel>
                  <Num v={maintenance} set={setMaintenance} unit="€" step={100} w="w-[52px]" />
                </>
              }
              right={
                <>
                  <HalfLabel>Management</HalfLabel>
                  <Num v={mgmt} set={setMgmt} unit="€" step={100} w="w-[52px]" />
                </>
              }
            />
          </SbSection>

          {/* Assumptions */}
          <SbSection label="Assumptions">
            <HalfRow
              left={
                <>
                  <HalfLabel>Rent growth</HalfLabel>
                  <Num v={rentGrowth} set={setRentGrowth} unit="%" step={0.1} w="w-9" />
                </>
              }
              right={
                <>
                  <HalfLabel>Appreciation</HalfLabel>
                  <Num v={apprecRate} set={setApprecRate} unit="%" step={0.1} w="w-9" />
                </>
              }
            />
            <HalfRow
              left={
                <>
                  <HalfLabel>Tax rate</HalfLabel>
                  <Num
                    v={taxRate}
                    set={setTaxRate}
                    unit="%"
                    step={1}
                    min={0}
                    max={100}
                    w="w-9"
                  />
                </>
              }
              right={
                <>
                  <HalfLabel>Horizon</HalfLabel>
                  <Num v={horizon} set={setHorizon} unit="yr" step={1} min={1} max={30} w="w-9" />
                </>
              }
            />

            {/* AfA rate slider */}
            <div className="px-3 py-2.5 border-b border-border-default">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-text-secondary">
                  AfA rate (§7 EStG)
                </span>
                <span className="font-mono text-[11.5px] font-bold text-brand bg-brand-subtle px-2 py-0.5 rounded-md">
                  {afaRate.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={7}
                step={0.1}
                value={afaRate}
                onChange={(e) => setAfaRate(Number(e.target.value))}
                className="w-full h-1.5 accent-brand rounded-full"
              />
            </div>

            {/* Sonder-AfA */}
            <div className="flex items-center gap-2.5 px-3 py-[8px] border-b border-border-default">
              <input
                type="checkbox"
                id="sonderafa"
                checked={sonderAfa}
                onChange={(e) => setSonderAfa(e.target.checked)}
                className="w-[15px] h-[15px] accent-brand rounded shrink-0"
              />
              <label
                htmlFor="sonderafa"
                className="text-[12px] text-text-secondary cursor-pointer leading-snug"
              >
                Sonder-AfA{" "}
                <span className="text-text-muted">(5%/yr · new builds)</span>
              </label>
            </div>

            {/* Vacancy */}
            <div className="px-3 py-2.5">
              <div className="text-[11.5px] text-text-muted mb-2">
                Vacancy rate
              </div>
              <div className="flex gap-1.5">
                {([1, 3, 5, 8] as VacancyOpt[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVacancy(v)}
                    className={cn(
                      "flex-1 py-1.5 text-[12px] font-semibold rounded-lg border transition-colors",
                      vacancy === v
                        ? "bg-brand text-white border-brand"
                        : "border-border-default text-text-secondary hover:border-brand/40 hover:text-brand"
                    )}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </SbSection>
        </div>

        {/* Analyse button */}
        <div className="shrink-0 p-3.5 border-t border-border-default bg-bg-surface">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-3 text-[13.5px] font-bold hover:bg-brand-hover transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            Analyse Now
            <span className="ml-auto font-mono text-[10.5px] opacity-60">
              AI Powered
            </span>
          </button>
        </div>
      </aside>

      {/* ══════════════════ MAIN AREA ══════════════════ */}
      <main className="flex-1 overflow-y-auto relative bg-bg-base">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-base/90 backdrop-blur-sm">
            <div className="bg-bg-surface rounded-2xl shadow-xl border border-border-default p-8 w-80 text-center">
              <div className="text-[16px] font-bold mb-1 text-text-primary">
                Analysing…
              </div>
              <div className="text-[13px] text-text-muted mb-5 min-h-[20px] transition-all">
                {STEPS[stepIdx]}
              </div>
              <div className="h-1 bg-border-default rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-700"
                  style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
                />
              </div>
              <div className="flex gap-2 justify-center">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors duration-300",
                      i <= stepIdx ? "bg-brand" : "bg-border-default"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center">
            <div className="w-16 h-16 bg-bg-surface rounded-2xl border border-border-default flex items-center justify-center text-3xl shadow-sm">
              🏠
            </div>
            <div>
              <div className="text-[19px] font-bold tracking-tight text-text-primary">
                Ready to Analyse
              </div>
              <div className="text-[13.5px] text-text-muted mt-2 max-w-[320px] leading-relaxed">
                Fill in the property details on the left, then click{" "}
                <strong className="text-text-secondary">Analyse Now</strong> to get
                AfA tax savings, IRR projections, and AI commentary.
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {[
                "AfA §7 EStG",
                "IRR 10/15/20yr",
                "Bodenrichtwert",
                "Mietspiegel",
                "AI Analysis",
              ].map((c) => (
                <span
                  key={c}
                  className="text-[11.5px] font-medium text-text-muted bg-bg-surface border border-border-default px-3 py-1.5 rounded-full"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {result && !loading && (
          <>
            {/* Sticky tabs */}
            <div className="sticky top-0 z-10 flex border-b border-border-default bg-bg-surface/95 backdrop-blur px-4">
              {(
                [
                  ["overview", "Overview"],
                  ["projections", "Projections"],
                  ["ai", "AI Analysis"],
                  ["market", "Market Data"],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "py-3 px-4 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap",
                    tab === key
                      ? "text-brand border-brand"
                      : "text-text-muted border-transparent hover:text-text-primary"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {/* ── OVERVIEW ──────────────────────────────────────────────── */}
              {tab === "overview" && (
                <>
                  {/* Verdict hero */}
                  <div className="bg-bg-surface rounded-2xl border border-border-default p-5 flex items-start gap-4">
                    <ScoreRing score={result.score} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1">
                        Investment Verdict
                      </div>
                      <div
                        className={cn(
                          "text-[21px] font-bold tracking-tight leading-none mb-2",
                          result.score >= 7
                            ? "text-success"
                            : result.score >= 5
                              ? "text-warning"
                              : "text-danger"
                        )}
                      >
                        {result.verdict.toUpperCase()}
                      </div>
                      <div className="text-[12.5px] text-text-secondary leading-relaxed">
                        Net yield {fP(result.net_yield_pct)} · Kaufpreisfaktor{" "}
                        {fX(result.kpf)} · IRR {fP(result.irr_10)} (10yr) · AfA{" "}
                        €{result.afa_tax_saving_yr1.toLocaleString("de-DE")}/yr tax
                        saving · CF {fSign(result.cash_flow_monthly_yr1)}€
                        {Math.abs(Math.round(result.cash_flow_monthly_yr1)).toLocaleString(
                          "de-DE"
                        )}
                        /mo
                      </div>
                    </div>
                  </div>

                  {/* KPI grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        v: fP(result.net_yield_pct),
                        l: "Net Rental Yield",
                        b: "Benchmark 3.2%",
                        cls:
                          result.net_yield_pct >= 3.2
                            ? "text-success"
                            : result.net_yield_pct >= 2
                              ? "text-warning"
                              : "text-danger",
                      },
                      {
                        v: fX(result.kpf),
                        l: "Kaufpreisfaktor",
                        b: "Target <25×",
                        cls:
                          result.kpf < 22
                            ? "text-success"
                            : result.kpf < 28
                              ? "text-warning"
                              : "text-danger",
                      },
                      {
                        v: fP(result.irr_10),
                        l: "IRR 10yr",
                        b: "Target >5%",
                        cls:
                          result.irr_10 > 6
                            ? "text-success"
                            : result.irr_10 > 4
                              ? "text-warning"
                              : "text-danger",
                      },
                      {
                        v: `${fSign(result.cash_flow_monthly_yr1)}€${Math.abs(Math.round(result.cash_flow_monthly_yr1)).toLocaleString("de-DE")}/mo`,
                        l: "Cash Flow Yr1",
                        b: "After tax & debt",
                        cls:
                          result.cash_flow_monthly_yr1 > 0
                            ? "text-success"
                            : result.cash_flow_monthly_yr1 > -200
                              ? "text-warning"
                              : "text-danger",
                      },
                      {
                        v: fP(result.ltv_pct),
                        l: "Loan-to-Value",
                        b: "Bank limit 80%",
                        cls:
                          result.ltv_pct < 80
                            ? "text-success"
                            : result.ltv_pct < 90
                              ? "text-warning"
                              : "text-danger",
                      },
                      {
                        v: `€${result.afa_tax_saving_yr1.toLocaleString("de-DE")}`,
                        l: "AfA Tax Saving/yr",
                        b: `${fP(result.afa_rate_pct)} on €${result.afa_basis.toLocaleString("de-DE")}`,
                        cls: "text-text-primary",
                      },
                      {
                        v: `€${result.annuity_monthly.toLocaleString("de-DE")}/mo`,
                        l: "Monthly Annuity",
                        b: "Principal + interest",
                        cls: "text-text-primary",
                      },
                      {
                        v: fE(result.closing_costs),
                        l: "Closing Costs",
                        b: `${fP((result.closing_costs / result.purchase_price) * 100)} of price`,
                        cls: "text-text-primary",
                      },
                    ].map((k, i) => (
                      <div
                        key={i}
                        className="bg-bg-surface rounded-xl border border-border-default p-3.5"
                      >
                        <div
                          className={cn(
                            "font-mono text-[17px] font-bold leading-none mb-1",
                            k.cls
                          )}
                        >
                          {k.v}
                        </div>
                        <div className="text-[11px] font-medium text-text-secondary">
                          {k.l}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5 font-mono leading-tight">
                          {k.b}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cashflow chart + Flags */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Bar chart */}
                    <div className="bg-bg-surface rounded-2xl border border-border-default overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                        <span className="text-[13px] font-semibold">
                          Annual Cash Flow
                        </span>
                        <span className="text-[11px] text-text-muted bg-bg-subtle px-2 py-0.5 rounded-md font-medium">
                          Base Case
                        </span>
                      </div>
                      <div className="px-5 pt-3 pb-4">
                        {(() => {
                          const yrs = [1, 5, 10, 15, 20]
                          const cfs = yrs.map(
                            (yr) =>
                              result.year_data.find((d) => d.year === yr)?.cash_flow ?? 0
                          )
                          const mx = Math.max(...cfs.map(Math.abs), 1)
                          return (
                            <div className="flex items-end gap-2 h-20">
                              {cfs.map((cf, i) => {
                                const h = Math.max(
                                  Math.round((Math.abs(cf) / mx) * 68),
                                  4
                                )
                                const abs = Math.abs(cf)
                                const lbl =
                                  abs >= 1000
                                    ? `${fSign(cf)}€${(abs / 1000).toFixed(1)}k`
                                    : `${fSign(cf)}€${Math.round(abs)}`
                                return (
                                  <div
                                    key={i}
                                    className="flex flex-col items-center flex-1 gap-1"
                                  >
                                    <span className="text-[9px] font-mono text-text-muted">
                                      {lbl}
                                    </span>
                                    <div
                                      className={cn(
                                        "w-full rounded-t-sm",
                                        cf >= 0 ? "bg-success" : "bg-danger"
                                      )}
                                      style={{ height: h }}
                                    />
                                    <span className="text-[9px] font-mono text-text-muted">
                                      Yr{yrs[i]}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Flags */}
                    <div className="bg-bg-surface rounded-2xl border border-border-default overflow-hidden">
                      <div className="px-4 py-3 border-b border-border-default">
                        <span className="text-[13px] font-semibold">
                          Investment Flags
                        </span>
                      </div>
                      <div className="p-4 space-y-2.5">
                        {buildFlags(result, p).map(([type, text], i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div
                              className={cn(
                                "w-[7px] h-[7px] rounded-full shrink-0 mt-[4px]",
                                flagDotCls[type]
                              )}
                            />
                            <span className="text-[12px] text-text-secondary leading-snug">
                              {text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── PROJECTIONS ───────────────────────────────────────────── */}
              {tab === "projections" && (
                <>
                  {/* IRR horizons */}
                  <div className="bg-bg-surface rounded-2xl border border-border-default overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                      <span className="text-[13px] font-semibold">
                        Returns at Exit Horizons
                      </span>
                      <span className="text-[11px] text-text-muted bg-bg-subtle px-2 py-0.5 rounded-md font-medium">
                        IRR & Equity Multiple
                      </span>
                    </div>
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr className="border-b border-border-default bg-bg-subtle">
                          {["Horizon", "IRR", "Equity Multiple", "Net Gain on Equity"].map(
                            (h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-2.5 text-[10.5px] uppercase tracking-wide font-semibold text-text-muted"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            [10, result.irr_10, result.equity_multiple_10],
                            [15, result.irr_15, result.equity_multiple_15],
                            [20, result.irr_20, result.equity_multiple_20],
                          ] as [number, number, number][]
                        ).map(([yr, irr, em]) => {
                          const gain = (em - 1) * 100
                          return (
                            <tr
                              key={yr}
                              className={cn(
                                "border-b border-border-default last:border-0",
                                yr === horizon && "bg-brand-subtle"
                              )}
                            >
                              <td className="px-4 py-2.5 font-medium">
                                {yr} years
                                {yr === horizon && (
                                  <span className="ml-1.5 text-[10px] text-brand font-semibold">
                                    ← your horizon
                                  </span>
                                )}
                              </td>
                              <td
                                className={cn(
                                  "px-4 py-2.5 font-mono font-semibold",
                                  irr > 5 ? "text-success" : "text-danger"
                                )}
                              >
                                {fP(irr)}
                              </td>
                              <td className="px-4 py-2.5 font-mono">{fX(em)}</td>
                              <td
                                className={cn(
                                  "px-4 py-2.5 font-mono",
                                  gain >= 0 ? "text-success" : "text-danger"
                                )}
                              >
                                {gain >= 0 ? "+" : ""}
                                {gain.toFixed(1)}%
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Year-by-year */}
                  <div className="bg-bg-surface rounded-2xl border border-border-default overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                      <span className="text-[13px] font-semibold">
                        Year-by-Year Overview
                      </span>
                      <span className="text-[11px] text-text-muted bg-bg-subtle px-2 py-0.5 rounded-md font-medium">
                        Base Case
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="border-b border-border-default bg-bg-subtle">
                            {[
                              "Year",
                              "Gross Rent",
                              "Interest",
                              "AfA",
                              "Tax Impact",
                              "Cash Flow",
                              "Property Value",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-3.5 py-2.5 text-[10.5px] uppercase tracking-wide font-semibold text-text-muted whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.year_data.map((y) => (
                            <tr
                              key={y.year}
                              className="border-b border-border-default last:border-0 hover:bg-bg-subtle/60 transition-colors"
                            >
                              <td className="px-3.5 py-2 font-medium">Yr {y.year}</td>
                              <td className="px-3.5 py-2 font-mono">{fE(y.rent_gross)}</td>
                              <td className="px-3.5 py-2 font-mono">{fE(y.interest)}</td>
                              <td className="px-3.5 py-2 font-mono">{fE(y.afa)}</td>
                              <td
                                className={cn(
                                  "px-3.5 py-2 font-mono",
                                  y.tax_impact <= 0 ? "text-success" : "text-danger"
                                )}
                              >
                                {y.tax_impact <= 0 ? "+" : "−"}
                                {fE(Math.abs(y.tax_impact))}
                              </td>
                              <td
                                className={cn(
                                  "px-3.5 py-2 font-mono font-semibold",
                                  y.cash_flow >= 0 ? "text-success" : "text-danger"
                                )}
                              >
                                {y.cash_flow >= 0 ? "+" : "−"}
                                {fE(Math.abs(y.cash_flow))}
                              </td>
                              <td className="px-3.5 py-2 font-mono">
                                {fE(y.property_value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-2.5 text-[10.5px] text-text-muted border-t border-border-default">
                      📌 Positive tax impact = refund (Werbungskostenüberschuss). AfA
                      basis excludes land share.
                    </div>
                  </div>
                </>
              )}

              {/* ── AI ANALYSIS ───────────────────────────────────────────── */}
              {tab === "ai" && (
                <div className="bg-bg-surface rounded-2xl border border-border-default overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                    <span className="text-[13px] font-semibold">Expert Analysis</span>
                    <span className="text-[11px] bg-bg-subtle text-text-muted px-2 py-0.5 rounded-md font-medium">
                      AI Powered
                    </span>
                  </div>
                  <div className="p-5 text-[13.5px] leading-[1.75] text-text-primary whitespace-pre-wrap">
                    {result.ai_analysis ||
                      "No AI analysis available.\n\nThe analysis backend may be offline or unreachable. All financial calculations shown in the Overview and Projections tabs are computed locally and are accurate.\n\nYou can try re-running the analysis, or check back when the AI service is available."}
                  </div>
                </div>
              )}

              {/* ── MARKET DATA ───────────────────────────────────────────── */}
              {tab === "market" && (
                <>
                  {/* Market grid */}
                  <div className="bg-bg-surface rounded-2xl border border-border-default overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                      <span className="text-[13px] font-semibold">
                        Live Market Data
                      </span>
                      <span
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-md font-medium",
                          result.market_rent_m2
                            ? "bg-[#d1fadf] text-[#1a7f3c]"
                            : "bg-bg-subtle text-text-muted"
                        )}
                      >
                        {result.market_rent_m2 ? "Live" : "Backend offline"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2">
                      {[
                        {
                          k: "Bodenrichtwert",
                          v: result.bodenrichtwert_m2
                            ? `€${result.bodenrichtwert_m2}/m²`
                            : "N/A",
                          n: "Official land value",
                        },
                        {
                          k: "Rent Index",
                          v: result.market_rent_m2
                            ? `€${result.market_rent_m2}/m²`
                            : "N/A",
                          n: "Mietspiegel",
                        },
                        {
                          k: "Mortgage Rate",
                          v: result.current_mortgage_rate
                            ? `${result.current_mortgage_rate}%`
                            : "N/A",
                          n: "Bundesbank 10yr",
                        },
                        {
                          k: "Location Score",
                          v: result.location_score
                            ? `${result.location_score}/10`
                            : "N/A",
                          n: "OSM amenity score",
                        },
                        {
                          k: "Population Trend",
                          v: result.population_trend || "N/A",
                          n: "Annual growth",
                        },
                        {
                          k: "Address",
                          v: result.address_resolved || addr,
                          n: "Geocoded",
                        },
                      ].map((m, i, arr) => (
                        <div
                          key={m.k}
                          className={cn(
                            "p-4",
                            i % 2 === 0 && "border-r border-border-default",
                            i < arr.length - 2 && "border-b border-border-default"
                          )}
                        >
                          <div className="text-[10.5px] uppercase tracking-wide font-semibold text-text-muted mb-1.5">
                            {m.k}
                          </div>
                          <div className="font-mono text-[16px] font-bold text-text-primary leading-snug">
                            {m.v}
                          </div>
                          <div className="text-[10.5px] text-text-muted mt-1">{m.n}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AfA table */}
                  <div className="bg-bg-surface rounded-2xl border border-border-default overflow-hidden">
                    <div className="px-4 py-3 border-b border-border-default">
                      <span className="text-[13px] font-semibold">
                        AfA Depreciation Summary
                      </span>
                    </div>
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-border-default bg-bg-subtle">
                          {["Parameter", "Value", "Note"].map((h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-2.5 text-[10.5px] uppercase tracking-wide font-semibold text-text-muted"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Purchase price", fE(result.purchase_price), ""],
                          [
                            "Closing costs",
                            fE(result.closing_costs),
                            `GrESt ${grest}% + Notary ${notary}%`,
                          ],
                          [
                            "Land value (excl.)",
                            fE((result.purchase_price * landShare) / 100),
                            `${landShare}% of purchase price`,
                          ],
                          [
                            "AfA basis",
                            fE(result.afa_basis),
                            "Price + Closing − Land",
                          ],
                          [
                            "AfA rate",
                            fP(result.afa_rate_pct),
                            result.afa_rate_pct === 3
                              ? "§7 EStG new build"
                              : "§7 EStG existing building",
                          ],
                          [
                            "Annual AfA",
                            fE(result.annual_afa),
                            "Deductible from rental income",
                          ],
                          [
                            "Tax rate",
                            fP(taxRate),
                            "Marginal rate incl. Solidaritätszuschlag",
                          ],
                          [
                            "Tax saving yr1",
                            fE(result.afa_tax_saving_yr1),
                            "If income negative (Werbungskostenüberschuss)",
                          ],
                        ].map(([a, b, c], i) => (
                          <tr
                            key={i}
                            className="border-b border-border-default last:border-0 hover:bg-bg-subtle/50 transition-colors"
                          >
                            <td className="px-4 py-2.5 text-text-secondary">{a}</td>
                            <td className="px-4 py-2.5 font-mono font-semibold text-text-primary">
                              {b}
                            </td>
                            <td className="px-4 py-2.5 text-text-muted">{c}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* ══════════════════ URL DIALOG ══════════════════ */}
      {showUrlDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUrlDialog(false)
          }}
        >
          <div className="bg-bg-surface rounded-2xl shadow-2xl w-full max-w-[420px] border border-border-default overflow-hidden">
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border-default">
              <div>
                <div className="text-[15px] font-bold text-text-primary">
                  Add Property via URL
                </div>
                <div className="text-[12px] text-text-muted mt-0.5">
                  Paste a listing URL to auto-fill the form
                </div>
              </div>
              <button
                onClick={() => setShowUrlDialog(false)}
                className="w-7 h-7 rounded-full bg-bg-subtle flex items-center justify-center text-text-muted hover:bg-bg-hover transition-colors ml-3 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5">
              {urlDone ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-3">✓</div>
                  <div className="text-[14px] font-semibold text-success mb-1">
                    Property imported!
                  </div>
                  <div className="text-[12.5px] text-text-muted leading-relaxed">
                    The form has been updated with the property data. Click{" "}
                    <strong>Analyse Now</strong> to proceed.
                  </div>
                  <button
                    onClick={() => setShowUrlDialog(false)}
                    className="mt-5 px-6 py-2.5 bg-brand text-white rounded-xl text-[13px] font-semibold hover:bg-brand-hover transition-colors"
                  >
                    Got it
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.immobilienscout24.de/expose/…"
                    className="w-full border border-border-default rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary bg-bg-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-all placeholder:text-text-muted"
                    onKeyDown={(e) => e.key === "Enter" && submitUrl()}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setShowUrlDialog(false)}
                      className="flex-1 py-2.5 bg-bg-subtle text-text-primary rounded-xl text-[13px] font-medium hover:bg-bg-hover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitUrl}
                      disabled={urlBusy || !urlInput.trim()}
                      className="flex-1 py-2.5 bg-brand text-white rounded-xl text-[13px] font-semibold hover:bg-brand-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {urlBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {urlBusy ? "Processing…" : "Import"}
                    </button>
                  </div>
                  <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
                    Supports ImmobilienScout24, Immowelt, and Immonet listings.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
