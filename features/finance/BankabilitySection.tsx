"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useLocale } from "@/lib/i18n/locale-context"
import { isRecord } from "@/lib/utils"
import type {
  BankabilityMetricCard,
  BankabilityMetrics,
  BankabilityNamedMetric,
  BankabilityStressScenario,
} from "@/types/api"

const PRIMARY_BANKABILITY_CARDS_LIMIT = 4

// ── Normalizers ───────────────────────────────────────────────────────────────

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function firstTextFromAliases(value: Record<string, unknown>, aliases: string[]): string | null {
  return aliases.reduce((acc, key) => acc ?? asText(value[key]), null as string | null)
}

function asMetricCard(value: unknown): BankabilityMetricCard | null {
  if (!isRecord(value)) return null
  return {
    plain_title: asText(value.plain_title) ?? asText(value.title) ?? undefined,
    full_name: asText(value.full_name) ?? undefined,
    abbreviation: asText(value.abbreviation) ?? undefined,
    display_label: asText(value.display_label) ?? asText(value.label) ?? undefined,
    summary: asText(value.summary) ?? undefined,
    why_it_matters: asText(value.why_it_matters) ?? asText(value.why) ?? undefined,
    how_to_improve: asText(value.how_to_improve) ?? asText(value.improvement) ?? undefined,
  }
}

function asNamedMetric(value: unknown): BankabilityNamedMetric | null {
  if (!isRecord(value)) return null
  const card = asMetricCard(value) ?? {}
  const rawValue = value.value
  return {
    ...card,
    value: typeof rawValue === "number" || typeof rawValue === "string" ? rawValue : null,
    label: asText(value.label) ?? undefined,
  }
}

function asStressScenario(value: unknown): BankabilityStressScenario | null {
  if (!isRecord(value)) return null
  const name = firstTextFromAliases(value, ["name", "title", "scenario_name", "scenario"])
  const metricValue = firstTextFromAliases(value, ["value", "metric_value", "affected_metric_value", "impact_value", "metric", "change"])
  const metricName = firstTextFromAliases(value, ["affected_metric", "metric_name", "metric_title", "kpi", "measure"])
  const verdict = firstTextFromAliases(value, ["verdict", "status", "result"])
  const explanation = firstTextFromAliases(value, ["explanation", "summary", "reason", "impact", "outcome", "assumption"])

  const hasContent = Boolean(name || metricName || metricValue || verdict || explanation)
  if (!hasContent) return null

  return {
    name: name ?? undefined,
    value: metricValue ?? undefined,
    affected_metric: metricName ?? undefined,
    affected_metric_value: metricValue ?? undefined,
    verdict: verdict ?? undefined,
    explanation: explanation ?? undefined,
  }
}

export function normalizeBankabilityMetrics(value: unknown): BankabilityMetrics | null {
  if (!isRecord(value)) return null
  const primaryCards = Array.isArray(value.primary_cards)
    ? value.primary_cards.map(asMetricCard).filter((card): card is BankabilityMetricCard => Boolean(card))
    : []
  const lenderMetrics = Array.isArray(value.lender_metrics)
    ? value.lender_metrics.map(asNamedMetric).filter((metric): metric is BankabilityNamedMetric => Boolean(metric))
    : []
  const stressScenarios = Array.isArray(value.stress_scenarios)
    ? value.stress_scenarios.map(asStressScenario).filter((scenario): scenario is BankabilityStressScenario => Boolean(scenario))
    : []
  const scalingMetrics = Array.isArray(value.scaling_metrics)
    ? value.scaling_metrics.map(asNamedMetric).filter((metric): metric is BankabilityNamedMetric => Boolean(metric))
    : []

  const normalized: BankabilityMetrics = {
    overall_summary: asText(value.overall_summary) ?? asText(value.summary) ?? undefined,
    primary_cards: primaryCards,
    lender_metrics: lenderMetrics,
    stress_scenarios: stressScenarios,
    scaling_metrics: scalingMetrics,
  }

  const hasContent = Boolean(normalized.overall_summary)
    || primaryCards.length > 0
    || lenderMetrics.length > 0
    || stressScenarios.length > 0
    || scalingMetrics.length > 0

  return hasContent ? normalized : null
}

// ── Components ───────────────────────────────────────────────────────────────

export function BankabilitySection({ metrics }: { metrics: BankabilityMetrics }) {
  const { t } = useLocale()
  const metricCards = (metrics.primary_cards ?? []).slice(0, PRIMARY_BANKABILITY_CARDS_LIMIT)
  const lenderMetrics = metrics.lender_metrics ?? []
  const stressScenarios = metrics.stress_scenarios ?? []
  const scalingMetrics = metrics.scaling_metrics ?? []

  return (
    <section className="rounded-[14px] border border-border-default bg-bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{t("analyse.bankability.title")}</p>
      {metrics.overall_summary ? (
        <p className="mt-2 text-sm text-text-secondary">{metrics.overall_summary}</p>
      ) : null}

      {metricCards.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {metricCards.map((card, index) => (
            <div key={`${card.plain_title ?? card.display_label ?? "metric"}-${index}`} className="rounded-xl border border-border-default bg-bg-base p-3">
              <p className="text-sm font-semibold text-text-primary">{card.display_label ?? card.full_name ?? card.plain_title ?? t("analyse.bankability.metric")}</p>
              {card.summary ? <p className="mt-1 text-sm text-text-secondary">{card.summary}</p> : null}
              {card.why_it_matters ? <p className="mt-2 text-xs text-text-muted"><span className="font-semibold text-text-secondary">{t("analyse.bankability.whyItMatters")}:</span> {card.why_it_matters}</p> : null}
              {card.how_to_improve ? <p className="mt-1 text-xs text-text-muted"><span className="font-semibold text-text-secondary">{t("analyse.bankability.howToImprove")}:</span> {card.how_to_improve}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <BankabilityList title={t("analyse.bankability.lenderMetrics")} items={lenderMetrics} />
        <BankabilityList title={t("analyse.bankability.scalingMetrics")} items={scalingMetrics} />
      </div>

      <BankabilityScenarioList title={t("analyse.bankability.stressScenarios")} items={stressScenarios} />
    </section>
  )
}

function BankabilityList({
  title,
  items,
}: {
  title: string
  items: BankabilityNamedMetric[]
}) {
  const { t } = useLocale()
  if (items.length === 0) return null
  return (
    <div className="rounded-xl border border-border-default bg-bg-base p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.display_label ?? item.plain_title ?? "item"}-${index}`} className="rounded-lg border border-border-default/70 bg-bg-surface p-2">
            <p className="text-sm font-medium text-text-primary">
              {item.display_label ?? item.full_name ?? item.plain_title ?? t("analyse.bankability.metric")}
              {item.abbreviation ? <span className="ml-1 text-xs text-text-muted">({item.abbreviation})</span> : null}
            </p>
            {item.value != null ? <p className="text-sm font-semibold text-brand">{String(item.value)}</p> : null}
            {item.summary ? <p className="text-xs text-text-secondary">{item.summary}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function BankabilityScenarioList({
  title,
  items,
}: {
  title: string
  items: BankabilityStressScenario[]
}) {
  const { t } = useLocale()
  const [isExpanded, setIsExpanded] = useState(false)
  const normalizedItems = useMemo(() => {
    return items
      .map((item) => {
        const hasStructuredMetric = Boolean(item.affected_metric && item.affected_metric_value)
        const rawMetricValue = item.affected_metric_value ?? item.value ?? null
        const metricLabel = item.affected_metric ?? t("analyse.bankability.keyMetric")
        const parsedPair = !hasStructuredMetric && rawMetricValue?.includes(":")
          ? rawMetricValue.split(":")
          : null
        const normalizedMetricLabel = hasStructuredMetric
          ? item.affected_metric
          : parsedPair?.[0]?.trim() || metricLabel
        const normalizedMetricValue = hasStructuredMetric
          ? item.affected_metric_value
          : parsedPair && parsedPair.length > 1
            ? parsedPair.slice(1).join(":").trim()
            : rawMetricValue
        const explanation = item.explanation?.trim() ?? null
        const hasMeaningfulDetails = Boolean(normalizedMetricValue || explanation)

        if (!hasMeaningfulDetails) return null

        return {
          title: item.name?.trim() || t("analyse.bankability.scenario"),
          verdict: item.verdict?.trim() || t("analyse.bankability.watch"),
          metricLabel: normalizedMetricLabel?.trim() || metricLabel,
          metricValue: normalizedMetricValue?.trim() ?? null,
          explanation,
        }
      })
      .filter((item): item is {
        title: string
        verdict: string
        metricLabel: string
        metricValue: string | null
        explanation: string | null
      } => Boolean(item))
  }, [items, t])

  return (
    <div className="mt-4 rounded-xl border border-border-default bg-bg-base p-3">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isExpanded}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{t("analyse.bankability.stressTestResilience")}</p>
          <p className="mt-1 text-xs text-text-secondary">{title}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-brand">
          {isExpanded ? t("analyse.bankability.hideStressScenarios") : t("analyse.bankability.viewStressScenarios")}
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`} />
        </span>
      </button>
      {isExpanded ? (
        normalizedItems.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border-default px-3 py-2 text-xs text-text-muted">
            {t("analyse.bankability.noStressScenarioDetails")}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {normalizedItems.map((item, index) => (
              <div key={`${item.title}-${item.metricValue ?? "stress"}-${index}`} className="rounded-lg border border-border-default/70 bg-bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary">{item.title}</p>
                  <span className="rounded-full border border-border-default px-2 py-0.5 text-xs font-medium text-text-secondary">{item.verdict}</span>
                </div>
                {item.metricValue ? (
                  <p className="mt-1 text-sm font-semibold text-brand">
                    {item.metricLabel}: {item.metricValue}
                  </p>
                ) : null}
                {item.explanation ? <p className="mt-1 text-xs text-text-secondary">{item.explanation}</p> : null}
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}
