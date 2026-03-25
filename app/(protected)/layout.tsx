"use client"

import { useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { AppShell } from "@/components/app-shell"
import { CompareProvider } from "@/store/compareStore"
import { AnalysisStoreProvider } from "@/store/analysisStore"
import { resetLegacyStrategyWizardFlags } from "@/lib/strategyDraft"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    resetLegacyStrategyWizardFlags()
  }, [])

  return (
    <ProtectedRoute>
      <CompareProvider>
        <AnalysisStoreProvider>
          <AppShell>{children}</AppShell>
        </AnalysisStoreProvider>
      </CompareProvider>
    </ProtectedRoute>
  )
}
