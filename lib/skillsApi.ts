import { apiCall, apiStream } from "@/lib/api"
import type {
  ApiResult,
  ChatRequest,
  PropertyMetricsInput,
  PropertySkillContextPayload,
} from "@/types/api"
import type { ReviewResult, SnapshotResult, StrategyResult } from "@/types/skills"

export type AnalysisRunMode = "compact" | "full"

export interface AdvisorChatPayload extends ChatRequest {
  property_skill_context: PropertySkillContextPayload
}

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

  const result: ReviewResult = {
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

  const hasContent = Object.values(result).some((value) => {
    if (Array.isArray(value)) return value.length > 0
    return Boolean(value)
  })

  return hasContent ? result : null
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function normalizeStrategyResult(raw: unknown): StrategyResult | null {
  const candidate = pickResultPayload(raw)
  if (!candidate) return null

  const anchorPrice =
    asNullableNumber(candidate.anchor_price) ??
    asNullableNumber(candidate.recommended_offer) ??
    asNullableNumber(candidate.recommended_offer_price)
  const walkAwayPrice =
    asNullableNumber(candidate.walk_away_price) ??
    asNullableNumber(candidate.walk_away_ceiling) ??
    asNullableNumber(candidate.max_walk_away_price)
  const leveragePoints = asStringArray(candidate.leverage_points)
  const sellerQuestions = asStringArray(candidate.seller_questions)
  const diligencePrioritiesPrimary = asStringArray(candidate.diligence_priorities)
  const diligencePriorities =
    diligencePrioritiesPrimary.length > 0
      ? diligencePrioritiesPrimary
      : asStringArray(candidate.due_diligence_priorities)
  const redFlags = asStringArray(candidate.red_flags)
  const recommendedNextMove =
    asString(candidate.recommended_next_move) ||
    asString(candidate.next_move) ||
    asString(candidate.strategy)
  const rawOutput = asString(candidate.raw)

  const result: StrategyResult = {
    anchor_price: anchorPrice,
    walk_away_price: walkAwayPrice,
    leverage_points: leveragePoints,
    seller_questions: sellerQuestions,
    diligence_priorities: diligencePriorities,
    red_flags: redFlags,
    recommended_next_move: recommendedNextMove || null,
    raw: rawOutput,
  }

  const hasContent = Object.values(result).some((value) => {
    if (Array.isArray(value)) return value.length > 0
    return Boolean(value)
  })

  return hasContent ? result : null
}

async function postSkillResult<T>(
  endpoint: string,
  body: unknown,
  normalize: (raw: unknown) => T | null,
  missingFieldsMessage: string
): Promise<ApiResult<T>> {
  const response = await apiCall<unknown>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  })

  if (!response.data) return { data: null, error: response.error }

  const normalized = normalize(response.data)
  if (!normalized) {
    return { data: null, error: missingFieldsMessage }
  }

  return { data: normalized, error: null }
}

export function runAnalysis(
  property: PropertyMetricsInput,
  mode: "compact"
): Promise<ApiResult<SnapshotResult>>
export function runAnalysis(
  property: PropertyMetricsInput,
  mode: "full"
): Promise<ApiResult<ReviewResult>>
export function runAnalysis(
  property: PropertyMetricsInput,
  mode: AnalysisRunMode
): Promise<ApiResult<SnapshotResult | ReviewResult>> {
  if (mode === "compact") {
    return postSkillResult(
      "/analysis/run",
      { property, mode },
      normalizeSnapshotResult,
      "Snapshot response was missing the expected fields."
    )
  }

  return postSkillResult(
    "/analysis/run",
    { property, mode },
    normalizeReviewResult,
    "Investment review response was missing the expected fields."
  )
}

export function runPropertySnapshot(
  property: PropertyMetricsInput
): Promise<ApiResult<SnapshotResult>> {
  return runAnalysis(property, "compact")
}

export function runInvestmentReview(
  property: PropertyMetricsInput
): Promise<ApiResult<ReviewResult>> {
  return runAnalysis(property, "full")
}

export function runStrategy(
  property: PropertyMetricsInput,
  analysisResult: ReviewResult
): Promise<ApiResult<StrategyResult>> {
  return postSkillResult(
    "/strategy/run",
    { property, analysis_result: analysisResult },
    normalizeStrategyResult,
    "Buying strategy response was missing the expected fields."
  )
}

export function runBuyingStrategy(
  property: PropertyMetricsInput,
  analysisResult: ReviewResult
): Promise<ApiResult<StrategyResult>> {
  return runStrategy(property, analysisResult)
}

export function streamAdvisorChat(
  payload: AdvisorChatPayload
): Promise<Response | null> {
  return apiStream("/api/chat", payload)
}
