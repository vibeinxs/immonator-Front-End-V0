"use client"

import { use } from "react"
import { MetricCard } from "@/components/metric-card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useLocale } from "@/lib/i18n/locale-context"
import { EUR } from "@/lib/utils"

export default function MarketPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city } = use(params)
  const { t } = useLocale()
  const cityName = city.charAt(0).toUpperCase() + city.slice(1)

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Back link */}
      <Link
        href="/properties"
        className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("market.back")}
      </Link>

      {/* Header */}
      <div>
        <h1 className="font-serif text-[28px] text-text-primary">
          {cityName} {t("market.titleSuffix")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("market.subtitle")} {cityName}.
        </p>
      </div>

      {/* Market metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("market.metric.avgPrice")}
          value={0}
          prefix={EUR}
          context={t("market.metric.loading")}
          sentiment="neutral"
        />
        <MetricCard
          label={t("market.metric.avgRent")}
          value={0}
          prefix={EUR}
          context={t("market.metric.loading")}
          sentiment="neutral"
        />
        <MetricCard
          label={t("market.metric.yoyChange")}
          value={0}
          suffix="%"
          context={t("market.metric.loading")}
          sentiment="neutral"
        />
        <MetricCard
          label={t("market.metric.population")}
          value={0}
          context={t("market.metric.loading")}
          sentiment="neutral"
        />
      </div>

      {/* Placeholder charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
          <h2 className="font-serif text-lg text-text-primary">
            {t("market.priceTrend")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t("market.priceTrendDesc")}
          </p>
          <div className="mt-8 flex h-56 items-center justify-center rounded-lg border border-dashed border-border-default">
            <span className="text-sm text-text-muted">
              {t("market.priceTrendPh")}
            </span>
          </div>
        </div>

        <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
          <h2 className="font-serif text-lg text-text-primary">
            {t("market.rentVsBuy")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t("market.rentVsBuyDesc")}
          </p>
          <div className="mt-8 flex h-56 items-center justify-center rounded-lg border border-dashed border-border-default">
            <span className="text-sm text-text-muted">
              {t("market.rentVsBuyPh")}
            </span>
          </div>
        </div>
      </div>

      {/* District table */}
      <div className="rounded-[14px] border border-border-default bg-bg-surface p-6">
        <h2 className="font-serif text-lg text-text-primary">
          {t("market.districts")}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {t("market.districtsDesc")}
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="pb-3 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  {t("market.th.district")}
                </th>
                <th className="pb-3 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  {t("market.th.avgPrice")}
                </th>
                <th className="pb-3 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  {t("market.th.avgRent")}
                </th>
                <th className="pb-3 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                  {t("market.th.yield")}
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
