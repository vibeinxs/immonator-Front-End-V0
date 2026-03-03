"use client"

import { apiCall, apiStream } from "./api"
import type {
  ApiResult,
  BetaLoginRequest,
  BetaLoginResponse,
  CompactAnalysis,
  PortfolioItem,
  PortfolioStatus,
  Property,
  PropertyFilters,
  PropertyListResponse,
  PropertyStatsResponse,
  ScenarioParams,
  ScenarioResult,
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

interface ChatRequest {
  message: string
  context_type: string
  context_id?: string
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

export function fetchProperties(
  filters: PropertyFilters = {}
): Promise<ApiResult<PropertyListResponse>> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined) params.set(k, String(v))
  }
  const qs = params.toString()
  return apiCall<PropertyListResponse>(`/api/properties${qs ? `?${qs}` : ""}`, {
    method: "GET",
  })
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

// ─── Portfolio ────────────────────────────────────────────────────────────────

export function saveToPortfolio(
  propertyId: string
): Promise<ApiResult<{ success: boolean; message: string }>> {
  return apiCall<{ success: boolean; message: string }>(
    `/api/portfolio/watch/${encodeURIComponent(propertyId)}`,
    { method: "POST" }
  )
}

export function getPortfolio(
  status?: PortfolioStatus
): Promise<ApiResult<{ items: PortfolioItem[]; total: number }>> {
  const qs = status ? `?status=${status}` : ""
  return apiCall<{ items: PortfolioItem[]; total: number }>(`/api/portfolio${qs}`, {
    method: "GET",
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

export function getStrategy(): Promise<ApiResult<Record<string, unknown>>> {
  return apiCall<Record<string, unknown>>("/api/strategy", { method: "GET" })
}

export function getStrategyMatches(): Promise<ApiResult<{ items: unknown[]; total: number }>> {
  return apiCall<{ items: unknown[]; total: number }>("/api/strategy/matches", { method: "GET" })
}

// ─── Negotiation ──────────────────────────────────────────────────────────────

export function generateNegotiationBrief(
  id: string
): Promise<ApiResult<Record<string, unknown>>> {
  return apiCall<Record<string, unknown>>(`/api/negotiate/${encodeURIComponent(id)}`, { method: "POST" })
}

export function getNegotiationBrief(id: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiCall<Record<string, unknown>>(`/api/negotiate/${encodeURIComponent(id)}`, { method: "GET" })
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
): Promise<ApiResult<{ messages: unknown[]; total: number }>> {
  const params = new URLSearchParams({ context_type: contextType })
  if (contextId) params.set("context_id", contextId)
  return apiCall<{ messages: unknown[]; total: number }>(`/api/chat/history?${params}`, {
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

export async function getPortfolioAnalysis(): Promise<ApiResult<PortfolioAnalysisShape>> {
  const res = await apiCall<Record<string, unknown>>("/api/analysis/portfolio", {
    method: "GET",
  })
  if (!res.data) return { data: null, error: res.error }
  return { data: normalizePortfolioAnalysis(res.data), error: null }
}

// ─── Backward-compat object export ────────────────────────────────────────────

export const immoApi = {
  betaLogin,
  getMe,
  fetchProperties,
  fetchPropertyById,
  fetchPropertyStats,
  triggerScrape,
  saveToPortfolio,
  getPortfolio,
  updatePortfolioStatus,
  removeFromPortfolio,
  getCompactAnalysis,
  triggerDeepAnalysis,
  getDeepAnalysis,
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
}
