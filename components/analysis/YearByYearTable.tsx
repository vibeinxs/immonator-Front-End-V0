"use client"

import type { AnalyseYearData } from "@/types/api"

const EUR = "€"
const TARGET_YEARS = [1, 2, 3, 5, 7, 10, 15, 20]

function fmtLarge(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—"
  return `${EUR} ${Math.round(n).toLocaleString("de-DE")}`
}

interface YearByYearTableProps {
  yearData: AnalyseYearData[]
}

export function YearByYearTable({ yearData }: YearByYearTableProps) {
  if (!yearData || yearData.length === 0) {
    return (
      <div className="rounded-[14px] border border-border-default bg-bg-surface p-6 text-sm text-text-muted">
        No year-by-year data available.
      </div>
    )
  }

  const rows = TARGET_YEARS.flatMap((y) => {
    const row = yearData.find((r) => r.year === y)
    return row ? [row] : []
  })

  const hasSonderAfa = rows.some((r) => r.afa_sonder && r.afa_sonder > 0)

  return (
    <div className="overflow-hidden rounded-[14px] border border-border-default bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border-default px-5 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Year-by-Year Overview</h3>
        <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted">
          Base Case
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-bg-elevated">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted">Year</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">Gross Rent</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">Interest</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">AfA (Reg.)</th>
              {hasSonderAfa && (
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">Sonder-AfA</th>
              )}
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">Tax Impact</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">Cash Flow</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">Property Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cf = row.cash_flow_monthly ?? (row.cash_flow != null ? row.cash_flow / 12 : undefined)
              const taxImpact = row.tax_impact
              const taxCls =
                taxImpact == null ? "text-text-muted"
                : taxImpact <= 0 ? "text-success"
                : "text-danger"
              const cfCls =
                cf == null ? "text-text-muted"
                : cf >= 0 ? "text-success"
                : "text-danger"
              return (
                <tr
                  key={row.year}
                  className="border-b border-border-default last:border-0 hover:bg-bg-elevated/40"
                >
                  <td className="px-4 py-2.5 font-medium text-text-primary">Yr {row.year}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {row.rent_gross != null ? fmtLarge(row.rent_gross) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {row.interest != null ? fmtLarge(row.interest) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {row.afa != null ? fmtLarge(row.afa) : "—"}
                  </td>
                  {hasSonderAfa && (
                    <td className="px-4 py-2.5 text-right font-mono text-text-muted">
                      {row.afa_sonder ? fmtLarge(row.afa_sonder) : "—"}
                    </td>
                  )}
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${taxCls}`}>
                    {taxImpact != null ? (
                      <>
                        {taxImpact < 0 ? "+" : taxImpact > 0 ? "-" : ""}
                        {EUR} {Math.abs(Math.round(taxImpact)).toLocaleString("de-DE")}
                      </>
                    ) : "—"}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${cfCls}`}>
                    {cf != null ? (
                      <>
                        {cf >= 0 ? "+" : "-"}
                        {EUR} {Math.abs(Math.round(cf)).toLocaleString("de-DE")}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-primary">
                    {row.property_value != null ? fmtLarge(row.property_value) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border-default px-5 py-3 text-[11px] text-text-muted">
        Positive tax impact = refund (Werbungskostenüberschuss). AfA basis excludes land share.
      </p>
    </div>
  )
}
