import { VerdictBadge } from "@/components/verdict-badge"
import { MetricCard } from "@/components/metric-card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-serif text-[28px] text-text-primary">
            Property {id}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Detailed analysis and investment metrics
          </p>
        </div>
        <VerdictBadge verdict="worth_analysing" />
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Purchase Price"
          value={385000}
          prefix={"\u20AC"}
          context="Listed 14 days ago"
          sentiment="neutral"
        />
        <MetricCard
          label="Gross Yield"
          value={4.2}
          suffix="%"
          context="Above city average"
          sentiment="positive"
        />
        <MetricCard
          label="Price per m\u00B2"
          value={5347}
          prefix={"\u20AC"}
          context="Market avg: \u20AC5,120/m\u00B2"
          sentiment="negative"
        />
        <MetricCard
          label="Net Yield"
          value={2.9}
          suffix="%"
          context="After all costs"
          sentiment="neutral"
        />
      </div>

      {/* Placeholder sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
          <h2 className="font-serif text-lg text-text-primary">
            Cash Flow Analysis
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Detailed cash flow projections will be displayed here.
          </p>
          <div className="mt-8 flex h-48 items-center justify-center rounded-lg border border-dashed border-border-default">
            <span className="text-sm text-text-muted">
              Chart placeholder
            </span>
          </div>
        </div>

        <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
          <h2 className="font-serif text-lg text-text-primary">
            Location Insights
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Neighborhood data and demographics will be displayed here.
          </p>
          <div className="mt-8 flex h-48 items-center justify-center rounded-lg border border-dashed border-border-default">
            <span className="text-sm text-text-muted">
              Map placeholder
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
