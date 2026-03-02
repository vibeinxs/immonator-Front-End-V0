"use client"

import { api } from "./api"
import { getToken } from "./auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

/* ═══ Shared Types ═══════════════════════════════════ */

export interface PropertyFilters {
  city?: string
  type?: string
  maxPrice?: number
  minRooms?: number
  minYield?: number
  sort?: string
  page?: number
  limit?: number
}

export interface ScenarioParams {
  purchase_price: number
  equity_ratio: number
  interest_rate: number
  repayment_rate: number
  rent_growth: number
  appreciation: number
  vacancy_rate: number
  horizon: number
}

export interface UserProfileData {
  equity: number
  income: number
  expenses: number
  style: string
  horizon: string
  focus: string
  min_yield: number
  cities: string[]
  types: string[]
}

/* ═══ Auth ═══════════════════════════════════════════ */

export const immoApi = {
  betaLogin: (betaCode: string, displayName?: string) =>
    api.post<{ token: string; user_id: string; display_name: string }>(
      "/api/auth/beta-login",
      { access_code: betaCode, name: displayName }
    ),

  getMe: () =>
    api.get<{ user_id: string; display_name: string; email: string }>(
      "/api/auth/me"
    ),

  /* ═══ Properties ══════════════════════════════════ */

  fetchProperties: (filters: PropertyFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.city) params.set("city", filters.city)
    if (filters.type) params.set("type", filters.type)
    if (filters.maxPrice) params.set("max_price", String(filters.maxPrice))
    if (filters.minRooms) params.set("min_rooms", String(filters.minRooms))
    if (filters.minYield) params.set("min_yield", String(filters.minYield))
    if (filters.sort) params.set("sort", filters.sort)
    if (filters.page) params.set("page", String(filters.page))
    if (filters.limit) params.set("limit", String(filters.limit))
    const qs = params.toString()
    return api.get<{ properties: unknown[]; total: number; cities: string[] }>(
      `/api/properties${qs ? `?${qs}` : ""}`
    )
  },

  fetchPropertyById: (id: string) =>
    api.get<Record<string, unknown>>(`/api/properties/${id}`),

  fetchPropertyStats: () =>
    api.get<{ total: number; cities_count: number; avg_yield: number }>(
      "/api/properties/stats"
    ),

  triggerScrape: (city: string, maxPrice: number, minRooms: number) =>
    api.post<{ message: string; job_id: string }>(
      "/api/properties/trigger-scrape",
      { city, max_price: maxPrice, min_rooms: minRooms }
    ),

  /* ═══ Portfolio ═══════════════════════════════════ */

  saveToPortfolio: (propertyId: string) =>
    api.post<{ message: string }>("/api/portfolio", { property_id: propertyId }),

  getPortfolio: (status?: string) => {
    const qs = status ? `?status=${status}` : ""
    return api.get<{ properties: unknown[]; summary: Record<string, unknown> }>(
      `/api/portfolio${qs}`
    )
  },

  updatePortfolioStatus: (
    propertyId: string,
    status: string,
    notes?: string,
    purchasePrice?: number
  ) =>
    api.put<{ message: string }>(`/api/portfolio/${propertyId}`, {
      status,
      notes,
      purchase_price: purchasePrice,
    }),

  removeFromPortfolio: (propertyId: string) =>
    api.delete<{ message: string }>(`/api/portfolio/${propertyId}`),

  /* ═══ Analysis ═══════════════════════════════════ */

  getCompactAnalysis: (propertyId: string) =>
    api.get<Record<string, unknown>>(
      `/api/analysis/compact/${propertyId}`
    ),

  triggerDeepAnalysis: (propertyId: string) =>
    api.post<{ message: string; job_id: string }>(
      `/api/analysis/deep/${propertyId}`
    ),

  getDeepAnalysis: (propertyId: string) =>
    api.get<Record<string, unknown>>(
      `/api/analysis/deep/${propertyId}`
    ),

  getMarketStats: (city: string) =>
    api.get<Record<string, unknown>>(
      `/api/market/${encodeURIComponent(city)}/stats`
    ),

  getMarketAnalysis: (city: string) =>
    api.get<Record<string, unknown>>(
      `/api/market/${encodeURIComponent(city)}/analysis`
    ),

  triggerPortfolioAnalysis: () =>
    api.post<{ message: string }>("/api/analysis/portfolio"),

  getPortfolioAnalysis: () =>
    api.get<Record<string, unknown>>("/api/analysis/portfolio"),

  runScenario: (propertyId: string, params: ScenarioParams) =>
    api.post<Record<string, unknown>>(
      `/api/analysis/scenario/${propertyId}`,
      params
    ),

  saveScenario: (propertyId: string, name: string, params: ScenarioParams) =>
    api.post<{ message: string }>(
      `/api/analysis/scenario/${propertyId}/save`,
      { name, ...params }
    ),

  getSavedScenarios: (propertyId: string) =>
    api.get<{ scenarios: unknown[] }>(
      `/api/analysis/scenario/${propertyId}/saved`
    ),

  /* ═══ Strategy ═══════════════════════════════════ */

  generateStrategy: () =>
    api.post<Record<string, unknown>>("/api/strategy/generate"),

  getStrategy: () =>
    api.get<Record<string, unknown>>("/api/strategy"),

  getStrategyMatches: () =>
    api.get<{ matches: unknown[] }>("/api/strategy/matches"),

  /* ═══ Negotiation ════════════════════════════════ */

  generateNegotiationBrief: (propertyId: string) =>
    api.post<Record<string, unknown>>(
      `/api/negotiation/${propertyId}/generate`
    ),

  getNegotiationBrief: (propertyId: string) =>
    api.get<Record<string, unknown>>(
      `/api/negotiation/${propertyId}`
    ),

  /* ═══ Profile ════════════════════════════════════ */

  getUserProfile: () =>
    api.get<Record<string, unknown>>("/api/profile"),

  saveUserProfile: (data: UserProfileData) =>
    api.put<{ message: string }>("/api/profile", data),

  /* ═══ Chat — returns raw Response for SSE streaming ═══ */

  sendChatMessage: async (
    message: string,
    contextType: string,
    contextId?: string
  ): Promise<Response> => {
    const token = getToken()
    return fetch(`${API_URL}/api/chat/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        context_type: contextType,
        context_id: contextId,
      }),
    })
  },

  getChatHistory: (contextType: string, contextId?: string) => {
    const params = new URLSearchParams({ context_type: contextType })
    if (contextId) params.set("context_id", contextId)
    return api.get<{ messages: unknown[] }>(`/api/chat/history?${params}`)
  },

  clearChatHistory: (contextType: string, contextId?: string) =>
    api.post<{ message: string }>("/api/chat/clear", {
      context_type: contextType,
      context_id: contextId,
    }),

  /* ═══ Feedback ══════════════════════════════════ */

  submitFeedback: (
    type: string,
    content: string,
    pageContext?: string,
    rating?: number
  ) =>
    api.post<{ message: string }>("/api/feedback", {
      type,
      content,
      page_context: pageContext,
      rating,
    }),

  joinWaitlist: (email: string, feature: string) =>
    api.post<{ message: string }>("/api/waitlist", { email, feature }),
}
