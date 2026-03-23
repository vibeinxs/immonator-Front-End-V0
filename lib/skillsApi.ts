import { apiCall, apiStream } from "@/lib/api"
import type {
  ApiResult,
  CanonicalSkillResult,
  ChatRequest,
  PropertyMetricsInput,
} from "@/types/api"
import type { ReviewResult, SnapshotResult, StrategyResult } from "@/types/skills"

export type AnalysisRunMode = "compact" | "full"

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

// ── Investment Review helpers ─────────────────────────────────────────────────
// The backend InvestmentReviewOutput schema (immonator/prompt_assets/investment-review)
// returns structured objects for location_analysis, deal_economics, final_verdict, and
// [{input, impact}] objects for missing_inputs.  Extract display text from each.

function extractLocationAnalysis(value: unknown): string {
  if (typeof value === "string") return value
  if (!isRecord(value)) return ""
  const rating = asString(value.overall_location_rating)
  const rationale = asString(value.overall_location_rationale)
  return rating && rationale ? `${rating}: ${rationale}` : rationale || rating
}

function extractDealEconomics(value: unknown): string {
  if (typeof value === "string") return value
  if (!isRecord(value)) return ""
  // economic_summary is the top-level prose field in the new schema
  return asString(value.economic_summary) || asString(value.derived_metrics)
}

function extractMissingInputs(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim()
      if (isRecord(item)) {
        const input = asString(item.input)
        const impact = asString(item.impact)
        return impact ? `${input}: ${impact}` : input
      }
      return ""
    })
    .filter((s) => s.length > 0)
}

function extractFinalVerdict(value: unknown): string {
  if (typeof value === "string") return value
  if (!isRecord(value)) return ""
  const stance = asString(value.stance)
  const primaryReason = asString(value.primary_reason)
  const nextStep = asString(value.next_required_validation_step)
  const headline = primaryReason && stance ? `${primaryReason} [${stance}]` : primaryReason || stance
  return [headline, nextStep ? `Next step: ${nextStep}` : ""].filter(Boolean).join("\n\n")
}

function normalizeReviewResult(raw: unknown): ReviewResult | null {
  const candidate = pickResultPayload(raw)
  if (!candidate) return null

  const propertySummary =
    asString(candidate.property_summary) ||
    asString(candidate.property_facts) ||
    asString(candidate.summary)

  // location_analysis: new schema → object; old schema → string
  const locationAnalysis = extractLocationAnalysis(candidate.location_analysis)

  // deal_economics: new schema → object; old schema → string
  const dealEconomics =
    extractDealEconomics(candidate.deal_economics) ||
    asString(candidate.derived_metrics)

  const strengths = asStringArray(candidate.strengths)
  const risks = asStringArray(candidate.risks)

  // missing_inputs: new schema → [{input, impact}]; old schema → string[]
  const missingInputs = extractMissingInputs(candidate.missing_inputs)
    .concat(asStringArray(candidate.missing_inputs))
    .filter((s, i, arr) => arr.indexOf(s) === i) // de-dup if old schema already returned strings

  const sensitivityPoints = asStringArray(candidate.sensitivity_points)

  // final_verdict: new schema → object; old schema → string
  const finalVerdict =
    extractFinalVerdict(candidate.final_verdict) ||
    asString(candidate.verdict)

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

// ── Buying Strategy helpers ───────────────────────────────────────────────────
// The backend BuyingStrategyInsightOutput schema changed in PR #64.
// New fields: recommendation, rationale, negotiation_strategy, required_validations,
//             walk_away_triggers, buyer_fit, summary.
// Old fields (anchor_price, leverage_points, seller_questions, etc.) no longer sent.
// Normalizer tries new schema first, falls back to old field names for compatibility.

function normalizeStrategyResult(raw: unknown): StrategyResult | null {
  const candidate = pickResultPayload(raw)
  if (!candidate) return null

  // ── New schema top-level objects ─────────────────────────────────────────
  const recommendation = isRecord(candidate.recommendation) ? candidate.recommendation : null
  const negStrategy = isRecord(candidate.negotiation_strategy) ? candidate.negotiation_strategy : null
  const rationale = Array.isArray(candidate.rationale) ? candidate.rationale : []
  const requiredValidations = Array.isArray(candidate.required_validations) ? candidate.required_validations : []

  // anchor_price / walk_away_price — no longer in new schema; keep legacy aliases
  const anchorPrice =
    asNullableNumber(candidate.anchor_price) ??
    asNullableNumber(candidate.recommended_offer) ??
    asNullableNumber(candidate.recommended_offer_price)

  const walkAwayPrice =
    asNullableNumber(candidate.walk_away_price) ??
    asNullableNumber(candidate.walk_away_ceiling) ??
    asNullableNumber(candidate.max_walk_away_price)

  // leverage_points: new → negotiation_strategy.notes; old → leverage_points
  const negNotes = negStrategy ? asStringArray(negStrategy.notes) : []
  const leveragePoints = negNotes.length > 0 ? negNotes : asStringArray(candidate.leverage_points)

  // seller_questions: new → required_validations[].item; old → seller_questions
  const validationItems = requiredValidations
    .map((v) => (isRecord(v) ? asString(v.item) : ""))
    .filter((s) => s.length > 0)
  const sellerQuestions =
    validationItems.length > 0 ? validationItems : asStringArray(candidate.seller_questions)

  // diligence_priorities: new → rationale[].assessment (labelled by factor); old → diligence/due_diligence
  const rationaleItems = rationale
    .map((r) => {
      if (!isRecord(r)) return ""
      const factor = asString(r.factor)
      const assessment = asString(r.assessment)
      return factor && assessment ? `[${factor}] ${assessment}` : assessment || factor
    })
    .filter((s) => s.length > 0)
  const diligencePrioritiesPrimary = asStringArray(candidate.diligence_priorities)
  const diligencePriorities =
    diligencePrioritiesPrimary.length > 0
      ? diligencePrioritiesPrimary
      : rationaleItems.length > 0
        ? rationaleItems
        : asStringArray(candidate.due_diligence_priorities)

  // red_flags: new → walk_away_triggers; old → red_flags
  const walkAwayTriggers = asStringArray(candidate.walk_away_triggers)
  const redFlags = walkAwayTriggers.length > 0 ? walkAwayTriggers : asStringArray(candidate.red_flags)

  // recommended_next_move: new → summary then recommendation.primary_reason; old → legacy fields
  const recommendedNextMove =
    asString(candidate.summary) ||
    (recommendation ? asString(recommendation.primary_reason) : "") ||
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

async function postCanonicalSkillResult<T>(
  endpoint: string,
  body: unknown,
  normalize: (raw: unknown) => T | null,
  missingFieldsMessage: string
): Promise<ApiResult<CanonicalSkillResult<T>>> {
  const response = await apiCall<unknown>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  })

  if (!response.data) return { data: null, error: response.error }

  const raw = pickResultPayload(response.data)
  if (!raw) {
    return { data: null, error: missingFieldsMessage }
  }

  const normalized = normalize(response.data)
  if (!normalized) {
    return { data: null, error: missingFieldsMessage }
  }

  return { data: { normalized, raw }, error: null }
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
): Promise<ApiResult<CanonicalSkillResult<ReviewResult>>> {
  return postCanonicalSkillResult(
    "/analysis/run",
    { property, mode: "full" },
    normalizeReviewResult,
    "Investment review response was missing the expected fields."
  )
}

export function runStrategy(
  property: PropertyMetricsInput,
  analysisResult: Record<string, unknown>
): Promise<ApiResult<CanonicalSkillResult<StrategyResult>>> {
  return postCanonicalSkillResult(
    "/strategy/run",
    { property, analysis_result: analysisResult },
    normalizeStrategyResult,
    "Buying strategy response was missing the expected fields."
  )
}

/**
 * @deprecated Use `runStrategy` instead. This is a backward-compatible alias.
 */
export function runBuyingStrategy(
  property: PropertyMetricsInput,
  analysisResult: Record<string, unknown>
): Promise<ApiResult<CanonicalSkillResult<StrategyResult>>> {
  return runStrategy(property, analysisResult)
}

export function streamAdvisorChat(
  payload: ChatRequest
): Promise<Response | null> {
  return apiStream("/api/chat", payload)
}
