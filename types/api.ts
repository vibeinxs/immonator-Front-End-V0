// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface BetaLoginRequest {
  beta_code: string
  display_name?: string | null
}

export interface BetaLoginResponse {
  session_token: string
  user_id: string
  is_new_user: boolean
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface PriceHistoryEntry {
  date: string
  price: number
}

/**
 * Verdict values as sent by the backend.
 */
export type Verdict =
  | "strong_buy"
  | "worth_analysing"
  | "proceed_with_caution"
  | "avoid"

/**
 * Valid EPC / energy class values accepted by the backend.
 * Matches backend Literal["A+", "A", "B", "C", "D", "E", "F", "G", "H"].
 * Using a value outside this set causes a 422 from /analyse.
 */
export type EnergyClass = "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"

// ─── Properties ───────────────────────────────────────────────────────────────

/**
 * Inline compact-analysis snippet embedded in PropertyListItem responses.
 * Uses the properties router's CompactAnalysisOut shape.
 */
export interface PropertyCompactSnippet {
  verdict: Verdict
  one_line_summary: string | null
}

/**
 * Matches a single row from GET /api/properties (PropertyListItem schema).
 * Only fields the list endpoint guarantees are present here.
 * Detail-only fields (zip_code, year_built, price_history, …) are absent.
 */
export interface PropertyListItem {
  id: string
  title: string
  address: string
  city: string
  asking_price: number | null
  living_area_sqm: number | null
  rooms: number | null
  property_type: string
  source_url: string | null
  gross_yield: number | null
  net_yield: number | null
  bodenrichtwert: number | null
  price_per_sqm: number | null
  days_on_market: number | null
  images_urls: string[]
  compact_analysis?: PropertyCompactSnippet | null
}

/**
 * Matches GET /api/properties/{id} (PropertyDetailResponse schema).
 * Field names match exactly what the backend sends.
 */
export interface Property {
  id: string
  title: string
  address: string
  city: string
  zip_code: string
  asking_price: number | null
  price_per_sqm: number | null
  living_area_sqm: number | null
  rooms: number | null
  property_type: string
  source_url: string | null
  days_on_market: number | null
  images_urls: string[]
  year_built: number | null
  heating_type: string | null
  monthly_rent: number | null
  price_history: PriceHistoryEntry[]
  created_at: string
}

export interface PropertyFilters {
  city?: string
  property_type?: string
  min_price?: number
  max_price?: number
  min_rooms?: number
  /** Not yet in the OpenAPI spec but accepted by the backend. */
  min_yield?: number
  /** Not yet in the OpenAPI spec but accepted by the backend. */
  sort?: string
  page?: number
  limit?: number
}

export interface PropertyListResponse {
  items: PropertyListItem[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface AnalyseRequest {
  address: string
  sqm: number
  year_built: number
  condition: "existing" | "newbuild"
  afa_method?: string
  afa_rate_input?: number | null
  purchase_price: number
  equity: number
  interest_rate?: number
  repayment_rate?: number
  transfer_tax_pct?: number
  notary_pct?: number
  agent_pct?: number
  land_share_pct?: number
  rent_monthly: number
  hausgeld_monthly?: number
  maintenance_nd?: number
  management_nd?: number
  grundsteuer_annual?: number
  rent_growth?: number
  appreciation?: number
  tax_rate?: number
  vacancy_rate?: number
  holding_years?: number
  // Sonder-AfA (§7b EStG) — V0 UI fields.
  // These are mapped to afa_method="sonder" + afa_rate_input before the
  // backend call (see analyseProperty in lib/immonatorApi.ts).
  // localCompute() handles them directly via FormParams.
  special_afa_enabled?: boolean
  special_afa_rate_input?: number
  special_afa_years?: number
  // Must be one of the EnergyClass values — invalid values cause a 422
  energy_class?: EnergyClass
}

// ─── AI response shapes returned inside AnalyseResponse ───────────────────────

/** Quick-scan AI verdict — always present in /analyse responses. */
export interface AIInsight {
  summary: string
  verdict: string
  confidence: "low" | "medium" | "high"
  positives: string[]
  risks: string[]
  recommended_action: string
}

/** Deep narrative AI block — always present in /analyse responses. */
export interface AIDeepAnalysis {
  summary: string
  pricing: string
  cashflow: string
  market: string
  tax_and_structure: string
  key_risks: string[]
  next_steps: string[]
}

export interface AnalyseYearData {
  year: number
  // Fields present in both backend /analyse and local compute responses
  cash_flow?: number          // annual after-tax cash flow
  tax_impact?: number
  afa?: number
  property_value?: number
  net_worth?: number
  rent_gross?: number
  interest?: number
  // Local-compute-only fields (never sent by the backend /analyse endpoint)
  cash_flow_monthly?: number  // derived: cash_flow / 12
  afa_sonder?: number | null  // Sonder-AfA amount (non-null for yr <= special_afa_years)
  taxable_income?: number
  equity_multiple?: number
}

export interface AnalyseResponse {
  score: number
  verdict: string
  // Financing summary
  purchase_price?: number
  equity?: number
  loan?: number
  closing_costs?: number
  ltv_pct?: number
  // AfA (depreciation)
  afa_basis?: number
  annual_afa?: number
  afa_rate_pct?: number
  afa_method?: string
  afa_tax_saving_yr1?: number
  // Yield & cashflow
  gross_yield_pct?: number
  net_yield_pct: number
  kpf: number
  annuity_monthly?: number
  cash_flow_monthly_yr1: number
  // IRR & multiples
  irr_10: number
  irr_15: number
  irr_20: number
  equity_multiple_10: number
  equity_multiple_15: number
  equity_multiple_20: number
  // Year-by-year
  year_data: AnalyseYearData[]
  // AI fields — always present in backend /analyse responses; absent from local compute
  ai_analysis?: string | null
  ai_insight?: AIInsight
  ai_deep_analysis?: AIDeepAnalysis
  // Optional enrichment / meta
  address_resolved?: string
  market_rent_m2?: number | null
  bodenrichtwert_m2?: number | null
  current_mortgage_rate?: number | null
  location_score?: number | null
  population_trend?: string | null
  [key: string]: unknown
}

export interface PropertyStatsResponse {
  total_count: number
  count_by_city: Record<string, number>
  avg_price_by_city: Record<string, number>
  avg_yield_by_city: Record<string, number>
  added_last_7_days: number
  added_last_30_days: number
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

/**
 * Status strings returned by GET /api/analysis/compact/{id}.
 * "not_generated" → analysis has not been produced yet; poll again.
 * "generated"     → analysis is available in the `analysis` field.
 */
export type CompactAnalysisStatus = "not_generated" | "generated"

/**
 * Response shape of GET /api/analysis/compact/{id}.
 */
export interface CompactAnalysis {
  status: CompactAnalysisStatus
  analysis?: PortfolioCompactAnalysis | null
}

export interface ScenarioParams {
  purchase_price: number
  monthly_rent: number
  down_payment_pct?: number
  interest_rate_pct?: number
  loan_term_years?: number
  vacancy_rate_pct?: number
  management_cost_pct?: number
  maintenance_cost_annual?: number
  /** AfA (straight-line depreciation) flag */
  use_afa?: boolean
  /** Sonder-AfA (accelerated depreciation) flag */
  use_sonder_afa?: boolean
}

/**
 * AI commentary block within a scenario response.
 */
export interface ScenarioAiCommentary {
  verdict: Verdict
  one_line_summary: string
  commentary: string[]
  suggestion: string
}

/**
 * Mirrors RunScenarioResponse from the OpenAPI schema.
 */
export interface ScenarioResult {
  calculated_metrics: Record<string, unknown>
  ai_commentary: ScenarioAiCommentary
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  id: string
  role: string
  message: string
  context_type: string
  context_id: string | null
  created_at: string
}

/**
 * Compact property + metrics snapshot sent inside analysis chat requests.
 * Matches backend PropertyMetricsInput (immonator/ai_payloads.py).
 * The backend normaliser also accepts nested { input, result } shapes and
 * camelCase aliases (livingAreaSqm, etc.) — sending flat is preferred.
 */
export interface PropertyMetricsInput {
  address?: string
  purchase_price?: number
  sqm?: number
  year_built?: number
  condition?: string
  energy_class?: EnergyClass
  score?: number
  verdict?: string
  gross_yield_pct?: number
  net_yield_pct?: number
  kpf?: number
  cash_flow_monthly_yr1?: number
  annuity_monthly?: number
  equity?: number
  loan?: number
  ltv_pct?: number
  afa_tax_saving_yr1?: number
  irr_10?: number
  irr_15?: number
  irr_20?: number
  equity_multiple_10?: number
  bodenrichtwert_m2?: number | null
  market_rent_m2?: number | null
  location_score?: number | null
  population_trend?: string | null
  /** Trimmed to [1,5,10,15,20] by the backend — sending the full array is fine. */
  year_data?: Array<{
    year: number
    cash_flow?: number
    tax_impact?: number
    afa?: number
    property_value?: number
    net_worth?: number
  }>
}

/**
 * Inline analysis context sent alongside analysis chat messages.
 * Matches backend AnalysisContextPayload (immonator/ai_payloads.py).
 *
 * context_type + context_id rules:
 *   "analysis_single"  → context_id: "manual:<entryId>" | "transient:<uuid>"
 *   "analysis_compare" → context_id: "compare:<uuid>"
 * Backend also accepts "analysis" as a legacy alias (normalised server-side).
 * analysis_context is required on EVERY turn — it is not persisted by the backend.
 */
export interface AnalysisContextPayload {
  mode: "single" | "compare"
  /** "A" | "B" — which slot the user is currently focused on */
  selected_slot?: "A" | "B" | null
  property_a?: PropertyMetricsInput | null
  property_b?: PropertyMetricsInput | null
}

export interface PropertySkillHistoryMessage {
  role: string
  message: string
}

/**
 * Internal prop shape used by AnalysisChat and SingleAnalysisWorkspace to pass
 * advisor context through the component tree.  NOT sent on the wire directly —
 * the fields are spread flat into ChatRequest before the HTTP call.
 */
export interface PropertySkillContextPayload {
  mode: "light" | "full"
  property: PropertyMetricsInput
  analysis_result?: Record<string, unknown> | null
  strategy_result?: Record<string, unknown> | null
  history: PropertySkillHistoryMessage[]
}

export interface ChatRequest {
  message: string
  context_type?: string
  context_id?: string
  /**
   * Required when context_type is "analysis", "analysis_single", or "analysis_compare".
   * Must include a PropertyMetricsInput snapshot for the current session.
   * Sent on every turn — the backend does not persist it between messages.
   */
  analysis_context?: AnalysisContextPayload
  // ── Property advisor skill — flat fields (backend ChatRequest contract) ───
  /** Advisor chat depth; activates the dedicated property-advisor skill prompt. */
  mode?: "light" | "full"
  /** Compact property snapshot forwarded to the advisor. */
  property?: PropertyMetricsInput
  /** Normalized analysis result forwarded to the advisor (not persisted). */
  analysis_result?: Record<string, unknown> | null
  /** Normalized strategy result forwarded to the advisor (not persisted). */
  strategy_result?: Record<string, unknown> | null
  /** Inline conversation turns sent by the caller (oldest-first). */
  history?: PropertySkillHistoryMessage[]
}

export interface ChatHistoryResponse {
  messages: ConversationMessage[]
  total: number
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export type PortfolioStatus =
  | "watching"
  | "analysing"
  | "negotiating"
  | "purchased"
  | "rejected"

/**
 * Full compact-analysis object stored on portfolio items.
 */
export interface PortfolioCompactAnalysis {
  id: string
  verdict: Verdict
  verdict_reason: string
  one_line_summary: string
  confidence_score: number
  top_3_positives: string[]
  top_3_risks: string[]
  calculated_metrics: Record<string, unknown>
  created_at: string
}

/**
 * Portfolio item as returned by GET /api/portfolio.
 */
export type PortfolioItem = Pick<
  PropertyListItem,
  | "title"
  | "city"
  | "address"
  | "asking_price"
  | "living_area_sqm"
  | "rooms"
  | "property_type"
  | "source_url"
  | "images_urls"
> & {
  portfolio_id: string
  property_id: string
  status: PortfolioStatus
  notes: string | null
  purchase_price: number | null
  added_at: string
  compact_analysis?: PortfolioCompactAnalysis | null
}

// ─── Negotiation ─────────────────────────────────────────────────────────────

/** Flat UI shape — produced by mapNegotiationBrief(), consumed by all UI components. */
export interface NegotiationBrief {
  recommended_offer: number | null
  walk_away_price: number | null
  strategy: string | null
  leverage_points: string[]
  talking_points_de: string[]
  talking_points_en: string[]
  offer_letter_draft: string | null
}

/** Actual wire shape returned by the backend negotiation agent (nested JSON). */
export interface RawNegotiationBrief {
  // Nested sub-objects produced by Claude's structured output
  price_analysis?: {
    asking_price?: number
    recommended_offer?: number | null
    max_walk_away_price?: number | null
    discount_justified_pct?: number
    price_reasoning?: string
  }
  negotiation_position?: {
    strength?: string
    headline?: string
    summary?: string | null
  }
  seller_intelligence?: {
    urgency_level?: string
    leverage_points?: string[]
    warning_signs?: string[]
  }
  opening_arguments?: string[]
  counter_offer_strategy?: Record<string, unknown>
  due_diligence_demands?: string[]
  scripts?: { opening_line?: string; key_phrase?: string }
  // Top-level flat fields (promoted by normalize_brief_data on the backend)
  talking_points_de?: string[]
  talking_points_en?: string[]
  offer_letter_draft?: string | null
  // Flat fallback keys that may appear on legacy or inline-endpoint responses
  recommended_offer?: number | null
  walk_away_price?: number | null
  strategy?: string | null
  leverage_points?: string[]
}

/** Wire envelope returned by /api/negotiate/:id (before mapping). */
export interface RawNegotiationBriefResponse {
  id: string
  property_id: string
  brief: RawNegotiationBrief
  created_at: string
}

/** Post-mapped envelope — brief is the flat NegotiationBrief ready for UI. */
export interface NegotiationBriefResponse {
  id: string
  property_id: string
  brief: NegotiationBrief
  created_at: string
}

// ─── Generic wrapper ──────────────────────────────────────────────────────────

export interface ApiResult<T> {
  data: T | null
  error: string | null
}
