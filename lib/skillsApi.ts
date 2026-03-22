import { apiCall } from "@/lib/api"
import type { PropertyMetricsInput, ApiResult } from "@/types/api"
import type { SnapshotResult } from "@/types/skills"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
}

function normalizeSnapshotResult(raw: unknown): SnapshotResult | null {
  const candidate = isRecord(raw)
    ? isRecord(raw.result)
      ? raw.result
      : isRecord(raw.analysis)
        ? raw.analysis
        : isRecord(raw.data)
          ? raw.data
          : raw
    : raw
  if (!isRecord(candidate)) return null

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
