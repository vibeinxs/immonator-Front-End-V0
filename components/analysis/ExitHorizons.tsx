"use client"

interface HorizonData {
  years: number
  irr: number
  equityMultiple: number
}

function irrSentiment(irr: number): { label: string; cls: string } {
  if (irr >= 8) return { label: "Excellent", cls: "text-success" }
  if (irr >= 5) return { label: "Solid",     cls: "text-success" }
  if (irr >= 3) return { label: "Moderate",  cls: "text-warning" }
  return { label: "Weak",        cls: "text-danger" }
}

function HorizonCard({ data }: { data: HorizonData }) {
  const { label, cls } = irrSentiment(data.irr)
  const multiplierCls =
    data.equityMultiple >= 2 ? "text-success"
    : data.equityMultiple >= 1.5 ? "text-text-primary"
    : "text-warning"

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border-default bg-bg-surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          {data.years}Y Exit
        </span>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
          data.irr >= 5 ? "bg-success-bg text-success"
          : data.irr >= 3 ? "bg-warning-bg text-warning"
          : "bg-danger-bg text-danger"
        }`}>
          {label}
        </span>
      </div>

      {/* IRR */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
          IRR
        </p>
        <p className={`mt-0.5 font-mono text-3xl font-bold leading-tight ${cls}`}>
          {data.irr.toFixed(1)}%
        </p>
      </div>

      {/* Equity Multiple */}
      <div className="border-t border-border-default pt-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Equity Multiple
        </p>
        <p className={`mt-0.5 font-mono text-xl font-semibold ${multiplierCls}`}>
          {data.equityMultiple.toFixed(2)}×
        </p>
      </div>
    </div>
  )
}

interface ExitHorizonsProps {
  irr_10: number
  irr_15: number
  irr_20: number
  equity_multiple_10: number
  equity_multiple_15: number
  equity_multiple_20: number
}

export function ExitHorizons({
  irr_10,
  irr_15,
  irr_20,
  equity_multiple_10,
  equity_multiple_15,
  equity_multiple_20,
}: ExitHorizonsProps) {
  const horizons: HorizonData[] = [
    { years: 10, irr: irr_10, equityMultiple: equity_multiple_10 },
    { years: 15, irr: irr_15, equityMultiple: equity_multiple_15 },
    { years: 20, irr: irr_20, equityMultiple: equity_multiple_20 },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {horizons.map((h) => (
        <HorizonCard key={h.years} data={h} />
      ))}
    </div>
  )
}
