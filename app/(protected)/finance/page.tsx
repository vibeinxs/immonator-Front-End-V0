"use client"

import Link from "next/link"
import { BarChart3 } from "lucide-react"
import { BankabilitySection, normalizeBankabilityMetrics } from "@/features/finance/BankabilitySection"
import { useAnalysisStore } from "@/store/analysisStore"
import { useLocale } from "@/lib/i18n/locale-context"

export default function FinancePage() {
  const { t } = useLocale()
  const resultA = useAnalysisStore((s) => s.resultA)
  const resultB = useAnalysisStore((s) => s.resultB)

  const bankabilityA = normalizeBankabilityMetrics(resultA?.bankability_metrics)
  const bankabilityB = normalizeBankabilityMetrics(resultB?.bankability_metrics)

  if (!bankabilityA && !bankabilityB) {
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
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">{t("nav.finance")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("finance.subtitle")}</p>
      </div>

      {bankabilityA ? (
        <div>
          {bankabilityB ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t("finance.propertyA")}</p>
          ) : null}
          <BankabilitySection metrics={bankabilityA} />
        </div>
      ) : null}

      {bankabilityB ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t("finance.propertyB")}</p>
          <BankabilitySection metrics={bankabilityB} />
        </div>
      ) : null}
    </div>
  )
}
