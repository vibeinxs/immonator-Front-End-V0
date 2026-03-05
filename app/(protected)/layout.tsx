"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AppShell } from "@/components/app-shell"
import { CompareProvider } from "@/store/compareStore"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <CompareProvider>
        <AppShell>{children}</AppShell>
      </CompareProvider>
    </ProtectedRoute>
  )
}
