"use client"

import { MetricCard } from "@/components/metric-card"
import { useLocale } from "@/lib/i18n/locale-context"

export default function StrategyPage() {
  const { t } = useLocale()

  const fields = [
    { key: "strategy.form.minYield", phKey: "strategy.form.minYieldPh" },
    { key: "strategy.form.maxPrice", phKey: "strategy.form.maxPricePh" },
    { key: "strategy.form.cities", phKey: "strategy.form.citiesPh" },
    { key: "strategy.form.minSize", phKey: "strategy.form.minSizePh" },
  ]

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[28px] text-text-primary">{t("strategy.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("strategy.subtitle")}
        </p>
      </div>

      {/* Strategy metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label={t("strategy.metric.targetYield")}
          value={0}
          suffix="%"
          context={t("strategy.metric.targetYieldCtx")}
          sentiment="neutral"
        />
        <MetricCard
          label={t("strategy.metric.maxBudget")}
          value={0}
          prefix={"\u20AC"}
          context={t("strategy.metric.maxBudgetCtx")}
          sentiment="neutral"
        />
        <MetricCard
          label={t("strategy.metric.matching")}
          value={0}
          context={t("strategy.metric.matchingCtx")}
          sentiment="neutral"
        />
      </div>

      {/* Strategy builder */}
      <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
        <h2 className="font-serif text-lg text-text-primary">
          {t("strategy.form.title")}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {t("strategy.form.subtitle")}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                {t(field.key)}
              </label>
              <input
                type="text"
                placeholder={t(field.phKey)}
                className="rounded-[10px] border border-border-default bg-bg-elevated px-4 py-[11px] text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
              />
            </div>
          ))}
        </div>

        <button className="mt-8 rounded-[10px] bg-brand px-6 py-[11px] text-[15px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-brand-hover">
          {t("strategy.form.save")}
        </button>
      </div>
    </div>
  )
}
