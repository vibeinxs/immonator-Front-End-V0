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
 *
 *   Backend name        Task-spec alias (ignored per instructions)
 *   asking_price        price
 *   living_area_sqm     size_sqm
 *   images_urls         images
 *   source_url          listing_url
 *   days_on_market      days_listed
 *   monthly_rent        estimated_rent
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
  special_afa_enabled?: boolean
  special_afa_rate_input?: number
  special_afa_years?: number
  energy_class?: string
}

export interface AnalyseYearData {
  year: number
  cash_flow?: number          // annual after-tax cashflow
  cash_flow_monthly?: number  // monthly after-tax cashflow
  equity_multiple?: number
  net_worth?: number
  rent_gross?: number
  interest?: number
  afa?: number
  afa_sonder?: number | null
  taxable_income?: number
  tax_impact?: number
  property_value?: number
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
  // Optional market/enrichment data
  ai_analysis?: string
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
 * Mirrors CompactAnalysisStatusResponse from the OpenAPI schema:
 * { status, analysis? } — consumers must read result.analysis.verdict,
 * not result.verdict, to match what the backend actually sends.
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
  /** AfA (straight-line depreciation) flag — not yet in OpenAPI spec. */
  use_afa?: boolean
  /** Sonder-AfA (accelerated depreciation) flag — not yet in OpenAPI spec. */
  use_sonder_afa?: boolean
}

/**
 * AI commentary block within a scenario response.
 * Field names and structure confirmed from ScenarioModeller.tsx usage.
 */
export interface ScenarioAiCommentary {
  verdict: Verdict
  one_line_summary: string
  commentary: string[]
  suggestion: string
}

/**
 * Mirrors RunScenarioResponse from the OpenAPI schema.
 * Consumers must read result.ai_commentary.verdict — not result.scenario_verdict —
 * and result.calculated_metrics for the numeric outputs.
 */
export interface ScenarioResult {
  calculated_metrics: Record<string, unknown>
  ai_commentary: ScenarioAiCommentary
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
 * Uses the portfolio router's CompactAnalysisOut shape.
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
 * The backend flattens property fields into the item — there is no
 * nested `property` object. Shared fields are derived from PropertyListItem
 * via Pick so any rename in the list schema is automatically reflected here.
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
  // Top-level flat fields (newly added; also used by legacy/inline endpoints)
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

// ─── Document / URL extraction ────────────────────────────────────────────────

/**
 * Response from POST /api/extract/from-url and POST /api/extract/from-file.
 * Fields are split into three buckets so the UI can show transparency:
 *   extracted — found in the source document
 *   assumed   — not found; a sensible German RE default was applied
 *   missing   — not found and no default exists (field names, not values)
 */
export interface ExtractionResult {
  extracted: Partial<AnalyseRequest>
  assumed: Partial<AnalyseRequest>
  missing: string[]
  source_type: "url" | "pdf" | "docx" | "xlsx"
  confidence: "high" | "medium" | "low"
  notes?: string
}
