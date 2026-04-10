"use client"

import Link from "next/link"
import { BarChart3 } from "lucide-react"
import { BankabilitySection, normalizeBankabilityMetrics } from "@/features/finance/BankabilitySection"
import { useAnalysisStore } from "@/store/analysisStore"
import { useLocale } from "@/lib/i18n/locale-context"
import type { AnalyseResponse } from "@/types/api"

function fmt(n: number | null | undefined, decimals = 1) {
  if (n == null) return "—"
  return n.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtEUR(n: number | null | undefined) {
  if (n == null) return "—"
  return `€${Math.round(n).toLocaleString("de-DE")}`
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—"
  return `${fmt(n)}%`
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-default/50 py-2 last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-border-default bg-bg-surface p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      {children}
    </div>
  )
}

function FinanceMetrics({ result, label }: { result: AnalyseResponse; label?: string }) {
  const { t } = useLocale()

  const bankability = normalizeBankabilityMetrics(result.bankability_metrics)

  return (
    <div className="space-y-4">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t("finance.section.financing")}>
          <MetricRow label={t("finance.metric.loan")} value={fmtEUR(result.loan)} />
          <MetricRow label={t("finance.metric.ltv")} value={fmtPct(result.ltv_pct)} />
          <MetricRow label={t("finance.metric.annuity")} value={result.annuity_monthly != null ? `${fmtEUR(result.annuity_monthly)}/mo` : "—"} />
          <MetricRow label={t("finance.metric.closingCosts")} value={fmtEUR(result.closing_costs)} />
        </Card>

        <Card title={t("finance.section.returns")}>
          <MetricRow label={t("finance.metric.grossYield")} value={fmtPct(result.gross_yield_pct)} />
          <MetricRow label={t("finance.metric.netYield")} value={fmtPct(result.net_yield_pct)} />
          <MetricRow label={t("finance.metric.kpf")} value={result.kpf != null ? `${fmt(result.kpf, 1)}x` : "—"} />
          <MetricRow label={t("finance.metric.cashflow")} value={result.cash_flow_monthly_yr1 != null ? `${fmtEUR(result.cash_flow_monthly_yr1)}/mo` : "—"} />
        </Card>

        <Card title={t("finance.section.irr")}>
          <MetricRow label={t("finance.metric.irr10")} value={fmtPct(result.irr_10)} />
          <MetricRow label={t("finance.metric.irr15")} value={fmtPct(result.irr_15)} />
          <MetricRow label={t("finance.metric.irr20")} value={fmtPct(result.irr_20)} />
          <MetricRow label={t("finance.metric.equityMultiple10")} value={result.equity_multiple_10 != null ? `${fmt(result.equity_multiple_10, 2)}x` : "—"} />
        </Card>

        {result.annual_afa != null || result.afa_tax_saving_yr1 != null ? (
          <Card title={t("finance.section.afa")}>
            {result.afa_method ? <MetricRow label={t("finance.metric.afaMethod")} value={result.afa_method} /> : null}
            <MetricRow label={t("finance.metric.annualAfa")} value={fmtEUR(result.annual_afa)} />
            <MetricRow label={t("finance.metric.afaTaxSaving")} value={result.afa_tax_saving_yr1 != null ? `${fmtEUR(result.afa_tax_saving_yr1)}/yr` : "—"} />
            {result.afa_rate_pct != null ? <MetricRow label={t("finance.metric.afaRate")} value={fmtPct(result.afa_rate_pct)} /> : null}
          </Card>
        ) : null}
      </div>

      {bankability ? <BankabilitySection metrics={bankability} /> : null}
    </div>
  )
}

export default function FinancePage() {
  const { t } = useLocale()
  const resultA = useAnalysisStore((s) => s.resultA)
  const resultB = useAnalysisStore((s) => s.resultB)

  if (!resultA && !resultB) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="rounded-full border border-border-default bg-bg-surface p-4">
          <BarChart3 className="h-8 w-8 text-text-muted" />
        </div>
        <div>
          <p className="text-base font-semibold text-text-primary">{t("finance.emptyTitle")}</p>
          <p className="mt-1 text-sm text-text-secondary">{t("finance.emptyBody")}</p>
        </div>
        <Link
          href="/analyse"
          className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("finance.goToAnalyse")}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">{t("nav.finance")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("finance.subtitle")}</p>
      </div>

      {resultA ? (
        <FinanceMetrics
          result={resultA}
          label={resultB ? t("finance.propertyA") : undefined}
        />
      ) : null}

      {resultB ? (
        <FinanceMetrics
          result={resultB}
          label={resultA ? t("finance.propertyB") : undefined}
        />
      ) : null}
    </div>
  )
}
