import { MetricCard } from "@/components/metric-card"

export default function PortfolioPage() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[28px] text-text-primary">Portfolio</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track and manage your real estate investments.
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Value"
          value={0}
          prefix={"\u20AC"}
          context="Combined portfolio value"
          sentiment="neutral"
        />
        <MetricCard
          label="Monthly Cash Flow"
          value={0}
          prefix={"\u20AC"}
          context="Net monthly income"
          sentiment="neutral"
        />
        <MetricCard
          label="Avg. Yield"
          value={0}
          suffix="%"
          context="Weighted portfolio yield"
          sentiment="neutral"
        />
        <MetricCard
          label="Properties"
          value={0}
          context="Add your first property"
          sentiment="neutral"
        />
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border-default bg-bg-surface py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-subtle">
          <svg
            className="h-8 w-8 text-brand"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </div>
        <h3 className="mt-4 font-serif text-lg text-text-primary">
          No properties yet
        </h3>
        <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
          Start building your portfolio by analyzing and saving properties from the Properties page.
        </p>
      </div>
    </div>
  )
}
