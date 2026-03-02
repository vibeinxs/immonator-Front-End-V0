import { MetricCard } from "@/components/metric-card"

export default function StrategyPage() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[28px] text-text-primary">Strategy</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Define your investment criteria and let Immonator find matching properties.
        </p>
      </div>

      {/* Strategy metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Target Yield"
          value={0}
          suffix="%"
          context="Set your minimum yield"
          sentiment="neutral"
        />
        <MetricCard
          label="Max Budget"
          value={0}
          prefix={"\u20AC"}
          context="Define your price ceiling"
          sentiment="neutral"
        />
        <MetricCard
          label="Matching Properties"
          value={0}
          context="Set criteria to find matches"
          sentiment="neutral"
        />
      </div>

      {/* Placeholder strategy builder */}
      <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
        <h2 className="font-serif text-lg text-text-primary">
          Investment Criteria
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Configure your investment strategy to receive personalized property recommendations.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            { label: "Min. Gross Yield", placeholder: "e.g., 4.0%" },
            { label: "Max. Purchase Price", placeholder: "e.g., \u20AC500,000" },
            { label: "Preferred Cities", placeholder: "e.g., Berlin, Munich" },
            { label: "Min. Property Size", placeholder: "e.g., 50 m\u00B2" },
          ].map((field) => (
            <div key={field.label} className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                {field.label}
              </label>
              <input
                type="text"
                placeholder={field.placeholder}
                className="rounded-[10px] border border-border-default bg-bg-elevated px-4 py-[11px] text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
              />
            </div>
          ))}
        </div>

        <button className="mt-8 rounded-[10px] bg-brand px-6 py-[11px] text-[15px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-brand-hover">
          Save Strategy
        </button>
      </div>
    </div>
  )
}
