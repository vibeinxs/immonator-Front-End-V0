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
  const latestValueRef = React.useRef(value)

  React.useEffect(() => {
    latestValueRef.current = value
  }, [value])

  const setField = React.useCallback(
    <K extends keyof PropertyAnalysisInput>(field: K, fieldValue: PropertyAnalysisInput[K]) => {
      onChange({ ...latestValueRef.current, [field]: fieldValue })
    },
    [onChange],
  )

  const specialAfaEnabled = value.special_afa_enabled ?? false
  const afaMethod: AfaMethod = isAfaMethod(value.afa_method) ? value.afa_method : "linear"
  const selectedVacancy = String(value.vacancy_rate ?? 1)

  const fieldId = React.useCallback((suffix: string) => `${idPrefix}-${suffix}`, [idPrefix])

  return (
    <div className="flex h-full flex-col">
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

          <Row label={t("analyse.field.energyClass")}>
            <Select value={value.energy_class ?? "A+"} onValueChange={(nextValue) => setField("energy_class", nextValue)}>
              <SelectTrigger className="w-28 font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENERGY_CLASSES.map((energyClass) => (
                  <SelectItem key={energyClass} value={energyClass} className="font-mono">
                    {energyClass}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </Section>

        <Section title={t("analyse.section.financing")}>
          <Row label={t("analyse.field.purchasePrice")}>
            <NumberWithUnit id={fieldId("purchase-price")} value={value.purchase_price} onChange={(nextValue) => setField("purchase_price", nextValue)} unit="€" min={0} />
          </Row>
          <Row label={t("analyse.field.equity")}>
            <NumberWithUnit id={fieldId("equity")} value={value.equity} onChange={(nextValue) => setField("equity", nextValue)} unit="€" min={0} />
          </Row>
          <Row label={t("analyse.field.interest")}>
            <NumberWithUnit id={fieldId("interest")} value={value.interest_rate ?? 3.8} onChange={(nextValue) => setField("interest_rate", nextValue)} unit="%" step={0.1} min={0} />
          </Row>
          <Row label={t("analyse.field.repayment")}>
            <NumberWithUnit id={fieldId("repayment")} value={value.repayment_rate ?? 2} onChange={(nextValue) => setField("repayment_rate", nextValue)} unit="%" step={0.1} min={0} />
          </Row>
          <Row label={t("analyse.field.transferTax")}>
            <NumberWithUnit id={fieldId("transfer-tax")} value={value.transfer_tax_pct ?? 6} onChange={(nextValue) => setField("transfer_tax_pct", nextValue)} unit="%" step={0.1} min={0} />
          </Row>
          <Row label={t("analyse.field.notary")}>
            <NumberWithUnit id={fieldId("notary")} value={value.notary_pct ?? 2} onChange={(nextValue) => setField("notary_pct", nextValue)} unit="%" step={0.1} min={0} />
          </Row>
          <Row label={t("analyse.field.agent")}>
            <NumberWithUnit id={fieldId("agent")} value={value.agent_pct ?? 0} onChange={(nextValue) => setField("agent_pct", nextValue)} unit="%" step={0.1} min={0} />
          </Row>
          <Row label={t("analyse.field.landShare")}>
            <NumberWithUnit id={fieldId("land-share")} value={value.land_share_pct ?? 20} onChange={(nextValue) => setField("land_share_pct", nextValue)} unit="%" step={1} min={0} max={100} />
          </Row>
        </Section>

        <Section title={t("analyse.section.incomeCosts")}>
          <Row label={t("analyse.field.rent")}>
            <NumberWithUnit id={fieldId("rent")} value={value.rent_monthly} onChange={(nextValue) => setField("rent_monthly", nextValue)} unit="€/mo" min={0} />
          </Row>
          <Row label={t("analyse.field.hausgeld")}>
            <NumberWithUnit id={fieldId("hausgeld")} value={value.hausgeld_monthly ?? 200} onChange={(nextValue) => setField("hausgeld_monthly", nextValue)} unit="€/mo" min={0} />
          </Row>
          <Row label={t("analyse.field.maintenance")}>
            <NumberWithUnit id={fieldId("maintenance")} value={value.maintenance_nd ?? 1200} onChange={(nextValue) => setField("maintenance_nd", nextValue)} unit="€/yr" min={0} />
          </Row>
          <Row label={t("analyse.field.management")}>
            <NumberWithUnit id={fieldId("management")} value={value.management_nd ?? 600} onChange={(nextValue) => setField("management_nd", nextValue)} unit="€/yr" min={0} />
          </Row>
          <Row label={t("analyse.field.propertyTax")}>
            <NumberWithUnit id={fieldId("property-tax")} value={value.grundsteuer_annual ?? 0} onChange={(nextValue) => setField("grundsteuer_annual", nextValue)} unit="€/yr" min={0} />
          </Row>
        </Section>

        <Section title={t("analyse.section.assumptions")}>
          <Row label={t("analyse.field.rentGrowth")}>
            <NumberWithUnit id={fieldId("rent-growth")} value={value.rent_growth ?? 2} onChange={(nextValue) => setField("rent_growth", nextValue)} unit="%" step={0.1} />
          </Row>
          <Row label={t("analyse.field.appreciation")}>
            <NumberWithUnit id={fieldId("appreciation")} value={value.appreciation ?? 2} onChange={(nextValue) => setField("appreciation", nextValue)} unit="%" step={0.1} />
          </Row>
          <Row label={t("analyse.field.taxRate")}>
            <NumberWithUnit id={fieldId("tax-rate")} value={value.tax_rate ?? 42} onChange={(nextValue) => setField("tax_rate", nextValue)} unit="%" step={1} min={0} max={100} />
          </Row>
          <Row label={t("analyse.field.horizon")}>
            <NumberWithUnit id={fieldId("holding-years")} value={value.holding_years ?? 10} onChange={(nextValue) => setField("holding_years", Math.round(nextValue))} unit={t("analyse.unit.yearShort")} step={1} min={1} />
          </Row>
        </Section>

        <Section title="AfA">
          <Row label={t("analyse.field.afaMethod")}>
            <Select value={afaMethod} onValueChange={(nextValue) => setField("afa_method", nextValue)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AFA_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {t(`analyse.afaMethod.${method}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <div className="space-y-3 rounded-xl border border-border-default bg-bg-elevated p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={LABEL}>{t("analyse.field.afaRate")}</p>
                <p className={DESCRIPTION}>{t("analyse.field.afaRateHint")}</p>
              </div>
              <span className="font-mono text-sm font-semibold text-text-primary">{(value.afa_rate_input ?? 2).toFixed(1)}%</span>
            </div>
            <Slider
              min={0}
              max={7}
              step={0.5}
              value={[value.afa_rate_input ?? 2]}
              onValueChange={([nextValue]) => setField("afa_rate_input", nextValue ?? 0)}
              className="[&_[data-slot=slider-range]]:bg-brand [&_[data-slot=slider-thumb]]:border-brand"
            />
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
