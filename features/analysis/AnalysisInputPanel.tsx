"use client"

import { useState } from "react"
import { useLocale } from "@/lib/i18n/locale-context"
import type { PropertyAnalysisInput } from "@/features/analysis/schema"

const SECTION = "text-[10px] font-bold uppercase tracking-widest text-text-muted mt-5 mb-2 first:mt-0"
const ROW = "flex items-center justify-between gap-2 py-1.5"
const LABEL = "text-sm text-text-secondary shrink-0"
const INPUT_BASE =
  "w-24 rounded-lg border border-border-default bg-bg-elevated px-2 py-1 text-right text-sm font-mono text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
const INPUT_WIDE =
  "flex-1 rounded-lg border border-border-default bg-bg-elevated px-2 py-1 text-sm text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
const UNIT = "text-xs text-text-muted w-8 text-right shrink-0"

interface AnalysisInputPanelProps {
  input: PropertyAnalysisInput
  onChange: (input: PropertyAnalysisInput) => void
  onAnalyse?: () => void
  loading?: boolean
  showAnalyseButton?: boolean
}

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

export function AnalysisInputPanel({
  input,
  onChange,
  onAnalyse,
  loading,
  showAnalyseButton = true,
}: AnalysisInputPanelProps) {
  const { t } = useLocale()
  const set = <K extends keyof PropertyAnalysisInput>(k: K, v: AnalyseRequest[K]) =>
    onChange({ ...input, [k]: v })

  const sonderEnabled = input.special_afa_enabled ?? false
  const [bankFinanced, setBankFinanced] = useState(true)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className={SECTION}>{t("analyse.section.property")}</p>

        <div className="py-1.5">
          <p className={`${LABEL} mb-1`}>{t("analyse.field.address")}</p>
          <input
            type="text"
            value={input.address}
            onChange={(e) => set("address", e.target.value)}
            className={`${INPUT_WIDE} w-full`}
            placeholder={t("analyse.field.addressPlaceholder")}
          />
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.area")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.sqm} onChange={(v) => set("sqm", v)} />
            <span className={UNIT}>m²</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.built")}</span>
          <Num
            value={input.year_built}
            onChange={(v) => set("year_built", Math.round(v))}
            step="1"
            min={1800}
          />
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.condition")}</span>
          <select
            value={input.condition}
            onChange={(e) => set("condition", e.target.value as "existing" | "newbuild")}
            className={`${INPUT_BASE} cursor-pointer`}
          >
            <option value="existing">{t("analyse.condition.existing")}</option>
            <option value="newbuild">{t("analyse.condition.newbuild")}</option>
          </select>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.energyClass")}</span>
          <select
            value={input.energy_class ?? "A+"}
            onChange={(e) => set("energy_class", e.target.value)}
            className={`${INPUT_BASE} cursor-pointer`}
          >
            {["A+", "A", "B", "C", "D", "E", "F", "G", "H"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <p className={SECTION}>{t("analyse.section.financing")}</p>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.purchasePrice")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.purchase_price} onChange={(v) => set("purchase_price", v)} />
            <span className={UNIT}>€</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.bankFinanced")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={bankFinanced}
            onClick={() => setBankFinanced((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${bankFinanced ? "bg-brand" : "bg-border-default"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${bankFinanced ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.equity")}</span>
          <div className="flex items-center gap-2">
            <Num value={input.equity} onChange={(v) => set("equity", v)} />
            <span className="text-xs text-text-muted">€</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.interest")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.interest_rate ?? 3.8} onChange={(v) => set("interest_rate", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.repayment")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.repayment_rate ?? 2.0} onChange={(v) => set("repayment_rate", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.transferTax")}</span>
          <div className="flex items-center gap-2">
            <Num value={input.transfer_tax_pct ?? 6.0} onChange={(v) => set("transfer_tax_pct", v)} step="0.5" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.notary")}</span>
          <div className="flex items-center gap-2">
            <Num value={input.notary_pct ?? 2.0} onChange={(v) => set("notary_pct", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.agent")}</span>
          <div className="flex items-center gap-2">
            <Num value={input.agent_pct ?? 0.0} onChange={(v) => set("agent_pct", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.landShare")}</span>
          <div className="flex items-center gap-2">
            <Num value={input.land_share_pct ?? 20.0} onChange={(v) => set("land_share_pct", v)} step="1" min={0} />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <p className={SECTION}>{t("analyse.section.incomeCosts")}</p>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.rent")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.rent_monthly} onChange={(v) => set("rent_monthly", v)} />
            <span className="text-xs text-text-muted">€/mo</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.hausgeld")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.hausgeld_monthly ?? 200} onChange={(v) => set("hausgeld_monthly", v)} />
            <span className="text-xs text-text-muted">€/mo</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.maintenance")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.maintenance_nd ?? 1200} onChange={(v) => set("maintenance_nd", v)} />
            <span className="text-xs text-text-muted">€/yr</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.management")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.management_nd ?? 600} onChange={(v) => set("management_nd", v)} />
            <span className="text-xs text-text-muted">€/yr</span>
          </div>
        </div>

        <p className={SECTION}>{t("analyse.section.assumptions")}</p>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.rentGrowth")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.rent_growth ?? 2} onChange={(v) => set("rent_growth", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.appreciation")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.appreciation ?? 2} onChange={(v) => set("appreciation", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.taxRate")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.tax_rate ?? 42} onChange={(v) => set("tax_rate", v)} step="1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.horizon")}</span>
          <div className="flex items-center gap-1">
            <Num value={input.holding_years ?? 10} onChange={(v) => set("holding_years", Math.round(v))} step="1" min={1} />
            <span className={UNIT}>{t("analyse.unit.yearShort")}</span>
          </div>
        </div>

        <p className={SECTION}>AfA</p>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.afaRate")}</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={7}
              step={0.5}
              value={input.afa_rate_input ?? 2.0}
              onChange={(e) => set("afa_rate_input", parseFloat(e.target.value))}
              className="w-24 accent-brand"
            />
            <span className="w-10 text-right font-mono text-sm text-text-primary">
              {(input.afa_rate_input ?? 2.0).toFixed(1)}%
            </span>
          </div>
        </div>

        <p className={SECTION}>{t("analyse.section.vacancy")}</p>

        <div className="flex gap-2 flex-wrap">
          {[1, 3, 5, 8].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set("vacancy_rate", v)}
              className={`rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
                (input.vacancy_rate ?? 1) === v
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border-default bg-bg-elevated text-text-secondary hover:border-brand/50"
              }`}
            >
              {v}%
            </button>
          ))}
        </div>

        <p className={SECTION}>{t("analyse.section.sonderAfa")}</p>

        <div className={ROW}>
          <span className={LABEL}>{t("analyse.field.enableSonder")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={sonderEnabled}
            onClick={() => set("special_afa_enabled", !sonderEnabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
              sonderEnabled ? "bg-brand" : "bg-border-default"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                sonderEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {sonderEnabled && (
          <>
            <div className={ROW}>
              <span className={LABEL}>{t("analyse.field.sonderRate")}</span>
              <div className="flex items-center gap-1">
                <Num
                  value={input.special_afa_rate_input ?? 5}
                  onChange={(v) => set("special_afa_rate_input", v)}
                  step="1"
                  min={0}
                />
                <span className={UNIT}>%</span>
              </div>
            </div>
            <div className={ROW}>
              <span className={LABEL}>{t("analyse.field.years")}</span>
              <Num
                value={input.special_afa_years ?? 4}
                onChange={(v) => set("special_afa_years", Math.round(v))}
                step="1"
                min={1}
              />
            </div>
          </>
        )}
      </div>

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
