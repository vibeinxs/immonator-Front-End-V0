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

// ─── Generic wrapper ──────────────────────────────────────────────────────────

export interface ApiResult<T> {
  data: T | null
  error: string | null
}
