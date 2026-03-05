"use client"

import {
  formatEUR,
  formatPct,
  formatX,
  formatPctDelta,
  formatEURDelta,
  formatXDelta,
} from "@/lib/format"
import type { AnalyseResponse } from "@/types/api"

type Direction = "higher" | "lower" // which side is better

interface KpiRowDef {
  label: string
  valueA: (r: AnalyseResponse) => number | null
  format: (v: number) => string
  formatDelta: (d: number) => string
  better: Direction
}

const ROW_DEFS: KpiRowDef[] = [
  {
    label: "Score",
    valueA: (r) => r.score,
    format: (v) => v.toFixed(1) + " / 10",
    formatDelta: (d) => (d >= 0 ? "+" : "") + d.toFixed(1),
    better: "higher",
  },
  {
    label: "Net Yield",
    valueA: (r) => r.net_yield_pct,
    format: (v) => formatPct(v),
    formatDelta: (d) => formatPctDelta(d),
    better: "higher",
  },
  {
    label: "Gross Yield",
    valueA: (r) => r.gross_yield_pct ?? null,
    format: (v) => formatPct(v),
    formatDelta: (d) => formatPctDelta(d),
    better: "higher",
  },
  {
    label: "Kaufpreisfaktor",
    valueA: (r) => r.kpf,
    format: (v) => formatX(v),
    formatDelta: (d) => formatXDelta(d),
    better: "lower",
  },
  {
    label: "IRR 10 yr",
    valueA: (r) => r.irr_10,
    format: (v) => formatPct(v),
    formatDelta: (d) => formatPctDelta(d),
    better: "higher",
  },
  {
    label: "IRR 15 yr",
    valueA: (r) => r.irr_15,
    format: (v) => formatPct(v),
    formatDelta: (d) => formatPctDelta(d),
    better: "higher",
  },
  {
    label: "IRR 20 yr",
    valueA: (r) => r.irr_20,
    format: (v) => formatPct(v),
    formatDelta: (d) => formatPctDelta(d),
    better: "higher",
  },
  {
    label: "CF / Mo Yr 1",
    valueA: (r) => r.cash_flow_monthly_yr1,
    format: (v) => formatEUR(v),
    formatDelta: (d) => formatEURDelta(d),
    better: "higher",
  },
  {
    label: "Equity Multiple 10 yr",
    valueA: (r) => r.equity_multiple_10,
    format: (v) => formatX(v, 2),
    formatDelta: (d) => formatXDelta(d, 2),
    better: "higher",
  },
  {
    label: "Equity Multiple 15 yr",
    valueA: (r) => r.equity_multiple_15,
    format: (v) => formatX(v, 2),
    formatDelta: (d) => formatXDelta(d, 2),
    better: "higher",
  },
  {
    label: "LTV",
    valueA: (r) => r.ltv_pct ?? null,
    format: (v) => formatPct(v),
    formatDelta: (d) => formatPctDelta(d),
    better: "lower",
  },
  {
    label: "AfA Saving / yr",
    valueA: (r) => r.afa_tax_saving_yr1 ?? null,
    format: (v) => formatEUR(v),
    formatDelta: (d) => formatEURDelta(d),
    better: "higher",
  },
  {
    label: "Annuity / mo",
    valueA: (r) => r.annuity_monthly ?? null,
    format: (v) => formatEUR(v),
    formatDelta: (d) => formatEURDelta(d),
    better: "lower",
  },
  {
    label: "Closing Costs",
    valueA: (r) => r.closing_costs ?? null,
    format: (v) => formatEUR(v),
    formatDelta: (d) => formatEURDelta(d),
    better: "lower",
  },
]

function buildSummary(resultA: AnalyseResponse, resultB: AnalyseResponse): string {
  const parts: string[] = []

  if (resultA.net_yield_pct > resultB.net_yield_pct) {
    parts.push("A has higher net yield")
  } else if (resultB.net_yield_pct > resultA.net_yield_pct) {
    parts.push("B has higher net yield")
  }

  if (resultA.score > resultB.score) {
    parts.push("A scores higher overall")
  } else if (resultB.score > resultA.score) {
    parts.push("B scores higher overall")
  }

  if (resultA.cash_flow_monthly_yr1 > resultB.cash_flow_monthly_yr1) {
    parts.push("A has better cashflow")
  } else if (resultB.cash_flow_monthly_yr1 > resultA.cash_flow_monthly_yr1) {
    parts.push("B has better cashflow")
  }

  if (resultA.kpf < resultB.kpf) {
    parts.push("A has a more attractive price-to-rent ratio")
  } else if (resultB.kpf < resultA.kpf) {
    parts.push("B has a more attractive price-to-rent ratio")
  }

  if (parts.length === 0) return "Both properties have similar metrics."
  return parts.join(" · ") + "."
}

interface CompareTableProps {
  resultA: AnalyseResponse
  resultB: AnalyseResponse
  labelA?: string
  labelB?: string
}

export function CompareTable({
  resultA,
  resultB,
  labelA = "Property A",
  labelB = "Property B",
}: CompareTableProps) {
  const summary = buildSummary(resultA, resultB)

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">Summary: </span>
        {summary}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-bg-elevated">
              <th className="py-3 pl-4 pr-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                KPI
              </th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {labelA}
              </th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {labelB}
              </th>
              <th className="py-3 pl-2 pr-4 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Δ (A − B)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {ROW_DEFS.map((row) => {
              const va = row.valueA(resultA)
              const vb = row.valueA(resultB)

              if (va == null && vb == null) return null

              const delta = va != null && vb != null ? va - vb : null

              const winnerA =
                delta != null &&
                ((row.better === "higher" && delta > 0) ||
                  (row.better === "lower" && delta < 0))
              const winnerB =
                delta != null &&
                ((row.better === "higher" && delta < 0) ||
                  (row.better === "lower" && delta > 0))

              return (
                <tr
                  key={row.label}
                  className="bg-bg-surface hover:bg-bg-elevated transition-colors"
                >
                  <td className="py-2.5 pl-4 pr-2 font-medium text-text-secondary">
                    {row.label}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-mono ${
                      winnerA ? "font-semibold text-success" : "text-text-primary"
                    }`}
                  >
                    {va != null ? row.format(va) : "—"}
                    {winnerA && (
                      <span className="ml-1 text-success">✓</span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-mono ${
                      winnerB ? "font-semibold text-success" : "text-text-primary"
                    }`}
                  >
                    {vb != null ? row.format(vb) : "—"}
                    {winnerB && (
                      <span className="ml-1 text-success">✓</span>
                    )}
                  </td>
                  <td
                    className={`py-2.5 pl-2 pr-4 text-right font-mono text-xs ${
                      delta == null
                        ? "text-text-muted"
                        : winnerA
                        ? "text-success"
                        : winnerB
                        ? "text-danger"
                        : "text-text-muted"
                    }`}
                  >
                    {delta != null ? row.formatDelta(delta) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
