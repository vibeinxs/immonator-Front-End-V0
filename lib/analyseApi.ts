import { getToken, getUserId } from "@/lib/auth"
import type { AnalyseRequest, AnalyseResponse, ApiResult } from "@/types/api"

function buildAnalyseUrl(): string {
  const rawBase = (process.env.NEXT_PUBLIC_API_URL || "")
    .trim()
    .replace(/\/+$/, "")        // strip trailing slashes
    .replace(/\/api\/?$/i, "")  // strip trailing /api segment if present

  if (!rawBase) return "/analyse"

  try {
    // Use the URL API to guarantee a clean, well-formed URL
    const url = new URL(rawBase)
    url.pathname = "/analyse"
    return url.toString()
  } catch {
    // Fallback: simple concatenation with double-slash normalisation
    return `${rawBase}/analyse`.replace(/(https?:\/\/)|(\/\/+)/g, (m, scheme) => scheme ?? "/")
  }
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
  } catch (e) {
    console.error("Analyse API call failed:", e)
    return {
      data: null,
      error: "Network error. Check your connection.",
    }
  }
}
