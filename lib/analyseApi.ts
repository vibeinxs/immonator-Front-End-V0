import { api } from "@/lib/api"
import type { AnalyseRequest, AnalyseResponse, ApiResult } from "@/types/api"

/**
 * Call POST /analyse on the backend.
 * The /analyse endpoint is public — no auth required — but we include the
 * Bearer token if available (via the shared api wrapper) for consistency.
 */
export async function analyseProperty(
  req: AnalyseRequest
): Promise<ApiResult<AnalyseResponse>> {
  return api.post<AnalyseResponse>("/analyse", req)
}
