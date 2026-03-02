"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, ChevronRight } from "lucide-react"
import { MetricCard } from "@/components/metric-card"
import { VerdictBadge } from "@/components/verdict-badge"
import { useLocale } from "@/lib/i18n/locale-context"
import { EUR, cn } from "@/lib/utils"
import { immoApi } from "@/lib/immonatorApi"
import { Dialog, DialogContent } from "@/components/ui/dialog"

/* ── types ───────────────────────────────────────── */
interface UserProfile {
  equity: number
  income: number
  expenses: number
  style: string
  horizon: string
  focus: string
  min_yield: number
  cities: string[]
  types: string[]
}

interface StrategyMatch {
  id: string; title: string; city: string; yield: number; verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
}

interface StrategyData {
  approach: string
  summary: string
  target_yield: number
  max_price: number
  timeline: string
  cities: { name: string; reason: string; yield_range: string }[]
  criteria: string[]
  financing: { type: string; rate: string; ltv: string; recommended: boolean }[]
  matches: StrategyMatch[]
}

const STYLES = ["conservative", "balanced", "growth"] as const
const HORIZONS = ["1-3yr", "3-5yr", "5-10yr", "10yr+"] as const
const FOCUSES = ["cashflow", "appreciation", "both"] as const
const CITIES_LIST = ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", String.fromCharCode(68, 252, 115, 115, 101, 108, 100, 111, 114, 102), "Leipzig", "Dresden"]
const TYPES_LIST = ["Apartment", "House", "Multi-family", "Commercial"]

const STYLE_ICONS: Record<string, string> = { conservative: String.fromCharCode(128737), balanced: String.fromCharCode(9878), growth: String.fromCharCode(128640) }
const FOCUS_ICONS: Record<string, string> = { cashflow: String.fromCharCode(128176), appreciation: String.fromCharCode(128200), both: String.fromCharCode(127919) }

/* ── Wizard ──────────────────────────────────────── */
function StrategyWizard({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete: (p: UserProfile) => void }) {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<UserProfile>({
    equity: 0, income: 0, expenses: 0,
    style: "balanced", horizon: "5-10yr", focus: "both",
    min_yield: 5, cities: [], types: [],
  })

  const totalSteps = 5
  const progress = ((step + 1) / totalSteps) * 100

  const upd = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }))

  const toggleArr = (key: "cities" | "types", val: string) =>
    setProfile((p) => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter((v) => v !== val) : [...p[key], val],
    }))

  const next = () => step < totalSteps - 1 ? setStep(step + 1) : onComplete(profile)
  const canNext = step === 0 ? profile.equity > 0
    : step === 1 ? profile.income > 0
    : step === 4 ? profile.cities.length > 0
    : true

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 bg-bg-surface border-border-default gap-0 [&>button]:hidden">
        {/* Progress bar */}
        <div className="h-0.5 bg-bg-elevated">
          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute right-4 top-4 text-text-muted hover:text-text-primary" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        <div className="px-8 py-12 text-center max-w-lg mx-auto">

          {/* Step 1: Equity */}
          {step === 0 && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl text-text-primary">How much equity do you have available?</h2>
              <input
                type="number"
                value={profile.equity || ""}
                onChange={(e) => upd("equity", Number(e.target.value))}
                placeholder={`${EUR}100,000`}
                className="mt-8 h-16 w-full rounded-xl border border-border-default bg-bg-elevated px-6 text-center font-mono text-2xl text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
              />
              <p className="mt-2 text-sm text-text-muted">Available cash for down payment and closing costs</p>
            </div>
          )}

          {/* Step 2: Monthly finances */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl text-text-primary">Your monthly finances</h2>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Income ({EUR})</label>
                  <input
                    type="number"
                    value={profile.income || ""}
                    onChange={(e) => upd("income", Number(e.target.value))}
                    className="mt-2 h-12 w-full rounded-xl border border-border-default bg-bg-elevated px-4 text-center font-mono text-lg text-text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Expenses ({EUR})</label>
                  <input
                    type="number"
                    value={profile.expenses || ""}
                    onChange={(e) => upd("expenses", Number(e.target.value))}
                    className="mt-2 h-12 w-full rounded-xl border border-border-default bg-bg-elevated px-4 text-center font-mono text-lg text-text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Style + horizon */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl text-text-primary">{"What's your investment style?"}</h2>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => upd("style", s)}
                    className={cn(
                      "rounded-xl border-2 p-5 text-center transition-colors cursor-pointer",
                      profile.style === s ? "border-brand bg-brand-subtle" : "border-border-default hover:border-brand/50"
                    )}
                  >
                    <span className="text-2xl">{STYLE_ICONS[s]}</span>
                    <p className="mt-2 text-sm font-medium capitalize text-text-primary">{s}</p>
                  </button>
                ))}
              </div>
              <p className="mt-8 text-sm font-medium text-text-primary">How long to hold?</p>
              <div className="mt-3 flex rounded-xl bg-bg-elevated p-1 max-w-xs mx-auto">
                {HORIZONS.map((h) => (
                  <button
                    key={h}
                    onClick={() => upd("horizon", h)}
                    className={cn(
                      "flex-1 rounded-lg px-4 py-2 text-sm transition-all",
                      profile.horizon === h ? "bg-bg-surface text-text-primary font-medium shadow-sm" : "text-text-muted"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Focus + yield */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl text-text-primary">What matters most?</h2>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {FOCUSES.map((f) => (
                  <button
                    key={f}
                    onClick={() => upd("focus", f)}
                    className={cn(
                      "rounded-xl border-2 p-5 text-center transition-colors cursor-pointer",
                      profile.focus === f ? "border-brand bg-brand-subtle" : "border-border-default hover:border-brand/50"
                    )}
                  >
                    <span className="text-2xl">{FOCUS_ICONS[f]}</span>
                    <p className="mt-2 text-sm font-medium capitalize text-text-primary">{f}</p>
                  </button>
                ))}
              </div>
              <p className="mt-8 text-sm font-medium text-text-primary">Minimum gross yield:</p>
              <input
                type="range"
                min={2}
                max={10}
                step={0.5}
                value={profile.min_yield}
                onChange={(e) => upd("min_yield", Number(e.target.value))}
                className="mt-3 w-full accent-brand"
              />
              <p className="mt-3 font-serif text-3xl text-brand">{profile.min_yield}% minimum</p>
            </div>
          )}

          {/* Step 5: Cities + types */}
          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl text-text-primary">Where do you want to invest?</h2>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {CITIES_LIST.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleArr("cities", c)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-colors cursor-pointer",
                      profile.cities.includes(c) ? "bg-brand text-white border-brand" : "bg-bg-surface border-border-default text-text-secondary hover:border-brand/50"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {TYPES_LIST.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleArr("types", t)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-colors cursor-pointer",
                      profile.types.includes(t) ? "bg-brand text-white border-brand" : "bg-bg-surface border-border-default text-text-secondary hover:border-brand/50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <button
            onClick={next}
            disabled={!canNext}
            className="mt-8 w-full h-12 rounded-xl bg-brand font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {step < totalSteps - 1 ? "Continue" : "Generate My Strategy"} <ChevronRight className="inline h-4 w-4 ml-1" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main ────────────────────────────────────────── */
export default function StrategyPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [strategy, setStrategy] = useState<StrategyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      immoApi.getUserProfile(),
      immoApi.getStrategy(),
    ]).then(([profileRes, strategyRes]) => {
      setHasProfile(!!profileRes.data)
      if (strategyRes.data) setStrategy(strategyRes.data as unknown as StrategyData)
      setLoading(false)
    })
  }, [])

  // Banner auto-dismiss
  useEffect(() => {
    if (strategy?.matches?.length) {
      const city = strategy.matches[0]?.city
      setBanner(`${strategy.matches.length} matching properties ready in ${city}.`)
      const timer = setTimeout(() => setBanner(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [strategy])

  const handleWizardComplete = useCallback(async (profile: UserProfile) => {
    setWizardOpen(false)
    setLoading(true)
    await immoApi.saveUserProfile(profile as unknown as import("@/lib/immonatorApi").UserProfileData)
    const { data } = await immoApi.getStrategy()
    if (data) setStrategy(data as unknown as StrategyData)
    setHasProfile(true)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="h-8 w-48 rounded-lg bg-bg-elevated animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-[130px] rounded-[14px] bg-bg-elevated animate-pulse" />)}
        </div>
        <div className="h-64 rounded-[14px] bg-bg-elevated animate-pulse" />
      </div>
    )
  }

  /* ── State A: No profile ───────────────────────── */
  if (!hasProfile || !strategy) {
    return (
      <div className="animate-fade-in">
        <StrategyWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onComplete={handleWizardComplete} />
        <div className="max-w-lg mx-auto text-center py-24">
          <h1 className="font-serif text-4xl text-text-primary">What should you be buying?</h1>
          <p className="text-text-secondary mt-4 leading-relaxed">
            Tell Immonator your equity, risk profile, and goals. We will match you with the right cities,
            yields, and financing structures for your budget.
          </p>
          <button
            onClick={() => setWizardOpen(true)}
            className="mt-8 w-full h-12 rounded-xl bg-brand font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Build My Strategy <ChevronRight className="inline h-4 w-4 ml-1" />
          </button>
          <div className="flex justify-center gap-2 mt-5">
            {["Target cities", "Yield thresholds", "Financing"].map((pill) => (
              <span key={pill} className="rounded-full bg-bg-elevated border border-border-default px-3 py-1.5 text-xs text-text-secondary">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── State B: Strategy exists ──────────────────── */
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <StrategyWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onComplete={handleWizardComplete} />

      {/* Banner */}
      {banner && (
        <div className="animate-slide-up rounded-xl bg-brand py-3 px-6 text-sm text-white flex items-center justify-between">
          <span>{banner}</span>
          <button onClick={() => { setBanner(null); router.push("/properties") }} className="font-semibold underline">
            View
          </button>
        </div>
      )}

      {/* Strategy card */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-brand-subtle px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
              {strategy.approach}
            </span>
            <p className="text-sm text-text-secondary">{strategy.summary}</p>
          </div>
          <button onClick={() => setWizardOpen(true)} className="text-sm text-text-muted hover:text-brand transition-colors">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Target Yield" value={strategy.target_yield} suffix="%" sentiment="positive" />
        <MetricCard label="Max Price" value={strategy.max_price} prefix={EUR} sentiment="neutral" />
        <MetricCard label="Timeline" value={strategy.timeline} sentiment="neutral" />
      </div>

      {/* Cities */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {strategy.cities.map((c) => (
          <div key={c.name} className="shrink-0 min-w-[160px] rounded-xl border border-border-default bg-bg-surface p-4">
            <p className="font-serif text-xl text-text-primary">{c.name}</p>
            <p className="mt-1 text-xs text-text-secondary">{c.reason}</p>
            <p className="mt-2 font-mono text-sm text-brand">{c.yield_range}</p>
          </div>
        ))}
      </div>

      {/* Criteria */}
      <div className="grid gap-2 md:grid-cols-2">
        {strategy.criteria.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
            <span className="mt-0.5 text-success font-medium">{"+"}</span>
            <span>{c}</span>
          </div>
        ))}
      </div>

      {/* Financing table */}
      <div className="overflow-hidden rounded-xl border border-border-default bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">Type</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">Rate</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">LTV</th>
            </tr>
          </thead>
          <tbody>
            {strategy.financing.map((f) => (
              <tr key={f.type} className={cn("border-t border-border-default", f.recommended && "bg-brand-subtle/30 font-medium")}>
                <td className="px-4 py-3 text-text-primary">{f.type}{f.recommended && <span className="ml-2 text-[10px] font-bold text-brand">REC</span>}</td>
                <td className="px-4 py-3 text-right font-mono text-text-primary">{f.rate}</td>
                <td className="px-4 py-3 text-right font-mono text-text-primary">{f.ltv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Matching properties */}
      {strategy.matches.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-3">Top Matches</h3>
          <div className="space-y-0 divide-y divide-border-default">
            {strategy.matches.slice(0, 5).map((m) => (
              <div
                key={m.id}
                onClick={() => router.push(`/properties/${m.id}`)}
                className="flex items-center justify-between py-3 cursor-pointer text-sm hover:bg-bg-hover px-2 rounded-lg transition-colors"
              >
                <div>
                  <span className="text-text-primary font-medium">{m.title}</span>
                  <span className="ml-2 text-text-muted">{m.city}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-text-primary">{m.yield.toFixed(1)}%</span>
                  <VerdictBadge verdict={m.verdict} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => router.push("/properties")} className="mt-3 text-sm text-brand hover:underline">
            View All <ChevronRight className="inline h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
