"use client"

function fmtIrr(v: number) {
  const cls =
    v >= 5 ? "text-success" : v >= 3 ? "text-warning" : "text-danger"
  return <span className={`font-mono font-semibold ${cls}`}>{v.toFixed(1)} %</span>
}

function fmtMultiple(v: number) {
  const cls =
    v >= 2 ? "text-text-primary" : v >= 1.5 ? "text-text-primary" : "text-warning"
  return <span className={`font-mono ${cls}`}>{v.toFixed(2)}×</span>
}

function fmtGain(multiple: number) {
  const gain = (multiple - 1) * 100
  const positive = gain >= 0
  const cls = positive ? "text-success" : "text-danger"
  return (
    <span className={`font-mono font-semibold ${cls}`}>
      {positive ? "+" : ""}
      {gain.toFixed(1)}%
    </span>
  )
}

interface ExitHorizonsTableProps {
  irr_10: number
  irr_15: number
  irr_20: number
  equity_multiple_10: number
  equity_multiple_15: number
  equity_multiple_20: number
  holding_years?: number
}

export function ExitHorizonsTable({
  irr_10,
  irr_15,
  irr_20,
  equity_multiple_10,
  equity_multiple_15,
  equity_multiple_20,
  holding_years,
}: ExitHorizonsTableProps) {
  const rows = [
    { years: 10, irr: irr_10, multiple: equity_multiple_10 },
    { years: 15, irr: irr_15, multiple: equity_multiple_15 },
    { years: 20, irr: irr_20, multiple: equity_multiple_20 },
  ]

  return (
    <div className="overflow-hidden rounded-[14px] border border-border-default bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border-default px-5 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Returns at Exit Horizons</h3>
        <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted">
          IRR &amp; Equity Multiple
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-elevated">
            <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Horizon
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted">
              IRR
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Equity Multiple
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Net Gain on Equity
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const highlight = r.years === holding_years
            return (
              <tr
                key={r.years}
                className={`border-b border-border-default last:border-0 ${
                  highlight ? "bg-brand/5" : "hover:bg-bg-elevated/50"
                }`}
              >
                <td className="px-5 py-3 font-medium text-text-primary">
                  {r.years} years
                  {highlight && (
                    <span className="ml-2 rounded-sm bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand">
                      target
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">{fmtIrr(r.irr)}</td>
                <td className="px-5 py-3">{fmtMultiple(r.multiple)}</td>
                <td className="px-5 py-3">{fmtGain(r.multiple)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
