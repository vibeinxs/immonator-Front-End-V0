import type { AskAiContextPayload } from "@/types/analyseView"
import type {
  AnalyseRequest,
  AnalyseResponse,
  AnalysisContextPayload,
  PropertyMetricsInput,
} from "@/types/api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toTextLines(value: unknown): string[] {
  if (typeof value !== "string") return []
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === "string") return JSON.stringify(value)
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`
  }
  if (!isRecord(value)) return JSON.stringify(value)
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`
}

function hashString(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function compactResultSnapshot(result: AnalyseResponse | null | undefined) {
  if (!result) return null
  return {
    address_resolved: result.address_resolved ?? null,
    score: result.score,
    verdict: result.verdict,
    net_yield_pct: result.net_yield_pct,
    cash_flow_monthly_yr1: result.cash_flow_monthly_yr1,
    irr_10: result.irr_10,
    kpf: result.kpf,
  }
}

// ─── Chat context ID ──────────────────────────────────────────────────────────

/**
 * Build a stable context_id for analysis chat sessions.
 *
 * Format matches backend validation rules in immonator/chat_context.py:
 *   single:  "transient:<hash>"   (valid for analysis_single)
 *   compare: "compare:<hash>"     (valid for analysis_compare)
 *
 * The hash is derived from the analysis inputs + results so that loading a
 * saved analysis or changing inputs always produces a distinct chat thread.
 */
export function buildAnalysisChatContextId(context: AskAiContextPayload): string {
  const seed = stableSerialize({
    mode: context.mode,
    selectedProperty: context.selectedProperty,
    propertyInputs: context.propertyInputs,
    propertyResults: {
      A: compactResultSnapshot(context.propertyResults.A ?? null),
      B: compactResultSnapshot(context.propertyResults.B ?? null),
    },
  })
  const prefix = context.mode === "compare" ? "compare" : "transient"
  return `${prefix}:${hashString(seed)}`
}

// ─── Analysis context payload ─────────────────────────────────────────────────

/**
 * Build the PropertyMetricsInput snapshot for a single property slot.
 * Maps AnalyseRequest + AnalyseResponse → compact backend snapshot.
 * Only includes fields defined in the stable PropertyMetricsInput contract.
 */
function toPropertyMetricsInput(
  input: AnalyseRequest,
  result: AnalyseResponse | null | undefined
): PropertyMetricsInput {
  return {
    address: result?.address_resolved ?? input.address,
    purchase_price: input.purchase_price,
    sqm: input.sqm,
    year_built: input.year_built,
    condition: input.condition,
    energy_class: input.energy_class,
    score: result?.score,
    verdict: result?.verdict,
    gross_yield_pct: result?.gross_yield_pct,
    net_yield_pct: result?.net_yield_pct,
    kpf: result?.kpf,
    cash_flow_monthly_yr1: result?.cash_flow_monthly_yr1,
    annuity_monthly: result?.annuity_monthly,
    equity: result?.equity ?? input.equity,
    loan: result?.loan,
    ltv_pct: result?.ltv_pct,
    afa_tax_saving_yr1: result?.afa_tax_saving_yr1,
    irr_10: result?.irr_10,
    irr_15: result?.irr_15,
    irr_20: result?.irr_20,
    equity_multiple_10: result?.equity_multiple_10,
    bodenrichtwert_m2: result?.bodenrichtwert_m2 ?? null,
    market_rent_m2: result?.market_rent_m2 ?? null,
    location_score: result?.location_score ?? null,
    population_trend: result?.population_trend ?? null,
    // Backend trims year_data to [1,5,10,15,20] server-side — send full array
    year_data: result?.year_data?.map((y) => ({
      year: y.year,
      cash_flow: y.cash_flow,
      tax_impact: y.tax_impact,
      afa: y.afa,
      property_value: y.property_value,
      net_worth: y.net_worth,
    })),
  }
}

/**
 * Build the AnalysisContextPayload required by the backend chat endpoint.
 * Must be sent on every chat turn — the backend does not persist it.
 *
 * Matches backend AnalysisContextPayload (immonator/ai_payloads.py).
 */
export function buildAnalysisContextPayload(
  context: AskAiContextPayload
): AnalysisContextPayload {
  const propertyA = toPropertyMetricsInput(
    context.propertyInputs.A,
    context.propertyResults.A ?? null
  )
  const propertyB =
    context.mode === "compare"
      ? toPropertyMetricsInput(
          context.propertyInputs.B,
          context.propertyResults.B ?? null
        )
      : null

  return {
    mode: context.mode,
    selected_slot: context.selectedProperty,
    property_a: propertyA,
    property_b: propertyB,
  }
}

// ─── AI analysis text extraction ──────────────────────────────────────────────

/**
 * Extract display lines from the ai_analysis string field.
 *
 * The backend always sends ai_analysis as a plain string.
 * Returns fallbackLines if the field is absent or empty.
 */
export function getAiAnalysisLines(
  result: AnalyseResponse,
  fallbackLines: string[]
): string[] {
  const aiAnalysis = result.ai_analysis
  if (typeof aiAnalysis === "string") {
    const lines = toTextLines(aiAnalysis)
    return lines.length > 0 ? lines : fallbackLines
  }
  return fallbackLines
}
