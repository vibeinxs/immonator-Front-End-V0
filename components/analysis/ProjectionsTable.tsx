"use client"

import { EUR } from "@/lib/utils"
import type { YearData } from "./CashflowChart"

function fmtEur(n: number | undefined): string {
  if (n === undefined || n === null) return "—"
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1_000_000)
    return `${sign}${EUR}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)
    return `${sign}${EUR}${(abs / 1_000).toFixed(1)}k`
  return `${sign}${EUR}${Math.round(abs)}`
}

function getCashflow(row: YearData): number | undefined {
  if (row.cashflow_monthly !== undefined) return row.cashflow_monthly
  if (row.cashflow_after_tax !== undefined) {
    return Math.abs(row.cashflow_after_tax) > 5000
      ? row.cashflow_after_tax / 12
      : row.cashflow_after_tax
  }
  if (row.cashflow_pre_tax !== undefined) {
    return Math.abs(row.cashflow_pre_tax) > 5000
      ? row.cashflow_pre_tax / 12
      : row.cashflow_pre_tax
  }
  return undefined
}

function cfClass(v: number | undefined): string {
  if (v === undefined) return "text-text-muted"
  return v >= 0 ? "text-success" : "text-danger"
}

interface ProjectionsTableProps {
  yearData: YearData[]
}

export function ProjectionsTable({ yearData }: ProjectionsTableProps) {
  if (!yearData || yearData.length === 0) {
    return (
      <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
        <p className="text-sm text-text-muted">No year-by-year data available.</p>
      </div>
    )
  }

  const sorted = [...yearData].sort((a, b) => a.year - b.year)

  const hasEquity  = sorted.some((r) => r.equity !== undefined)
  const hasRent    = sorted.some((r) => r.rent !== undefined)
  const hasCumCF   = sorted.some((r) => r.cumulative_cashflow !== undefined)

  return (
    <div className="overflow-x-auto rounded-[14px] border border-border-default bg-bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-elevated">
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Year
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Cashflow/Mo
            </th>
            {hasRent && (
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Rent/Mo
              </th>
            )}
            {hasEquity && (
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Equity
              </th>
            )}
            {hasCumCF && (
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Cumulative CF
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const cf = getCashflow(row)
            const isHighlight = [1, 5, 10, 15, 20].includes(row.year)
            return (
              <tr
                key={row.year}
                className={`border-b border-border-default last:border-0 transition-colors hover:bg-bg-elevated ${
                  isHighlight ? "bg-brand-subtle/30" : ""
                } ${i % 2 === 0 && !isHighlight ? "bg-bg-base/30" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <span
                    className={`font-medium ${
                      isHighlight ? "text-brand" : "text-text-primary"
                    }`}
                  >
                    {row.year}
                    {isHighlight && (
                      <span className="ml-1.5 rounded-sm bg-brand-subtle px-1 text-[9px] font-bold uppercase text-brand">
                        key
                      </span>
                    )}
                  </span>
                </td>
                <td className={`px-4 py-2.5 text-right font-mono ${cfClass(cf)}`}>
                  {cf !== undefined ? (
                    <>
                      {cf >= 0 ? "+" : ""}
                      {fmtEur(cf)}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                {hasRent && (
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {fmtEur(row.rent)}
                  </td>
                )}
                {hasEquity && (
                  <td className="px-4 py-2.5 text-right font-mono text-text-primary">
                    {fmtEur(row.equity)}
                  </td>
                )}
                {hasCumCF && (
                  <td
                    className={`px-4 py-2.5 text-right font-mono ${cfClass(row.cumulative_cashflow)}`}
                  >
                    {row.cumulative_cashflow !== undefined ? (
                      <>
                        {row.cumulative_cashflow >= 0 ? "+" : ""}
                        {fmtEur(row.cumulative_cashflow)}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
