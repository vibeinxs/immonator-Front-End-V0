import type { PortfolioStatus } from "@/types/api"

export type UiPortfolioStatus = "watching" | "interested" | "offer_made" | "negotiating" | "bought" | "archived"

export const UI_STATUS_ORDER: UiPortfolioStatus[] = [
  "watching",
  "interested",
  "offer_made",
  "negotiating",
  "bought",
  "archived",
]

const uiToApiMap: Record<UiPortfolioStatus, PortfolioStatus> = {
  watching: "watching",
  interested: "analysing",
  offer_made: "negotiating",
  negotiating: "negotiating",
  bought: "purchased",
  archived: "rejected",
}

const apiToUiMap: Record<PortfolioStatus, UiPortfolioStatus> = {
  watching: "watching",
  analysing: "interested",
  negotiating: "negotiating",
  purchased: "bought",
  rejected: "archived",
}

export function uiToApiStatus(status: UiPortfolioStatus): PortfolioStatus {
  return uiToApiMap[status]
}

export function apiToUiStatus(status: PortfolioStatus): UiPortfolioStatus {
  return apiToUiMap[status]
}
