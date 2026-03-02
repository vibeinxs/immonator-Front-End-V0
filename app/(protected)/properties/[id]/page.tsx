"use client"

import { use } from "react"
import { VerdictBadge } from "@/components/verdict-badge"
import { MetricCard } from "@/components/metric-card"
import { CompactAnalysisCard } from "@/components/analysis/CompactAnalysisCard"
import { MarketAnalysisCard } from "@/components/analysis/MarketAnalysisCard"
import { DeepAnalysisReport } from "@/components/analysis/DeepAnalysisReport"
import { AnalysisChat } from "@/components/chat/AnalysisChat"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useLocale } from "@/lib/i18n/locale-context"
import { EUR } from "@/lib/utils"

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Back link */}
      <Link
        href="/properties"
        className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.back")}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-serif text-[28px] text-text-primary">
            {t("detail.property")} {id}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t("detail.subtitle")}
          </p>
        </div>
        <VerdictBadge verdict="worth_analysing" />
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("detail.price")}
          value={385000}
          prefix={EUR}
          context={t("detail.priceCtx")}
          sentiment="neutral"
        />
        <MetricCard
          label={t("detail.grossYield")}
          value={4.2}
          suffix="%"
          context={t("detail.grossYieldCtx")}
          sentiment="positive"
        />
        <MetricCard
          label={t("detail.pricePerSqm")}
          value={5347}
          prefix={EUR}
          context={t("detail.pricePerSqmCtx")}
          sentiment="negative"
        />
        <MetricCard
          label={t("detail.netYield")}
          value={2.9}
          suffix="%"
          context={t("detail.netYieldCtx")}
          sentiment="neutral"
        />
      </div>

      {/* Compact Analysis + Market Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CompactAnalysisCard propertyId={id} />
        <MarketAnalysisCard city="Berlin" />
      </div>

      {/* Deep Analysis Report (full width) */}
      <DeepAnalysisReport propertyId={id} />

      {/* Cash Flow + Location placeholders */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
          <h2 className="font-serif text-lg text-text-primary">
            {t("detail.cashFlow")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t("detail.cashFlowDesc")}
          </p>
          <div className="mt-8 flex h-48 items-center justify-center rounded-lg border border-dashed border-border-default">
            <span className="text-sm text-text-muted">
              {t("detail.chartPlaceholder")}
            </span>
          </div>
        </div>

        <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
          <h2 className="font-serif text-lg text-text-primary">
            {t("detail.location")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t("detail.locationDesc")}
          </p>
          <div className="mt-8 flex h-48 items-center justify-center rounded-lg border border-dashed border-border-default">
            <span className="text-sm text-text-muted">
              {t("detail.mapPlaceholder")}
            </span>
          </div>
        </div>
      </div>

      {/* AI Chat (floating panel) */}
      <AnalysisChat contextType="property" contextId={id} title={`property ${id}`} />
    </div>
  )
}
