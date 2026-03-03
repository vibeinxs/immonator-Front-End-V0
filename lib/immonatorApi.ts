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
  down_payment_pct: number
  interest_rate_pct: number
  loan_term_years: number
  monthly_rent: number
  vacancy_rate_pct: number
  management_cost_pct: number
  maintenance_cost_annual: number
}

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

/* ═══ Auth ═══════════════════════════════════════════ */

export const immoApi = {
  betaLogin: (betaCode: string, displayName?: string) =>
    api.post<{ session_token: string; user_id: string; is_new_user: boolean }>(
      "/api/auth/beta-login",
      { beta_code: betaCode, display_name: displayName }
    ),

  getMe: () =>
    api.get<{ user_id: string; display_name: string; email: string }>(
      "/api/auth/me"
    ),

  /* ═══ Properties ══════════════════════════════════ */

  fetchProperties: async (filters: PropertyFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.city) params.set("city", filters.city)
    if (filters.type) params.set("property_type", filters.type)
    if (filters.maxPrice) params.set("max_price", String(filters.maxPrice))
    if (filters.minRooms) params.set("min_rooms", String(filters.minRooms))
    if (filters.sort) params.set("sort", filters.sort)
    if (filters.page) params.set("page", String(filters.page))
    if (filters.limit) params.set("limit", String(filters.limit))
    const qs = params.toString()
    const res = await api.get<unknown>(
      `/api/properties${qs ? `?${qs}` : ""}`
    )
    if (!res.data) return { data: null, error: res.error }

    const raw = res.data as
      | { items: Array<Record<string, unknown>>; total: number; page: number; limit: number; pages: number }
      | Array<Record<string, unknown>>
    let rawItems: Array<Record<string, unknown>> = []
    let total = 0
    let page = 1
    let limit = 20
    let pages = 1

    if (Array.isArray(raw)) {
      rawItems = raw
      total = raw.length
    } else {
      rawItems = Array.isArray(raw.items) ? raw.items : []
      total = Number(raw.total ?? rawItems.length)
      page = Number(raw.page ?? page)
      limit = Number(raw.limit ?? limit)
      pages = Number(raw.pages ?? pages)
    }

    const properties = rawItems.map((item) => ({
      id: String(item.id || ""),
      title: String(item.title || ""),
      address: String(item.address || ""),
      city: String(item.city || ""),
      zip: "",
      price: Number(item.asking_price || 0),
      price_per_sqm: Number(item.price_per_sqm || 0),
      sqm: Number(item.living_area_sqm || 0),
      rooms: Number(item.rooms || 0),
      year_built: 0,
      image_url: Array.isArray(item.images_urls) ? String(item.images_urls[0] || "") : undefined,
      days_listed: Number(item.days_on_market || 0),
      gross_yield: Number(item.gross_yield || 0),
      compact_analysis: item.compact_analysis || undefined,
      is_watched: false,
    }))
    const cities = Array.from(new Set(properties.map((p) => p.city))).filter(Boolean)

    if (process.env.NODE_ENV !== "production") {
      console.debug("[immoApi.fetchProperties] normalized response", {
        itemCount: rawItems.length,
        total,
        page,
        limit,
        pages,
      })
    }

    return { data: { properties, total, cities, page, limit, pages }, error: null }
  },

  fetchPropertyById: (id: string) =>
    api.get<Record<string, unknown>>(`/api/properties/${id}`),

  fetchPropertyStats: async () => {
    const res = await api.get<{
      total_count: number
      count_by_city: Record<string, number>
      avg_price_by_city: Record<string, number>
      avg_yield_by_city: Record<string, number>
      added_last_7_days: number
      added_last_30_days: number
    }>("/api/properties/stats")
    if (!res.data) return { data: null, error: res.error }
    return {
      data: {
        total: res.data.total_count,
        cities_count: Object.keys(res.data.count_by_city || {}).length,
        avg_yield: 0,
      },
      error: null,
    }
  },

  triggerScrape: (city: string, maxPrice: number, minRooms: number) =>
    api.post<{ message: string; job_id: string }>(
      "/api/properties/trigger-scrape",
      { city, max_price: maxPrice, min_rooms: minRooms }
    ),

  /* ═══ Portfolio ═══════════════════════════════════ */

  saveToPortfolio: (propertyId: string) =>
    api.post<{ success: boolean; message: string }>(`/api/portfolio/watch/${propertyId}`),

  getPortfolio: async (status?: string) => {
    const qs = status ? `?status=${status}` : ""
    const res = await api.get<{ items: Array<Record<string, unknown>>; total: number }>(
      `/api/portfolio${qs}`
    )
    if (!res.data) return { data: null, error: res.error }
    const properties = res.data.items.map((item) => {
      const compact = item.compact_analysis as Record<string, unknown> | null | undefined
      const metrics = (compact?.calculated_metrics as Record<string, unknown> | undefined) || {}
      return {
        id: String(item.property_id || ""),
        title: String(item.title || ""),
        city: String(item.city || ""),
        price: Number(item.asking_price || 0),
        verdict: (compact?.verdict as string) || "worth_analysing",
        gross_yield: Number(metrics.gross_yield || 0),
        days_listed: Number(metrics.days_on_market || 0),
        gap_percent: Number(metrics.overvaluation_percent || 0),
        status: String(item.status || ""),
      }
    })
    const total_value = properties.reduce((sum, p) => sum + p.price, 0)
    const avg_yield = properties.length
      ? properties.reduce((sum, p) => sum + (Number(p.gross_yield) || 0), 0) / properties.length
      : 0
    return {
      data: {
        properties,
        analysis: null,
        total_value,
        monthly_cashflow: 0,
        avg_yield,
        equity_estimate: 0,
      },
      error: null,
    }
  },

  updatePortfolioStatus: (
    propertyId: string,
    status: string,
    notes?: string,
    purchasePrice?: number
  ) =>
    api.put<{ success: boolean }>(`/api/portfolio/${propertyId}/status`, {
      status,
      notes,
      purchase_price: purchasePrice,
    }),

  removeFromPortfolio: (propertyId: string) =>
    api.delete<{ success: boolean }>(`/api/portfolio/${propertyId}`),

  /* ═══ Analysis ═══════════════════════════════════ */

  getCompactAnalysis: (propertyId: string) =>
    api.get<Record<string, unknown>>(
      `/api/analysis/compact/${propertyId}`
    ),

  triggerDeepAnalysis: (propertyId: string) =>
    api.post<Record<string, unknown>>(
      `/api/analysis/deep/${propertyId}`
    ),

  getDeepAnalysis: (propertyId: string) =>
    api.get<Record<string, unknown>>(
      `/api/analysis/deep/${propertyId}`
    ),

  getMarketStats: (city: string) =>
    api.get<Record<string, unknown>>(
      `/api/analysis/market/${encodeURIComponent(city)}/stats`
    ),

  getMarketAnalysis: (city: string) =>
    api.get<Record<string, unknown>>(
      `/api/analysis/market/${encodeURIComponent(city)}`
    ),

  triggerPortfolioAnalysis: async () => {
    const res = await api.post<Record<string, unknown>>("/api/analysis/portfolio")
    if (!res.data) return { data: null, error: res.error }
    const analysis = (res.data.analysis || {}) as Record<string, unknown>
    return {
      data: {
        analysis: {
          quality_badge: String(analysis.quality_badge || ""),
          summary: String(analysis.summary || ""),
          rankings: Array.isArray(analysis.rankings) ? analysis.rankings : [],
          capital_plan: Array.isArray(analysis.capital_plan) ? analysis.capital_plan : [],
          action_items: Array.isArray(analysis.action_items) ? analysis.action_items : [],
        },
      },
      error: null,
    }
  },

  getPortfolioAnalysis: async () => {
    const res = await api.get<Record<string, unknown>>("/api/analysis/portfolio")
    if (!res.data) return { data: null, error: res.error }
    const analysis = (res.data.analysis || {}) as Record<string, unknown>
    return {
      data: {
        quality_badge: String(analysis.quality_badge || ""),
        summary: String(analysis.summary || ""),
        rankings: Array.isArray(analysis.rankings) ? analysis.rankings : [],
        capital_plan: Array.isArray(analysis.capital_plan) ? analysis.capital_plan : [],
        action_items: Array.isArray(analysis.action_items) ? analysis.action_items : [],
      },
      error: null,
    }
  },

  runScenario: (propertyId: string, params: ScenarioParams) =>
    api.post<Record<string, unknown>>(
      `/api/analysis/scenario/${propertyId}`,
      { scenario_params: params }
    ),

  saveScenario: (propertyId: string, name: string, params: ScenarioParams) =>
    api.post<{ id: string; scenario_name: string; created_at: string }>(
      `/api/analysis/scenario/${propertyId}/save`,
      { scenario_name: name, scenario_params: params }
    ),

  getSavedScenarios: (propertyId: string) =>
    api.get<{ items: unknown[]; total: number }>(
      `/api/analysis/scenario/${propertyId}`
    ),

  /* ═══ Strategy ═══════════════════════════════════ */

  generateStrategy: () =>
    api.post<Record<string, unknown>>("/api/strategy/generate"),

  getStrategy: async () => {
    const res = await api.get<Record<string, unknown>>("/api/strategy")
    if (!res.data) return { data: null, error: res.error }
    return { data: (res.data.strategy as Record<string, unknown>) || null, error: null }
  },

  getStrategyMatches: () =>
    api.get<{ items: unknown[]; total: number }>("/api/strategy/matches"),

  /* ═══ Negotiation ════════════════════════════════ */

  generateNegotiationBrief: (propertyId: string) =>
    api.post<Record<string, unknown>>(
      `/api/negotiate/${propertyId}`
    ),

  getNegotiationBrief: (propertyId: string) =>
    api.get<Record<string, unknown>>(
      `/api/negotiate/${propertyId}`
    ),

  /* ═══ Profile ════════════════════════════════════ */

  getUserProfile: async () => {
    const res = await api.get<Record<string, unknown>>("/api/users/profile")
    if (!res.data) return { data: null, error: res.error }
    return { data: res.data.exists ? res.data : null, error: null }
  },

  saveUserProfile: (data: UserProfileData) => {
    const legacy = data as unknown as Record<string, unknown>
    return api.post<Record<string, unknown>>("/api/users/profile", {
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
    })
  },

  /* ═══ Chat — returns raw Response for SSE streaming ═══ */

  sendChatMessage: async (
    message: string,
    contextType: string,
    contextId?: string
  ): Promise<Response> => {
    const token = getToken()
    return fetch(`${API_URL}/api/chat`, {
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
    return api.get<{ messages: unknown[]; total: number }>(`/api/chat/history?${params}`)
  },

  clearChatHistory: (contextType: string, contextId?: string) =>
    api.delete<{ success: boolean; deleted: number }>(`/api/chat/history?${new URLSearchParams({
      context_type: contextType,
      ...(contextId ? { context_id: contextId } : {}),
    })}`),

  /* ═══ Feedback ══════════════════════════════════ */

  submitFeedback: (
    type: string,
    content: string,
    pageContext?: string,
    rating?: number
  ) =>
    api.post<{ success: boolean }>("/api/feedback", {
      type,
      content,
      page_context: pageContext,
      rating,
    }),

  joinWaitlist: (email: string, feature: string) =>
    api.post<{ success: boolean }>("/api/waitlist", { email, feature }),
}
