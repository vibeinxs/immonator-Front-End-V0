"use client"

import { useState } from "react"
import type { AnalyseRequest } from "@/types/api"

const SECTION = "text-[10px] font-bold uppercase tracking-widest text-text-muted mt-5 mb-2 first:mt-0"
const ROW = "flex items-center justify-between gap-2 py-1.5"
const LABEL = "text-sm text-text-secondary shrink-0"
const INPUT_BASE =
  "w-24 rounded-lg border border-border-default bg-bg-elevated px-2 py-1 text-right text-sm font-mono text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
const INPUT_WIDE =
  "flex-1 rounded-lg border border-border-default bg-bg-elevated px-2 py-1 text-sm text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
const UNIT = "text-xs text-text-muted w-8 text-right shrink-0"

interface AnalysisInputPanelProps {
  input: AnalyseRequest
  onChange: (input: AnalyseRequest) => void
  onAnalyse: () => void
  loading?: boolean
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
}: AnalysisInputPanelProps) {
  const set = <K extends keyof AnalyseRequest>(k: K, v: AnalyseRequest[K]) =>
    onChange({ ...input, [k]: v })

  const sonderEnabled = input.special_afa_enabled ?? false
  const [bankFinanced, setBankFinanced] = useState(true)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* PROPERTY */}
        <p className={SECTION}>Property</p>

        <div className="py-1.5">
          <p className={`${LABEL} mb-1`}>Address</p>
          <input
            type="text"
            value={input.address}
            onChange={(e) => set("address", e.target.value)}
            className={`${INPUT_WIDE} w-full`}
            placeholder="Street, City"
          />
        </div>

        <div className={ROW}>
          <span className={LABEL}>Area</span>
          <div className="flex items-center gap-1">
            <Num value={input.sqm} onChange={(v) => set("sqm", v)} />
            <span className={UNIT}>m²</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Built</span>
          <Num
            value={input.year_built}
            onChange={(v) => set("year_built", Math.round(v))}
            step="1"
            min={1800}
          />
        </div>

        <div className={ROW}>
          <span className={LABEL}>Condition</span>
          <select
            value={input.condition}
            onChange={(e) => set("condition", e.target.value as "existing" | "newbuild")}
            className={`${INPUT_BASE} cursor-pointer`}
          >
            <option value="existing">Existing building</option>
            <option value="newbuild">New build</option>
          </select>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Energy class</span>
          <select
            value={input.energy_class ?? ""}
            onChange={(e) => set("energy_class", e.target.value)}
            className={`${INPUT_BASE} cursor-pointer`}
          >
            {["A+", "A", "B", "C", "D", "E", "F", "G", "H"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* FINANCING */}
        <p className={SECTION}>Financing</p>

        <div className={ROW}>
          <span className={LABEL}>Purchase price</span>
          <div className="flex items-center gap-1">
            <Num value={input.purchase_price} onChange={(v) => set("purchase_price", v)} />
            <span className={UNIT}>€</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Bank financed</span>
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
          <span className={LABEL}>Equity</span>
          <div className="flex items-center gap-2">
            <Num value={input.equity} onChange={(v) => set("equity", v)} />
            <span className="text-xs text-text-muted">€</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Interest</span>
          <div className="flex items-center gap-1">
            <Num value={input.interest_rate ?? 3.8} onChange={(v) => set("interest_rate", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Repayment</span>
          <div className="flex items-center gap-1">
            <Num value={input.repayment_rate ?? 2.0} onChange={(v) => set("repayment_rate", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>GrESt</span>
          <div className="flex items-center gap-2">
            <Num value={input.transfer_tax_pct ?? 6.0} onChange={(v) => set("transfer_tax_pct", v)} step="0.5" />
            <span className="text-xs text-text-muted">%</span>
            <span className={LABEL}>Notary</span>
            <Num value={input.notary_pct ?? 2.0} onChange={(v) => set("notary_pct", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Land value</span>
          <div className="flex items-center gap-1">
            <Num
              value={Math.round((input.purchase_price * (input.land_share_pct ?? 20)) / 100)}
              onChange={(v) => set("land_share_pct", input.purchase_price > 0 ? (v / input.purchase_price) * 100 : 0)}
            />
            <span className={UNIT}>€</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Makler</span>
          <div className="flex items-center gap-1">
            <Num value={input.agent_pct ?? 0} onChange={(v) => set("agent_pct", v)} step="0.1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className="mt-1">
          <p className={`text-[11px] font-medium ${(input.land_share_pct ?? 20) >= 20 ? "text-brand" : "text-text-muted"}`}>
            = {(input.land_share_pct ?? 20).toFixed(1)}% of purchase price —{" "}
            {(input.land_share_pct ?? 20) >= 20 ? "good AfA advantage" : "low AfA advantage"}
          </p>
        </div>

        {/* INCOME & COSTS */}
        <p className={SECTION}>Income &amp; Costs</p>

        <div className={ROW}>
          <span className={LABEL}>Cold rent</span>
          <div className="flex items-center gap-1">
            <Num value={input.rent_monthly} onChange={(v) => set("rent_monthly", v)} />
            <span className={UNIT}>€/mo</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Hausgeld</span>
          <div className="flex items-center gap-1">
            <Num value={input.hausgeld_monthly ?? 0} onChange={(v) => set("hausgeld_monthly", v)} />
            <span className={UNIT}>€/mo</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Maintenance</span>
          <div className="flex items-center gap-1">
            <Num value={input.maintenance_nd ?? 0} onChange={(v) => set("maintenance_nd", v)} />
            <span className={UNIT}>€/yr</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Management</span>
          <div className="flex items-center gap-1">
            <Num value={input.management_nd ?? 0} onChange={(v) => set("management_nd", v)} />
            <span className={UNIT}>€/yr</span>
          </div>
        </div>

        {/* ASSUMPTIONS */}
        <p className={SECTION}>Assumptions</p>

        <div className={ROW}>
          <span className={LABEL}>Rent growth</span>
          <div className="flex items-center gap-1">
            <Num value={input.rent_growth ?? 2.0} onChange={(v) => set("rent_growth", v)} step="0.5" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Appreciation</span>
          <div className="flex items-center gap-1">
            <Num value={input.appreciation ?? 2.0} onChange={(v) => set("appreciation", v)} step="0.5" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Tax rate</span>
          <div className="flex items-center gap-1">
            <Num value={input.tax_rate ?? 42} onChange={(v) => set("tax_rate", v)} step="1" />
            <span className={UNIT}>%</span>
          </div>
        </div>

        <div className={ROW}>
          <span className={LABEL}>Horizon</span>
          <div className="flex items-center gap-1">
            <Num value={input.holding_years ?? 10} onChange={(v) => set("holding_years", Math.round(v))} step="1" min={1} />
            <span className={UNIT}>yr</span>
          </div>
        </div>

        {/* AfA */}
        <p className={SECTION}>AfA</p>

        <div className={ROW}>
          <span className={LABEL}>AfA rate</span>
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

        {/* VACANCY */}
        <p className={SECTION}>Vacancy</p>

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

        {/* SONDER AfA */}
        <p className={SECTION}>Sonder AfA</p>

        <div className={ROW}>
          <span className={LABEL}>Enable Sonder AfA</span>
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
              <span className={LABEL}>Sonder rate</span>
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
              <span className={LABEL}>Years</span>
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

      {/* Analyse button */}
      <div className="shrink-0 border-t border-border-default p-4">
        <button
          type="button"
          onClick={onAnalyse}
          disabled={loading}
          className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Analysing…" : "Analyse"}
        </button>
      </div>
    </div>
  )
}
