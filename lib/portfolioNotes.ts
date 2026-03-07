import type { AnalyseRequest, AnalyseResponse } from "@/types/api"

const PREFIX = "immo_snapshot_v1:"

export interface PortfolioSnapshotPayload {
  input?: AnalyseRequest
  result?: AnalyseResponse
  label?: string
}

export function encodePortfolioSnapshot(payload: PortfolioSnapshotPayload): string {
  return `${PREFIX}${JSON.stringify(payload)}`
}

export function decodePortfolioSnapshot(notes: string | null | undefined): PortfolioSnapshotPayload | null {
  if (!notes || !notes.startsWith(PREFIX)) return null
  try {
    return JSON.parse(notes.slice(PREFIX.length)) as PortfolioSnapshotPayload
  } catch {
    return null
  }
}
