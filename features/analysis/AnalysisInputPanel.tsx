"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useLocale } from "@/lib/i18n/locale-context"
import { cn } from "@/lib/utils"
import type { PropertyAnalysisInput } from "@/features/analysis/schema"
import type { ExtractionResult } from "@/types/api"
import { DocExtractDrawer } from "@/features/analysis/DocExtractDrawer"

const SECTION_TITLE = "text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted"
const SECTION_SHELL = "space-y-4 rounded-2xl border border-border-default bg-bg-base/40 p-4"
const ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
const LABEL = "text-sm font-medium text-text-primary"
const DESCRIPTION = "text-xs text-text-muted"
const NUMERIC_INPUT = "h-9 w-28 text-right font-mono"
const UNIT = "text-xs text-text-muted"
const ENERGY_CLASSES = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"] as const
const VACANCY_OPTIONS = [1, 3, 5, 8] as const
const AFA_METHODS = ["linear"] as const
type AfaMethod = (typeof AFA_METHODS)[number]

function isAfaMethod(value: string | null | undefined): value is AfaMethod {
  return value != null && AFA_METHODS.includes(value as AfaMethod)
}

function Section({ title, description, children }: React.PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <section className={SECTION_SHELL}>
      <div className="space-y-1">
        <h3 className={SECTION_TITLE}>{title}</h3>
        {description ? <p className={DESCRIPTION}>{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Row({ label, description, children, alignStart = false }: React.PropsWithChildren<{ label: string; description?: string; alignStart?: boolean }>) {
  return (
    <div className={cn(ROW, alignStart && "items-start")}>
      <div className="space-y-0.5">
        <p className={LABEL}>{label}</p>
        {description ? <p className={DESCRIPTION}>{description}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  )
}

function NumericField({
  id,
  value,
  onChange,
  step = "any",
  min,
  max,
  className,
}: {
  id: string
  value: number | null | undefined
  onChange: (value: number) => void
  step?: number | string
  min?: number
  max?: number
  className?: string
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={value ?? 0}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      className={cn(NUMERIC_INPUT, className)}
    />
  )
}

function NumberWithUnit({
  id,
  value,
  onChange,
  unit,
  step = "any",
  min,
  max,
}: {
  id: string
  value: number | null | undefined
  onChange: (value: number) => void
  unit: string
  step?: number | string
  min?: number
  max?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <NumericField id={id} value={value} onChange={onChange} step={step} min={min} max={max} />
      <span className={UNIT}>{unit}</span>
    </div>
  )
}

export interface AnalysisInputPanelProps {
  value: PropertyAnalysisInput
  onChange: (value: PropertyAnalysisInput) => void
  onAnalyse?: () => void
  loading?: boolean
  showAnalyseButton?: boolean
  idPrefix?: string
  analyseButtonLabel?: string
}

export function AnalysisInputPanel({
  value,
  onChange,
  onAnalyse,
  loading = false,
  showAnalyseButton = true,
  idPrefix = "analysis",
  analyseButtonLabel,
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

  const fieldId = React.useCallback((suffix: string) => `${idPrefix}-${suffix}`, [idPrefix])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Section title={t("analyse.section.property")}>
          <div className="space-y-2">
            <Label htmlFor={fieldId("address")} className={LABEL}>{t("analyse.field.address")}</Label>
            <Input
              id={fieldId("address")}
              value={value.address}
              onChange={(event) => setField("address", event.target.value)}
              placeholder={t("analyse.field.addressPlaceholder")}
            />
          </div>

          <Row label={t("analyse.field.area")}>
            <NumberWithUnit
              id={fieldId("sqm")}
              value={value.sqm}
              onChange={(nextValue) => setField("sqm", nextValue)}
              unit="m²"
              step={1}
              min={1}
            />
          </Row>

          <Row label={t("analyse.field.built")}>
            <NumericField
              id={fieldId("year-built")}
              value={value.year_built}
              onChange={(nextValue) => setField("year_built", Math.round(nextValue))}
              step={1}
              min={1800}
            />
          </Row>

          <div className="space-y-2">
            <Label className={LABEL}>{t("analyse.field.condition")}</Label>
            <RadioGroup
              value={value.condition}
              onValueChange={(nextValue) => setField("condition", nextValue as PropertyAnalysisInput["condition"])}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {(["existing", "newbuild"] as const).map((condition) => (
                <Label
                  key={condition}
                  htmlFor={fieldId(`condition-${condition}`)}
                  className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-elevated px-3 py-2 text-sm font-medium text-text-secondary transition-colors has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand/5 has-[[data-state=checked]]:text-brand"
                >
                  <RadioGroupItem id={fieldId(`condition-${condition}`)} value={condition} />
                  {t(`analyse.condition.${condition}`)}
                </Label>
              ))}
            </RadioGroup>
          </div>

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
        </Section>

        <Section title={t("analyse.section.vacancy")}>
          <div className="space-y-2">
            <Label className={LABEL}>{t("analyse.field.vacancyRate")}</Label>
            <RadioGroup
              value={selectedVacancy}
              onValueChange={(nextValue) => setField("vacancy_rate", Number(nextValue))}
              className="grid grid-cols-2 gap-2"
            >
              {VACANCY_OPTIONS.map((vacancyRate) => (
                <Label
                  key={vacancyRate}
                  htmlFor={fieldId(`vacancy-${vacancyRate}`)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-elevated px-3 py-2 text-sm font-medium text-text-secondary transition-colors has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand/5 has-[[data-state=checked]]:text-brand"
                >
                  <RadioGroupItem id={fieldId(`vacancy-${vacancyRate}`)} value={String(vacancyRate)} />
                  {vacancyRate}%
                </Label>
              ))}
            </RadioGroup>
          </div>
        </Section>

        <Section title={t("analyse.section.sonderAfa")}>
          <Row
            label={t("analyse.field.enableSonder")}
            description={t("analyse.field.enableSonderHint")}
          >
            <Switch checked={specialAfaEnabled} onCheckedChange={(checked) => setField("special_afa_enabled", checked)} />
          </Row>

          {specialAfaEnabled ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border-default bg-bg-elevated/70 p-3">
              <Row label={t("analyse.field.sonderRate")}>
                <NumberWithUnit id={fieldId("special-afa-rate")} value={value.special_afa_rate_input ?? 5} onChange={(nextValue) => setField("special_afa_rate_input", nextValue)} unit="%" step={1} min={0} />
              </Row>
              <Row label={t("analyse.field.years")}>
                <NumberWithUnit id={fieldId("special-afa-years")} value={value.special_afa_years ?? 4} onChange={(nextValue) => setField("special_afa_years", Math.round(nextValue))} unit={t("analyse.unit.yearShort")} step={1} min={1} />
              </Row>
            </div>
          ) : null}
        </Section>
      </div>

      {showAnalyseButton && onAnalyse ? (
        <div className="shrink-0 border-t border-border-default bg-bg-surface p-4">
          <Button type="button" onClick={onAnalyse} disabled={loading} className="h-11 w-full rounded-xl bg-brand text-white hover:bg-brand-hover">
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? t("analyse.action.analysing") : analyseButtonLabel ?? t("analyse.action.analyse")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
