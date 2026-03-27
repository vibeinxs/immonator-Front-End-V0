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

/** Shared response → ApiResult handler used by apiCall and apiCallFile. */
async function handleApiResponse<T>(response: Response): Promise<ApiResult<T>> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const backendError =
      typeof errorBody?.detail === "string"
        ? errorBody.detail
        : typeof errorBody?.message === "string"
          ? errorBody.message
          : typeof errorBody?.error === "string"
            ? errorBody.error
            : response.statusText || `Error ${response.status}`

    if (response.status === 401) {
      logout()
      return { data: null, error: backendError || "Session expired", status: 401, errorKind: "unauthorized" }
    }
    if (response.status === 403) {
      return { data: null, error: backendError || "Access denied", status: 403, errorKind: "forbidden" }
    }
    if (response.status === 404) {
      return { data: null, error: backendError || "Not found", status: 404, errorKind: "not_found" }
    }
    if (response.status === 422) {
      return { data: null, error: backendError, status: 422, errorKind: "invalid_input" }
    }
    if (response.status >= 500) {
      return { data: null, error: backendError, status: response.status, errorKind: "server" }
    }

    return { data: null, error: backendError, status: response.status, errorKind: "unknown" }
  }

  const data = await response.json()
  return { data, error: null, status: response.status }
}

function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken()
  const userId = getUserId()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { "X-User-ID": userId } : {}),
    ...extra,
  }
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildAuthHeaders(options.headers as Record<string, string> | undefined),
  }

  try {
    const response = await fetch(buildApiUrl(endpoint), {
      ...options,
      headers,
    })
    return handleApiResponse<T>(response)
  } catch {
    return { data: null, error: "Network error. Check your connection.", errorKind: "network" }
  }
}

export async function apiStream(
  endpoint: string,
  body: object
): Promise<Response | null> {
  const headers = buildAuthHeaders({ "Content-Type": "application/json" })

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

/** POST a FormData (multipart) payload. Does NOT set Content-Type so the browser
 *  can inject the multipart boundary automatically. */
export async function apiCallFile<T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(buildApiUrl(endpoint), {
      method: "POST",
      headers: buildAuthHeaders(),
      body: formData,
    })
    return handleApiResponse<T>(response)
  } catch {
    return { data: null, error: "Network error. Check your connection.", errorKind: "network" }
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
