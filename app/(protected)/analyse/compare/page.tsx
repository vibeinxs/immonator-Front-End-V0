"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CompareTable } from "@/features/compare/CompareTable"
import { useAnalysisStore } from "@/store/analysisStore"

export default function AnalyseComparePage() {
  const router = useRouter()
  const { resultA, resultB, inputA, inputB } = useAnalysisStore()

  // Redirect if results are missing
  useEffect(() => {
    if (!resultA || !resultB) {
      router.replace("/analyse")
    }
  }, [resultA, resultB, router])

  if (!resultA || !resultB) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-muted">
        Redirecting…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/analyse"
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Analysis
            </Link>
            <h1 className="mt-2 font-serif text-2xl font-semibold text-text-primary">
              Compare Properties
            </h1>
          </div>
        </div>

        {/* Property labels */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border-default bg-bg-surface px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Property A
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-text-primary">
              {inputA.address}
            </p>
            <p className="text-xs text-text-secondary">
              {inputA.sqm} m² · €{inputA.purchase_price.toLocaleString("de-DE")}
            </p>
          </div>
          <div className="rounded-xl border border-border-default bg-bg-surface px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Property B
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-text-primary">
              {inputB.address}
            </p>
            <p className="text-xs text-text-secondary">
              {inputB.sqm} m² · €{inputB.purchase_price.toLocaleString("de-DE")}
            </p>
          </div>
        </div>

        {/* Comparison table */}
        <CompareTable
          resultA={resultA}
          resultB={resultB}
          labelA="Property A"
          labelB="Property B"
        />
      </div>
    </div>
  )
}
