import { getToken, getUserId } from "@/lib/auth"
import type { AnalyseRequest, AnalyseResponse, ApiResult } from "@/types/api"

function buildAnalyseUrl(): string {
  const rawBase = process.env.NEXT_PUBLIC_API_URL || ""
  const baseWithoutTrailing = rawBase.replace(/\/+$/, "")
  const baseWithoutApiSuffix = baseWithoutTrailing.replace(/\/api$/i, "")
  return `${baseWithoutApiSuffix}/analyse`
}

/**
 * Call POST /analyse on the backend.
 * This endpoint is intentionally outside `/api/*`.
 */
export async function analyseProperty(
  req: AnalyseRequest
): Promise<ApiResult<AnalyseResponse>> {
  const token = getToken()
  const userId = getUserId()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { "X-User-ID": userId } : {}),
  }

  try {
    const response = await fetch(buildAnalyseUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    })

    if (response.status === 404) {
      return { data: null, error: "Analyse endpoint not found (POST /analyse)." }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      if (response.status >= 500) {
        return { data: null, error: "Server error — please try again" }
      }
      return {
        data: null,
        error: (errorBody as { detail?: string }).detail || `Error ${response.status}`,
      }
    }

    const data = (await response.json()) as AnalyseResponse
    return { data, error: null }
  } catch {
    return {
      data: null,
      error: "Network error. Check your connection.",
    }
  }
}
