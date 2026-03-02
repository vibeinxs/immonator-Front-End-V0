import { MetricCard } from "@/components/metric-card"
import { VerdictBadge } from "@/components/verdict-badge"
import { Search } from "lucide-react"

export default function PropertiesPage() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[28px] text-text-primary">Properties</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Browse and analyze investment properties across Germany.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search by city, address, or property ID..."
          className="w-full rounded-[10px] border border-border-default bg-bg-elevated py-[11px] pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
        />
      </div>

      {/* Summary metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Total Properties"
          value={0}
          context="Add properties to start analyzing"
          sentiment="neutral"
        />
        <MetricCard
          label="Avg. Gross Yield"
          value={0}
          suffix="%"
          context="No data yet"
          sentiment="neutral"
        />
        <MetricCard
          label="Strong Buys"
          value={0}
          context="Properties rated strong buy"
          sentiment="neutral"
        />
      </div>

      {/* Placeholder property cards */}
      <div className="stagger-children grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            address: "Prenzlauer Berg, Berlin",
            price: "385,000",
            yield: "4.2",
            sqm: "72",
            verdict: "worth_analysing" as const,
          },
          {
            address: "Schwabing, Munich",
            price: "520,000",
            yield: "2.8",
            sqm: "65",
            verdict: "proceed_with_caution" as const,
          },
          {
            address: "Ehrenfeld, Cologne",
            price: "245,000",
            yield: "5.1",
            sqm: "58",
            verdict: "strong_buy" as const,
          },
        ].map((property) => (
          <div
            key={property.address}
            className="flex flex-col gap-4 rounded-[14px] border border-border-default bg-bg-surface p-6 transition-colors duration-150 hover:border-border-strong"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {property.address}
                </p>
                <p className="mt-1 font-mono text-2xl text-text-primary">
                  {"\u20AC"}{property.price}
                </p>
              </div>
              <VerdictBadge verdict={property.verdict} />
            </div>
            <div className="flex gap-6 border-t border-border-default pt-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  Yield
                </p>
                <p className="font-mono text-sm text-success">
                  {property.yield}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  Size
                </p>
                <p className="font-mono text-sm text-text-primary">
                  {property.sqm} m{"\u00B2"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
