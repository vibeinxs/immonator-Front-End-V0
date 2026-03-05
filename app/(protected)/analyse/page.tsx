"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PropertyPanel } from "@/features/analysis/PropertyPanel"
import { useAnalysisStore } from "@/store/analysisStore"

export default function AnalysePage() {
  const {
    inputA,
    inputB,
    resultA,
    resultB,
    setInputA,
    setInputB,
    setResultA,
    setResultB,
  } = useAnalysisStore()

  const bothReady = resultA !== null && resultB !== null

  return (
    <div className="w-full">
      {/* Full-width header */}
      <div className="border-b border-border-default bg-bg-surface px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between">
          <div>
            <h1 className="font-serif text-xl font-semibold text-text-primary">
              Property Analysis
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Fill in the details for each property and click Analyse.
            </p>
          </div>
          {bothReady && (
            <Link
              href="/analyse/compare"
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Compare A vs B
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <PropertyPanel
            label="Property A"
            input={inputA}
            result={resultA}
            onInputChange={setInputA}
            onResult={setResultA}
          />
          <PropertyPanel
            label="Property B"
            input={inputB}
            result={resultB}
            onInputChange={setInputB}
            onResult={setResultB}
          />
        </div>

        {/* Compare CTA (bottom, mobile only) */}
        {bothReady && (
          <div className="mt-8 flex justify-center md:hidden">
            <Link
              href="/analyse/compare"
              className="flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Compare A vs B
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
