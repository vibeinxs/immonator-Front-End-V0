"use client"

import { MetricCard } from "@/components/metric-card"
import { useLocale } from "@/lib/i18n/locale-context"

export default function PortfolioPage() {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[28px] text-text-primary">{t("portfolio.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("portfolio.subtitle")}
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("portfolio.metric.totalValue")}
          value={0}
          prefix={"\u20AC"}
          context={t("portfolio.metric.totalValueCtx")}
          sentiment="neutral"
        />
        <MetricCard
          label={t("portfolio.metric.cashFlow")}
          value={0}
          prefix={"\u20AC"}
          context={t("portfolio.metric.cashFlowCtx")}
          sentiment="neutral"
        />
        <MetricCard
          label={t("portfolio.metric.avgYield")}
          value={0}
          suffix="%"
          context={t("portfolio.metric.avgYieldCtx")}
          sentiment="neutral"
        />
        <MetricCard
          label={t("portfolio.metric.properties")}
          value={0}
          context={t("portfolio.metric.propertiesCtx")}
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
          {t("portfolio.empty.title")}
        </h3>
        <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
          {t("portfolio.empty.body")}
        </p>
      </div>
    </div>
  )
}
