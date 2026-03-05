export const FEATURES = {
  enableCompare:        true,   // Side-by-side property comparison
  enableCompare3rdSlot: false,  // 3rd compare slot — start with 2, flip to enable
  enableNegotiation:    true,   // AI negotiation brief + chat
  enableMarkets:        false,  // Market data pages (placeholder data)
  enableStrategy:       false,  // Strategy wizard
  enableAdminPanel:     false,  // Beta code management
  enableAlerts:         false,  // Future: price drop / yield alerts
  enableRAGDocs:        false,  // Future: document Q&A
  enableExport:         false,  // Future: PDF/CSV export
} as const

export type FeatureKey = keyof typeof FEATURES

export function isEnabled(key: FeatureKey): boolean {
  return FEATURES[key]
}
