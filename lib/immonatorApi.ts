"use client"

import { apiCall, apiStream } from "./api"
import { getToken, getUserId } from "./auth"
import type {
  ApiResult,
  BetaLoginRequest,
  BetaLoginResponse,
  CompactAnalysis,
  ImportExtractResponse,
  NegotiationBrief,
  NegotiationBriefResponse,
  RawNegotiationBrief,
  RawNegotiationBriefResponse,
  PortfolioItem,
  PortfolioStatus,
  Property,
  PropertyFilters,
  PropertyListResponse,
  PropertyListItem,
  PropertyStatsResponse,
  AnalyseRequest,
  AnalyseResponse,
  ScenarioParams,
  ScenarioResult,
  ChatHistoryResponse,
  ChatRequest,
} from "@/types/api"

// ─── Local types not yet in @/types/api ───────────────────────────────────────

export interface UserProfileData {
  available_equity?: number
  monthly_income?: number
  monthly_expenses?: number
  risk_tolerance?: string
  investment_horizon_years?: number
  target_monthly_cashflow?: number
  target_yield_percent?: number
  preferred_cities?: string[]
  preferred_property_types?: string[]
  max_purchase_price?: number
  financing_preference?: string
  experience_level?: string
}

interface MeResponse {
  user_id: string
  display_name: string
  email: string
}


interface FeedbackRequest {
  type?: string
  content?: string
  page_context?: string
  rating?: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function betaLogin(body: BetaLoginRequest): Promise<ApiResult<BetaLoginResponse>> {
  return apiCall<BetaLoginResponse>("/api/auth/beta-login", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function getMe(): Promise<ApiResult<MeResponse>> {
  return apiCall<MeResponse>("/api/auth/me", { method: "GET" })
}

// ─── Properties ───────────────────────────────────────────────────────────────

function normalizePropertyListResponse(raw: unknown): PropertyListResponse {
  const fallback: PropertyListResponse = {
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  }

  if (Array.isArray(raw)) {
    return {
      ...fallback,
      items: raw as PropertyListItem[],
      total: raw.length,
      pages: raw.length > 0 ? 1 : 0,
    }
  }

  if (!raw || typeof raw !== "object") return fallback

  const obj = raw as Record<string, unknown>
  const items = Array.isArray(obj.items)
    ? (obj.items as PropertyListItem[])
    : Array.isArray(obj.properties)
      ? (obj.properties as PropertyListItem[])
      : []

  return {
    items,
    total: Number(obj.total ?? items.length ?? 0),
    page: Number(obj.page ?? 1),
    limit: Number(obj.limit ?? 20),
    pages: Number(obj.pages ?? (items.length > 0 ? 1 : 0)),
  }
}

export async function fetchProperties(
  filters: PropertyFilters = {}
): Promise<ApiResult<PropertyListResponse>> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined) params.set(k, String(v))
  }
  const qs = params.toString()
  const res = await apiCall<PropertyListResponse | PropertyListItem[] | { properties: PropertyListItem[] }>(`/api/properties${qs ? `?${qs}` : ""}`, {
    method: "GET",
  })

  if (!res.data) return { data: null, error: res.error }
  return { data: normalizePropertyListResponse(res.data), error: null }
}

export function fetchPropertyById(id: string): Promise<ApiResult<Property>> {
  return apiCall<Property>(`/api/properties/${encodeURIComponent(id)}`, { method: "GET" })
}

export function fetchPropertyStats(): Promise<ApiResult<PropertyStatsResponse>> {
  return apiCall<PropertyStatsResponse>("/api/properties/stats", { method: "GET" })
}

export function triggerScrape(
  body: Record<string, unknown>
): Promise<ApiResult<{ message: string; job_id: string }>> {
  return apiCall<{ message: string; job_id: string }>("/api/properties/trigger-scrape", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export interface ManualPropertyBody {
  source: "manual"
  title: string
  city: string
  zip_code?: string
  price: number
  size_sqm: number
  rooms: number
  year_built?: number
  estimated_rent?: number
  heating_type?: string
  floor?: string
  listing_url?: string
  notes?: string
}

export function createManualProperty(
  body: ManualPropertyBody
): Promise<ApiResult<{ id: string; message: string }>> {
  return apiCall<{ id: string; message: string }>("/api/properties", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export function saveToPortfolio(
  propertyId: string
): Promise<ApiResult<{ success: boolean; message: string; portfolio_id?: string }>> {
  return apiCall<{ success: boolean; message: string; portfolio_id?: string }>(
    `/api/portfolio/watch/${encodeURIComponent(propertyId)}`,
    { method: "POST" }
  )
}

export function getPortfolio(
  status?: PortfolioStatus,
  signal?: AbortSignal
): Promise<ApiResult<{ items: PortfolioItem[]; total: number }>> {
  const qs = status ? `?status=${status}` : ""
  return apiCall<{ items: PortfolioItem[]; total: number }>(`/api/portfolio${qs}`, {
    method: "GET",
    signal,
  })
}

export function updatePortfolioStatus(
  id: string,
  status: PortfolioStatus,
  notes?: string,
  price?: number
): Promise<ApiResult<{ success: boolean }>> {
  return apiCall<{ success: boolean }>(`/api/portfolio/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    body: JSON.stringify({ status, notes, purchase_price: price }),
  })
}

export function removeFromPortfolio(id: string): Promise<ApiResult<{ success: boolean }>> {
  return apiCall<{ success: boolean }>(`/api/portfolio/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export function getCompactAnalysis(id: string): Promise<ApiResult<CompactAnalysis>> {
  return apiCall<CompactAnalysis>(`/api/analysis/compact/${encodeURIComponent(id)}`, { method: "GET" })
}

export function triggerDeepAnalysis(id: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiCall<Record<string, unknown>>(`/api/analysis/deep/${encodeURIComponent(id)}`, { method: "POST" })
}

export function getDeepAnalysis(id: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiCall<Record<string, unknown>>(`/api/analysis/deep/${encodeURIComponent(id)}`, { method: "GET" })
}

export async function analyseProperty(
  body: AnalyseRequest
): Promise<ApiResult<AnalyseResponse>> {
  // M4: Map V0 Sonder-AfA UI fields to the backend contract.
  // The backend uses afa_method="sonder" + afa_rate_input; it does not know
  // special_afa_enabled / special_afa_rate_input / special_afa_years.
  const backendBody: AnalyseRequest = body.special_afa_enabled
    ? {
        ...body,
        afa_method: "sonder",
        afa_rate_input: body.special_afa_rate_input ?? body.afa_rate_input,
      }
    : body
  const res = await apiCall<AnalyseResponse>("/analyse", {
    method: "POST",
    body: JSON.stringify(backendBody),
  })

  if (!res.data) return { data: null, error: res.error }
  const metrics = parseFinancialMetrics(res.data as Record<string, unknown>)
  return {
    data: {
      ...res.data,
      // Normalise all percent values in one place (backend may send 0.035 or 3.5)
      gross_yield_pct:       metrics.gross_yield_pct,
      net_yield_pct:         metrics.net_yield_pct,
      kpf:                   metrics.kpf,
      irr_10:                metrics.irr_10,
      irr_15:                metrics.irr_15,
      irr_20:                metrics.irr_20,
      cash_flow_monthly_yr1: metrics.cash_flow_monthly_yr1,
      equity_multiple_10:    metrics.equity_multiple_10,
      equity_multiple_15:    metrics.equity_multiple_15,
      equity_multiple_20:    metrics.equity_multiple_20,
    },
    error: null,
  }
}

// ─── Financial Metrics (parsed from deep analysis calculated_metrics) ─────────

export interface YearData {
  year: number
  cashflow_monthly?: number
  cashflow_pre_tax?: number
  cashflow_after_tax?: number
  equity?: number
  rent?: number
  mortgage?: number
  cumulative_cashflow?: number
}

export interface FinancialMetrics {
  gross_yield_pct: number
  net_yield_pct: number
  kpf: number
  irr_10: number
  irr_15: number
  irr_20: number
  equity_multiple_10: number
  equity_multiple_15: number
  equity_multiple_20: number
  cash_flow_monthly_yr1: number
  ltv?: number
  monthly_annuity?: number
  closing_costs?: number
  afa_saving?: number
  year_data: YearData[]
}

/** Normalise a percent that may come as decimal (0.035) or percent (3.5). */
function normPct(v: unknown): number {
  const n = Number(v ?? 0)
  if (isNaN(n)) return 0
  // If absolute value < 0.5 it's almost certainly a decimal fraction (e.g. 0.035 = 3.5 %)
  return Math.abs(n) < 0.5 ? n * 100 : n
}

function parseFinancialMetrics(raw: Record<string, unknown>): FinancialMetrics {
  const m = (raw.calculated_metrics as Record<string, unknown>) ?? raw
  return {
    gross_yield_pct:     normPct(m.gross_yield_pct),
    net_yield_pct:       normPct(m.net_yield_pct),
    kpf:                 Number(m.kpf ?? 0),
    irr_10:              normPct(m.irr_10),
    irr_15:              normPct(m.irr_15),
    irr_20:              normPct(m.irr_20),
    equity_multiple_10:  Number(m.equity_multiple_10 ?? 0),
    equity_multiple_15:  Number(m.equity_multiple_15 ?? 0),
    equity_multiple_20:  Number(m.equity_multiple_20 ?? 0),
    cash_flow_monthly_yr1: Number(m.cash_flow_monthly_yr1 ?? 0),
    ltv:                 m.ltv !== undefined ? Number(m.ltv) : m.ltv_pct !== undefined ? Number(m.ltv_pct) : undefined,
    monthly_annuity:     m.monthly_annuity !== undefined ? Number(m.monthly_annuity) : m.annuity_monthly !== undefined ? Number(m.annuity_monthly) : undefined,
    closing_costs:       m.closing_costs !== undefined ? Number(m.closing_costs) : undefined,
    afa_saving:          m.afa_saving !== undefined ? Number(m.afa_saving) : undefined,
    year_data:           Array.isArray(m.year_data) ? (m.year_data as YearData[]) : [],
  }
}

/** Trigger deep analysis and return parsed financial metrics once ready.
 *  Returns null if the analysis has not been generated yet — callers should poll. */
export async function getFinancialMetrics(
  id: string,
): Promise<ApiResult<{ metrics: FinancialMetrics; status: "generated" | "pending" }>> {
  // First try reading a cached result
  const { data: existing, error: readError } = await getDeepAnalysis(id)
  if (readError) return { data: null, error: readError }

  if (existing?.calculated_metrics || existing?.analysis) {
    return {
      data: {
        metrics: parseFinancialMetrics(existing),
        status: "generated",
      },
      error: null,
    }
  }

  return { data: { metrics: parseFinancialMetrics({}), status: "pending" }, error: null }
}

/** Trigger generation then poll until done (or maxAttempts exhausted). */
export async function triggerAndGetFinancialMetrics(
  id: string,
): Promise<ApiResult<Record<string, unknown>>> {
  const res = await triggerDeepAnalysis(id)
  if (res.error) return { data: null, error: res.error }
  // If already cached the trigger returns the full result immediately
  if (res.data?.calculated_metrics || res.data?.analysis) return res
  return { data: null, error: null } // pending — caller should poll via getFinancialMetrics
}

export function getMarketStats(city: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiCall<Record<string, unknown>>(
    `/api/analysis/market/${encodeURIComponent(city)}/stats`,
    { method: "GET" }
  )
}

export function getMarketAnalysis(city: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiCall<Record<string, unknown>>(
    `/api/analysis/market/${encodeURIComponent(city)}`,
    { method: "GET" }
  )
}

export function runScenario(
  id: string,
  params: ScenarioParams
): Promise<ApiResult<ScenarioResult>> {
  return apiCall<ScenarioResult>(`/api/analysis/scenario/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify({ scenario_params: params }),
  })
}

export function saveScenario(
  id: string,
  name: string,
  params: ScenarioParams
): Promise<ApiResult<{ id: string; scenario_name: string; created_at: string }>> {
  return apiCall<{ id: string; scenario_name: string; created_at: string }>(
    `/api/analysis/scenario/${encodeURIComponent(id)}/save`,
    {
      method: "POST",
      body: JSON.stringify({ scenario_name: name, scenario_params: params }),
    }
  )
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export function generateStrategy(): Promise<ApiResult<Record<string, unknown>>> {
  return apiCall<Record<string, unknown>>("/api/strategy/generate", { method: "POST" })
}

export async function getStrategy(): Promise<ApiResult<Record<string, unknown>>> {
  const res = await apiCall<Record<string, unknown>>("/api/strategy", { method: "GET" })
  if (!res.data) return { data: null, error: res.error }
  // Backend returns { id, strategy: {...}, created_at }; unwrap the nested payload.
  return { data: (res.data.strategy as Record<string, unknown>) ?? null, error: null }
}

export function getStrategyMatches(): Promise<ApiResult<{ items: unknown[]; total: number }>> {
  return apiCall<{ items: unknown[]; total: number }>("/api/strategy/matches", { method: "GET" })
}

// ─── Negotiation ──────────────────────────────────────────────────────────────

/**
 * Normalises a negotiation brief payload into the flat NegotiationBrief shape
 * the UI consumes. Supports two source formats:
 *
 *   Nested  — Claude's _JSON_SCHEMA output: recommended_offer lives inside
 *             price_analysis, strategy inside negotiation_position, etc.
 *   Flat    — Any response that already carries top-level keys matching
 *             NegotiationBrief (e.g. legacy DB rows, future inline endpoints).
 *
 * Strategy: flat key wins; nested path is the fallback; missing → null / [].
 */
function mapNegotiationBrief(raw: RawNegotiationBrief): NegotiationBrief {
  const pa = raw.price_analysis
  const np = raw.negotiation_position
  const si = raw.seller_intelligence
  return {
    recommended_offer:  raw.recommended_offer  ?? pa?.recommended_offer  ?? null,
    walk_away_price:    raw.walk_away_price     ?? pa?.max_walk_away_price ?? null,
    strategy:           raw.strategy            ?? np?.summary             ?? null,
    leverage_points:    raw.leverage_points     ?? si?.leverage_points     ?? [],
    talking_points_de:  raw.talking_points_de   ?? [],
    talking_points_en:  raw.talking_points_en   ?? [],
    offer_letter_draft: raw.offer_letter_draft  ?? null,
  }
}

function toNegotiationBriefResponse(
  raw: RawNegotiationBriefResponse
): NegotiationBriefResponse {
  return { ...raw, brief: mapNegotiationBrief(raw.brief) }
}

export async function generateNegotiationBrief(
  id: string
): Promise<ApiResult<NegotiationBriefResponse>> {
  const result = await apiCall<RawNegotiationBriefResponse>(
    `/api/negotiate/${encodeURIComponent(id)}`,
    { method: "POST" }
  )
  return {
    data:  result.data  ? toNegotiationBriefResponse(result.data)  : null,
    error: result.error,
  }
}

export async function getNegotiationBrief(
  id: string
): Promise<ApiResult<NegotiationBriefResponse>> {
  const result = await apiCall<RawNegotiationBriefResponse>(
    `/api/negotiate/${encodeURIComponent(id)}`,
    { method: "GET" }
  )
  return {
    data:  result.data  ? toNegotiationBriefResponse(result.data)  : null,
    error: result.error,
  }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<ApiResult<Record<string, unknown>>> {
  const res = await apiCall<Record<string, unknown>>("/api/users/profile", { method: "GET" })
  if (!res.data) return { data: null, error: res.error }
  // Backend returns {exists: false} when no profile is configured.
  // Normalise to data: null so callers can gate on !!data without extra checks.
  return { data: res.data.exists ? res.data : null, error: null }
}

export function saveUserProfile(
  data: UserProfileData
): Promise<ApiResult<Record<string, unknown>>> {
  // Some callers (e.g. strategy wizard) pass legacy field names cast to this
  // type. Resolve the correct API field name by preferring the canonical name
  // and falling back to the legacy alias when present.
  const legacy = data as unknown as Record<string, unknown>
  return apiCall<Record<string, unknown>>("/api/users/profile", {
    method: "POST",
    body: JSON.stringify({
      available_equity: data.available_equity ?? legacy.equity,
      monthly_income: data.monthly_income ?? legacy.income,
      monthly_expenses: data.monthly_expenses ?? legacy.expenses,
      risk_tolerance: data.risk_tolerance ?? legacy.style,
      investment_horizon_years: data.investment_horizon_years,
      target_monthly_cashflow: data.target_monthly_cashflow,
      target_yield_percent: data.target_yield_percent ?? legacy.min_yield,
      preferred_cities: data.preferred_cities ?? legacy.cities,
      preferred_property_types: data.preferred_property_types ?? legacy.types,
      max_purchase_price: data.max_purchase_price,
      financing_preference: data.financing_preference,
      experience_level: data.experience_level,
    }),
  })
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export function sendChatMessage(body: ChatRequest): Promise<Response | null> {
  return apiStream("/api/chat", body)
}

export function getChatHistory(
  contextType: string,
  contextId?: string
): Promise<ApiResult<ChatHistoryResponse>> {
  const params = new URLSearchParams({ context_type: contextType })
  if (contextId) params.set("context_id", contextId)
  return apiCall<ChatHistoryResponse>(`/api/chat/history?${params}`, {
    method: "GET",
  })
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export function submitFeedback(body: FeedbackRequest): Promise<ApiResult<{ success: boolean }>> {
  return apiCall<{ success: boolean }>("/api/feedback", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function joinWaitlist(
  email: string,
  feature: string
): Promise<ApiResult<{ success: boolean }>> {
  return apiCall<{ success: boolean }>("/api/waitlist", {
    method: "POST",
    body: JSON.stringify({ email, feature }),
  })
}

// ─── Portfolio Analysis ───────────────────────────────────────────────────────

interface PortfolioAnalysisShape {
  quality_badge: string
  summary: string
  rankings: unknown[]
  capital_plan: unknown[]
  action_items: unknown[]
}

function normalizePortfolioAnalysis(raw: Record<string, unknown>): PortfolioAnalysisShape {
  const analysis = (raw.analysis || {}) as Record<string, unknown>
  return {
    quality_badge: String(analysis.quality_badge || ""),
    summary: String(analysis.summary || ""),
    rankings: Array.isArray(analysis.rankings) ? analysis.rankings : [],
    capital_plan: Array.isArray(analysis.capital_plan) ? analysis.capital_plan : [],
    action_items: Array.isArray(analysis.action_items) ? analysis.action_items : [],
  }
}

export async function triggerPortfolioAnalysis(): Promise<
  ApiResult<{ analysis: PortfolioAnalysisShape }>
> {
  const res = await apiCall<Record<string, unknown>>("/api/analysis/portfolio", {
    method: "POST",
  })
  if (!res.data) return { data: null, error: res.error }
  return { data: { analysis: normalizePortfolioAnalysis(res.data) }, error: null }
}

export async function getPortfolioAnalysis(signal?: AbortSignal): Promise<ApiResult<PortfolioAnalysisShape>> {
  const res = await apiCall<Record<string, unknown>>("/api/analysis/portfolio", {
    method: "GET",
    signal,
  })
  if (!res.data) return { data: null, error: res.error }
  return { data: normalizePortfolioAnalysis(res.data), error: null }
}

// ─── i18n / Auto-translate (internal Next.js route – no auth header needed) ───

export interface TranslateRequest {
  texts: { key: string; text: string }[]
  targetLocale: string
}

export async function translateTexts(
  body: TranslateRequest
): Promise<ApiResult<{ translations: Record<string, string> }>> {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) return { data: null, error: `Error ${res.status}` }
    const data = await res.json()
    return { data, error: null }
  } catch (e) {
    console.error("Translation API network error:", e)
    return { data: null, error: "Network error. Check your connection." }
  }
}

// ─── Import / listing extraction ────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

function buildImportUrl(endpoint: string): string {
  const base = API_URL.trim().replace(/\/+$/, "")
  const path = `/${endpoint.trim().replace(/^\/+/, "")}`
  if (!base) return path
  try {
    const url = new URL(base)
    url.pathname = `${url.pathname.replace(/\/+$/, "")}${path}`.replace(/\/{2,}/g, "/")
    return url.toString()
  } catch {
    return `${base}${path}`.replace(/(https?:\/\/)|(\/\/+)/g, (m, scheme) => scheme ?? "/")
  }
}

export async function extractFromUrl(url: string): Promise<ApiResult<ImportExtractResponse>> {
  return apiCall<ImportExtractResponse>("/api/import/extract-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  })
}

export async function extractFromFile(file: File): Promise<ApiResult<ImportExtractResponse>> {
  const token = getToken()
  const userId = getUserId()
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { "X-User-ID": userId } : {}),
  }
  const formData = new FormData()
  formData.append("file", file)
  try {
    const response = await fetch(buildImportUrl("/api/import/extract-file"), {
      method: "POST",
      headers,
      body: formData,
    })
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      return { data: null, error: errorBody.detail || `Error ${response.status}` }
    }
    const data = await response.json()
    return { data, error: null }
  } catch {
    return { data: null, error: "Network error. Check your connection." }
  }
}

// ─── Backward-compat object export ────────────────────────────────────────────

export const immoApi = {
  betaLogin,
  getMe,
  fetchProperties,
  fetchPropertyById,
  fetchPropertyStats,
  triggerScrape,
  createManualProperty,
  saveToPortfolio,
  getPortfolio,
  updatePortfolioStatus,
  removeFromPortfolio,
  getCompactAnalysis,
  triggerDeepAnalysis,
  getDeepAnalysis,
  analyseProperty,
  getMarketStats,
  runScenario,
  saveScenario,
  generateStrategy,
  getStrategy,
  getStrategyMatches,
  generateNegotiationBrief,
  getNegotiationBrief,
  getUserProfile,
  saveUserProfile,
  sendChatMessage,
  getChatHistory,
  submitFeedback,
  joinWaitlist,
  triggerPortfolioAnalysis,
  getPortfolioAnalysis,
  getMarketAnalysis,
  extractFromUrl,
  extractFromFile,
}
