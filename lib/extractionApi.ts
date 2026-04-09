"use client"

import { apiCall } from "@/lib/api"
import { getToken, getUserId } from "@/lib/auth"
import type { ExtractionResult } from "@/types/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

function buildApiUrl(endpoint: string): string {
  const base = API_URL.trim().replace(/\/+$/, "")
  const path = endpoint.trim().replace(/^\/+/, "")
  return base ? `${base}/${path}` : `/${path}`
}

/** Extract AnalyseRequest fields from a property listing URL. */
export async function extractFromUrl(
  url: string,
): Promise<{ data: ExtractionResult | null; error: string | null }> {
  return apiCall<ExtractionResult>("/api/extract/from-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  })
}

/**
 * Extract AnalyseRequest fields from an uploaded file (PDF, .docx, .xlsx).
 * Uses multipart/form-data — does NOT use the standard apiCall JSON wrapper.
 */
export async function extractFromFile(
  file: File,
): Promise<{ data: ExtractionResult | null; error: string | null }> {
  const token = getToken()
  const userId = getUserId()

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { "X-User-ID": userId } : {}),
  }

  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await fetch(buildApiUrl("/api/extract/from-file"), {
      method: "POST",
      headers,
      body: formData,
    })

    if (response.status === 401) {
      return { data: null, error: "Session expired" }
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return { data: null, error: body.detail || `Error ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch {
    return { data: null, error: "Network error. Check your connection." }
  }
}
