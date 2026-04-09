"use client"

import * as React from "react"
import { useLocale } from "@/lib/i18n/locale-context"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { PropertyAnalysisInput } from "@/features/analysis/schema"
import type { ExtractionResult } from "@/types/api"
import { DocExtractDrawer } from "@/features/analysis/DocExtractDrawer"

// ─── Layout constants ────────────────────────────────────────────────────────

const SECTION = "text-[10px] font-bold uppercase tracking-widest text-text-muted mt-5 mb-2 first:mt-0"
const ROW = "flex items-center justify-between gap-2 py-1.5"
const LABEL = "text-sm text-text-secondary shrink-0"
const INPUT_BASE =
  "w-24 rounded-lg border border-border-default bg-bg-elevated px-2 py-1 text-right text-sm font-mono text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
const INPUT_WIDE =
  "flex-1 rounded-lg border border-border-default bg-bg-elevated px-2 py-1 text-sm text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
const UNIT = "text-xs text-text-muted w-8 text-right shrink-0"

// ─── Reusable sub-patterns ────────────────────────────────────────────────────

/**
 * Num — controlled numeric input.
 * Reused across every monetary and percentage row in the panel.
 */
function Num({
  value,
  onChange,
  className = INPUT_BASE,
  step = "any",
  min,
}: {
  value: number
  onChange: (v: number) => void
  className?: string
  step?: string
  min?: number
}) {
  return (
    <input
      type="number"
      step={step}
      min={min}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={className}
    />
  )
}

/**
 * FieldRow — label + trailing control in a flex row.
 * Used for every single-line field except address.
 */
function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className={ROW}>
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AnalysisInputPanelProps {
  /** The full controlled form value — mirrors AnalyseRequest exactly. */
  value: PropertyAnalysisInput
  /** Called with the updated value on every field change. */
  onChange: (value: PropertyAnalysisInput) => void
  /** Triggered when the user confirms they want to run the analysis. */
  onAnalyse?: () => void
  /** Shows a spinner / disabled state on the analyse button. */
  loading?: boolean
  /**
   * Whether to render the sticky analyse button footer.
   * Default: true. Set to false when embedding inside a larger form
   * that provides its own submit control.
   */
  showAnalyseButton?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalysisInputPanel({
  value,
  onChange,
  onAnalyse,
  loading,
  showAnalyseButton = true,
}: AnalysisInputPanelProps) {
  const { t } = useLocale()
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  /** Type-safe field setter — merges a single key into the controlled value. */
  function set<K extends keyof PropertyAnalysisInput>(
    k: K,
    v: PropertyAnalysisInput[K],
  ) {
    onChange({ ...value, [k]: v })
  }

  function applyExtraction(result: ExtractionResult) {
    onChange({ ...value, ...result.extracted, ...result.assumed } as PropertyAnalysisInput)
  }

  const sonderEnabled = value.special_afa_enabled ?? false

  return (
    <div className="flex flex-col h-full">
      <DocExtractDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={applyExtraction}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ── Extract button ───────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mb-3 w-full rounded-lg border border-brand/40 bg-brand-subtle px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/10"
        >
          {t("extract.button")}
        </button>

        {/* ── Property ─────────────────────────────────────────────────── */}
        <p className={SECTION}>{t("analyse.section.property")}</p>

        {/* Address — full-width text input */}
        <div className="py-1.5">
          <p className={`${LABEL} mb-1`}>{t("analyse.field.address")}</p>
          <input
            type="text"
            value={value.address}
            onChange={(e) => set("address", e.target.value)}
            className={`${INPUT_WIDE} w-full`}
            placeholder={t("analyse.field.addressPlaceholder")}
          />
        </div>

        <FieldRow label={t("analyse.field.area")}>
          <div className="flex items-center gap-1">
            <Num value={value.sqm} onChange={(v) => set("sqm", v)} />
            <span className={UNIT}>m²</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.built")}>
          <Num
            value={value.year_built}
            onChange={(v) => set("year_built", Math.round(v))}
            step="1"
            min={1800}
          />
        </FieldRow>

        {/* Condition — RadioGroup (2 options: better than a dropdown) */}
        <div className="py-1.5">
          <p className={`${LABEL} mb-2`}>{t("analyse.field.condition")}</p>
          <RadioGroup
            value={value.condition}
            onValueChange={(v) => set("condition", v as "existing" | "newbuild")}
            className="flex gap-4"
          >
            {(["existing", "newbuild"] as const).map((c) => (
              <div key={c} className="flex items-center gap-1.5">
                <RadioGroupItem value={c} id={`condition-${c}`} />
                <Label
                  htmlFor={`condition-${c}`}
                  className="text-sm text-text-secondary cursor-pointer"
                >
                  {t(`analyse.condition.${c}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Energy class — Select (9 options: dropdown is appropriate) */}
        <FieldRow label={t("analyse.field.energyClass")}>
          <Select
            value={value.energy_class ?? "A+"}
            onValueChange={(v) => set("energy_class", v)}
          >
            <SelectTrigger size="sm" className="w-24 font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["A+", "A", "B", "C", "D", "E", "F", "G", "H"].map((c) => (
                <SelectItem key={c} value={c} className="font-mono">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* ── Financing ───────────────────────────────────────────────── */}
        <p className={SECTION}>{t("analyse.section.financing")}</p>

        <FieldRow label={t("analyse.field.purchasePrice")}>
          <div className="flex items-center gap-1">
            <Num value={value.purchase_price} onChange={(v) => set("purchase_price", v)} />
            <span className={UNIT}>€</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.equity")}>
          <div className="flex items-center gap-1">
            <Num value={value.equity} onChange={(v) => set("equity", v)} />
            <span className={UNIT}>€</span>
          </div>
        </FieldRow>

        {/* ── Loan Details ─────────────────────────────────────────────── */}
        <p className={SECTION}>{t("analyse.section.loanDetails")}</p>

        <FieldRow label={t("analyse.field.interest")}>
          <div className="flex items-center gap-1">
            <Num value={value.interest_rate ?? 3.8} onChange={(v) => set("interest_rate", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.repayment")}>
          <div className="flex items-center gap-1">
            <Num value={value.repayment_rate ?? 2.0} onChange={(v) => set("repayment_rate", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.transferTax")}>
          <div className="flex items-center gap-1">
            <Num value={value.transfer_tax_pct ?? 6.0} onChange={(v) => set("transfer_tax_pct", v)} step="0.5" />
            <span className={UNIT}>%</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.notary")}>
          <div className="flex items-center gap-1">
            <Num value={value.notary_pct ?? 2.0} onChange={(v) => set("notary_pct", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.agent")}>
          <div className="flex items-center gap-1">
            <Num value={value.agent_pct ?? 0.0} onChange={(v) => set("agent_pct", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.landShare")}>
          <div className="flex items-center gap-1">
            <Num value={value.land_share_pct ?? 20.0} onChange={(v) => set("land_share_pct", v)} step="1" min={0} />
            <span className={UNIT}>%</span>
          </div>
        </FieldRow>

        {/* ── Income & Costs ───────────────────────────────────────────── */}
        <p className={SECTION}>{t("analyse.section.incomeCosts")}</p>

        <FieldRow label={t("analyse.field.rent")}>
          <div className="flex items-center gap-1">
            <Num value={value.rent_monthly} onChange={(v) => set("rent_monthly", v)} />
            <span className="text-xs text-text-muted">€/mo</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.hausgeld")}>
          <div className="flex items-center gap-1">
            <Num value={value.hausgeld_monthly ?? 200} onChange={(v) => set("hausgeld_monthly", v)} />
            <span className="text-xs text-text-muted">€/mo</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.maintenance")}>
          <div className="flex items-center gap-1">
            <Num value={value.maintenance_nd ?? 1200} onChange={(v) => set("maintenance_nd", v)} />
            <span className="text-xs text-text-muted">€/yr</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.management")}>
          <div className="flex items-center gap-1">
            <Num value={value.management_nd ?? 600} onChange={(v) => set("management_nd", v)} />
            <span className="text-xs text-text-muted">€/yr</span>
          </div>
        </FieldRow>

        {/* ── Assumptions ─────────────────────────────────────────────── */}
        <p className={SECTION}>{t("analyse.section.assumptions")}</p>

        <FieldRow label={t("analyse.field.rentGrowth")}>
          <div className="flex items-center gap-1">
            <Num value={value.rent_growth ?? 2} onChange={(v) => set("rent_growth", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.appreciation")}>
          <div className="flex items-center gap-1">
            <Num value={value.appreciation ?? 2} onChange={(v) => set("appreciation", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.taxRate")}>
          <div className="flex items-center gap-1">
            <Num value={value.tax_rate ?? 42} onChange={(v) => set("tax_rate", v)} step="1" />
            <span className={UNIT}>%</span>
          </div>
        </FieldRow>

        <FieldRow label={t("analyse.field.horizon")}>
          <div className="flex items-center gap-1">
            <Num value={value.holding_years ?? 10} onChange={(v) => set("holding_years", Math.round(v))} step="1" min={1} />
            <span className={UNIT}>{t("analyse.unit.yearShort")}</span>
          </div>
        </FieldRow>

        {/* ── AfA ─────────────────────────────────────────────────────── */}
        <p className={SECTION}>AfA</p>

        <div className="py-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className={LABEL}>{t("analyse.field.afaRate")}</span>
            <span className="w-10 text-right font-mono text-sm text-text-primary">
              {(value.afa_rate_input ?? 2.0).toFixed(1)}%
            </span>
          </div>
          <Slider
            min={0}
            max={7}
            step={0.5}
            value={[value.afa_rate_input ?? 2.0]}
            onValueChange={([v]) => set("afa_rate_input", v)}
            className="[&_[data-slot=slider-range]]:bg-brand [&_[data-slot=slider-thumb]]:border-brand"
          />
        </div>

        {/* ── Vacancy ──────────────────────────────────────────────────── */}
        <p className={SECTION}>{t("analyse.section.vacancy")}</p>

        <div className="flex gap-2 flex-wrap">
          {[1, 3, 5, 8].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set("vacancy_rate", v)}
              className={`rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
                (value.vacancy_rate ?? 1) === v
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border-default bg-bg-elevated text-text-secondary hover:border-brand/50"
              }`}
            >
              {v}%
            </button>
          ))}
        </div>

        {/* ── Sonder-AfA ──────────────────────────────────────────────── */}
        <p className={SECTION}>{t("analyse.section.sonderAfa")}</p>

        <FieldRow label={t("analyse.field.enableSonder")}>
          <Switch
            checked={sonderEnabled}
            onCheckedChange={(checked) => set("special_afa_enabled", checked)}
          />
        </FieldRow>

        {sonderEnabled && (
          <>
            <FieldRow label={t("analyse.field.sonderRate")}>
              <div className="flex items-center gap-1">
                <Num
                  value={value.special_afa_rate_input ?? 5}
                  onChange={(v) => set("special_afa_rate_input", v)}
                  step="1"
                  min={0}
                />
                <span className={UNIT}>%</span>
              </div>
            </FieldRow>
            <FieldRow label={t("analyse.field.years")}>
              <Num
                value={value.special_afa_years ?? 4}
                onChange={(v) => set("special_afa_years", Math.round(v))}
                step="1"
                min={1}
              />
            </FieldRow>
          </>
        )}
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────── */}
      {showAnalyseButton && onAnalyse && (
        <div className="shrink-0 border-t border-border-default p-4">
          <button
            type="button"
            onClick={onAnalyse}
            disabled={loading}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? t("analyse.action.analysing") : t("analyse.action.analyse")}
          </button>
        </div>
      )}
    </div>
  )
}
