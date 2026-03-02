import { MetricCard } from "@/components/metric-card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function MarketPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city } = await params
  const cityName = city.charAt(0).toUpperCase() + city.slice(1)

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Back link */}
      <Link
        href="/properties"
        className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Properties
      </Link>

      {/* Header */}
      <div>
        <h1 className="font-serif text-[28px] text-text-primary">
          {cityName} Market
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Real estate market overview and trends for {cityName}.
        </p>
      </div>

      {/* Market metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Avg. Price / m\u00B2"
          value={0}
          prefix={"\u20AC"}
          context="Loading market data..."
          sentiment="neutral"
        />
        <MetricCard
          label="Avg. Rent / m\u00B2"
          value={0}
          prefix={"\u20AC"}
          context="Loading market data..."
          sentiment="neutral"
        />
        <MetricCard
          label="YoY Price Change"
          value={0}
          suffix="%"
          context="Loading market data..."
          sentiment="neutral"
        />
        <MetricCard
          label="Population"
          value={0}
          context="Loading market data..."
          sentiment="neutral"
        />
      </div>

      {/* Placeholder charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
          <h2 className="font-serif text-lg text-text-primary">
            Price Trend
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Historical price development over the past 5 years.
          </p>
          <div className="mt-8 flex h-56 items-center justify-center rounded-lg border border-dashed border-border-default">
            <span className="text-sm text-text-muted">
              Price chart placeholder
            </span>
          </div>
        </div>

        <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
          <h2 className="font-serif text-lg text-text-primary">
            Rent vs. Buy
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Rental yield comparison across neighborhoods.
          </p>
          <div className="mt-8 flex h-56 items-center justify-center rounded-lg border border-dashed border-border-default">
            <span className="text-sm text-text-muted">
              Comparison chart placeholder
            </span>
          </div>
        </div>
      </div>

      {/* District table placeholder */}
      <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
        <h2 className="font-serif text-lg text-text-primary">
          Districts Overview
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Detailed breakdown by neighborhood.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="pb-3 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  District
                </th>
                <th className="pb-3 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  Avg. Price/m{"\u00B2"}
                </th>
                <th className="pb-3 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  Avg. Rent/m{"\u00B2"}
                </th>
                <th className="pb-3 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  Yield
                </th>
              </tr>
            </thead>
            <tbody>
              {["Mitte", "Kreuzberg", "Charlottenburg"].map((district) => (
                <tr
                  key={district}
                  className="border-b border-border-default last:border-0"
                >
                  <td className="py-4 text-text-primary">{district}</td>
                  <td className="py-4 text-right font-mono text-text-primary">
                    --
                  </td>
                  <td className="py-4 text-right font-mono text-text-primary">
                    --
                  </td>
                  <td className="py-4 text-right font-mono text-text-muted">
                    --
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
