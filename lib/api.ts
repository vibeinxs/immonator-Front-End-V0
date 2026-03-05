"use client"

import { ApiResult } from "@/types/api"
import { getToken, getUserId, logout } from "./auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

/** Collapse any double-slashes in a URL's path (preserves the `://` scheme). */
function normalizeSlashes(url: string): string {
  return url.replace(/(https?:\/\/)|(\/\/+)/g, (m, scheme) => scheme ?? "/")
}

function buildApiUrl(endpoint: string): string {
  const base = API_URL.trim().replace(/\/+$/, "")
  const normalizedEndpoint = endpoint.trim().replace(/^\/+/, "")
  const path = `/${normalizedEndpoint}`

  if (!base) return path

  try {
    const url = new URL(base)
    const basePath = url.pathname.replace(/\/+$/, "")
    const [pathOnly, search = ""] = path.split("?")

    url.pathname = `${basePath}${pathOnly}`.replace(/\/{2,}/g, "/")
    url.search = search ? `?${search}` : ""

    return url.toString()
  } catch {
    return normalizeSlashes(`${base}${path}`)
  }
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const token = getToken()
  const userId = getUserId()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { "X-User-ID": userId } : {}),
    ...(options.headers ? (options.headers as Record<string, string>) : {}),
  }

  try {
    const response = await fetch(buildApiUrl(endpoint), {
      ...options,
      headers,
    })

    if (response.status === 401) {
      logout()
      return { data: null, error: "Session expired" }
    }

    if (response.status === 403) {
      return { data: null, error: "Access denied" }
    }

    if (response.status === 404) {
      return { data: null, error: "Not found" }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      if (response.status >= 500) {
        return { data: null, error: "Server error — please try again" }
      }
      return {
        data: null,
        error: errorBody.detail || `Error ${response.status}`,
      }
    }

    const data = await response.json()
    return { data, error: null }
  } catch {
    return {
      data: null,
      error: "Network error. Check your connection.",
    }
  }
}

export async function apiStream(
  endpoint: string,
  body: object
): Promise<Response | null> {
  const token = getToken()
  const userId = getUserId()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { "X-User-ID": userId } : {}),
  }

  try {
    const response = await fetch(buildApiUrl(endpoint), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (response.status === 401) {
      logout()
      return null
    }

    return response
  } catch {
    return null
  }
}

// HTTP verb wrappers used by immonatorApi.ts
export const api = {
  get: <T>(endpoint: string) => apiCall<T>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, body?: unknown) =>
    apiCall<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    apiCall<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    apiCall<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) => apiCall<T>(endpoint, { method: "DELETE" }),
}
