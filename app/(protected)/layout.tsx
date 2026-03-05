"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AppShell } from "@/components/app-shell"
import { CompareProvider } from "@/store/compareStore"
import { AnalysisStoreProvider } from "@/store/analysisStore"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
