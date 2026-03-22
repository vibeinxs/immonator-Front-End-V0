import { apiCall } from "@/lib/api"
import type { PropertyMetricsInput, ApiResult } from "@/types/api"
import type { ReviewResult, SnapshotResult } from "@/types/skills"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
}

function pickResultPayload(raw: unknown): Record<string, unknown> | null {
  const candidate = isRecord(raw)
    ? isRecord(raw.result)
      ? raw.result
      : isRecord(raw.analysis)
        ? raw.analysis
        : isRecord(raw.data)
          ? raw.data
          : raw
    : raw

  return isRecord(candidate) ? candidate : null
}

function normalizeSnapshotResult(raw: unknown): SnapshotResult | null {
  const candidate = pickResultPayload(raw)
  if (!candidate) return null

  const summary = asString(candidate.summary) || asString(candidate.one_line_summary)
  const verdict = asString(candidate.verdict)
  const locationRating = asString(candidate.location_rating)
  const strengths = asStringArray(candidate.strengths)
  const risks = asStringArray(candidate.risks)
  const grade = asString(candidate.grade)

  if (!summary && !verdict && !locationRating && strengths.length === 0 && risks.length === 0 && !grade) {
    return null
  }

  return {
    grade,
    verdict,
    location_rating: locationRating,
    strengths,
    risks,
    summary: summary || null,
    one_line_summary: summary || null,
    raw: asString(candidate.raw),
  }
}

function normalizeReviewResult(raw: unknown): ReviewResult | null {
  const candidate = pickResultPayload(raw)
  if (!candidate) return null

  const propertySummary =
    asString(candidate.property_summary) ||
    asString(candidate.property_facts) ||
    asString(candidate.summary)
  const locationAnalysis = asString(candidate.location_analysis)
  const dealEconomics = asString(candidate.deal_economics) || asString(candidate.derived_metrics)
  const strengths = asStringArray(candidate.strengths)
  const risks = asStringArray(candidate.risks)
  const missingInputs = asStringArray(candidate.missing_inputs)
  const sensitivityPoints = asStringArray(candidate.sensitivity_points)
  const finalVerdict = asString(candidate.final_verdict) || asString(candidate.verdict)
  const rawOutput = asString(candidate.raw)

  if (
    !propertySummary &&
    !locationAnalysis &&
    !dealEconomics &&
    strengths.length === 0 &&
    risks.length === 0 &&
    missingInputs.length === 0 &&
    sensitivityPoints.length === 0 &&
    !finalVerdict &&
    !rawOutput
  ) {
    return null
  }

  return {
    property_summary: propertySummary || null,
    location_analysis: locationAnalysis || null,
    deal_economics: dealEconomics || null,
    strengths,
    risks,
    missing_inputs: missingInputs,
    sensitivity_points: sensitivityPoints,
    final_verdict: finalVerdict || null,
    raw: rawOutput,
  }
}

export async function runPropertySnapshot(
  property: PropertyMetricsInput
): Promise<ApiResult<SnapshotResult>> {
  const response = await apiCall<unknown>("/analysis/run", {
    method: "POST",
    body: JSON.stringify({ property, mode: "compact" }),
  })

  if (!response.data) return { data: null, error: response.error }

  const normalized = normalizeSnapshotResult(response.data)
  if (!normalized) {
    return { data: null, error: "Snapshot response was missing the expected fields." }
  }

  return { data: normalized, error: null }
}

export async function runInvestmentReview(
  property: PropertyMetricsInput
): Promise<ApiResult<ReviewResult>> {
  const response = await apiCall<unknown>("/analysis/run", {
    method: "POST",
    body: JSON.stringify({ property, mode: "full" }),
  })

  if (!response.data) return { data: null, error: response.error }

  const normalized = normalizeReviewResult(response.data)
  if (!normalized) {
    return { data: null, error: "Investment review response was missing the expected fields." }
  }

  return { data: normalized, error: null }
}
