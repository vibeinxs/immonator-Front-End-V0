"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EUR, cn } from "@/lib/utils"
import {
  deleteEntry,
  listEntries,
  updateStatus,
  type ManualPortfolioEntry,
  type ManualPortfolioStatus,
} from "@/lib/manualPortfolio"
import { useAnalysisStore } from "@/store/analysisStore"

const STATUS_OPTIONS: ManualPortfolioStatus[] = [
  "watching",
  "analysing",
  "negotiating",
  "purchased",
  "rejected",
]

const STATUS_BADGE: Record<ManualPortfolioStatus, string> = {
  watching: "bg-brand/10 text-brand",
  analysing: "bg-warning/10 text-warning",
  negotiating: "bg-warning/15 text-warning",
  purchased: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
}

interface ManualPortfolioSectionProps {
  activeTab: string
  onCountChange?: (count: number) => void
}

function formatPercent(value: unknown, digits = 1): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—"
}

function formatCurrency(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  const rounded = Math.abs(Math.round(value))
  return `${value >= 0 ? "+" : "-"}${EUR}${rounded.toLocaleString("de-DE")}`
}

function formatMultiple(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}×` : "—"
}

function isPositiveNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function formatSavedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Saved recently"
  return `Saved ${date.toLocaleDateString("de-DE")}`
}

export function ManualPortfolioSection({ activeTab, onCountChange }: ManualPortfolioSectionProps) {
  const router = useRouter()
  const { setInputA, setResultA } = useAnalysisStore()
  const [entries, setEntries] = useState<ManualPortfolioEntry[]>([])

  const refreshEntries = useCallback(() => {
    const nextEntries = listEntries()
    setEntries(nextEntries)
    onCountChange?.(nextEntries.length)
  }, [onCountChange])

  useEffect(() => {
    refreshEntries()

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "immo_manual_portfolio") return
      refreshEntries()
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [refreshEntries])

  const handleDelete = (id: string) => {
    deleteEntry(id)
    refreshEntries()
  }

  const handleStatusChange = (id: string, status: ManualPortfolioStatus) => {
    updateStatus(id, status)
    refreshEntries()
  }

  const handleOpen = (entry: ManualPortfolioEntry) => {
    setInputA(entry.input)
    setResultA(entry.result)
    router.push("/analyse")
  }

  const filteredEntries = entries.filter((entry) => activeTab === "all" || entry.status === activeTab)

  return (
    <section className="flex flex-col gap-3" aria-label="Manual portfolio">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Manual Portfolio
          <span className="ml-2 rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-normal text-text-muted">
            {entries.length}
          </span>
        </h2>
        <button
          onClick={() => router.push("/analyse")}
          className="text-xs text-brand hover:underline"
        >
          + Add from Analysis
        </button>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border-default bg-bg-surface">
        {entries.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-secondary">
            No manual analyses saved yet.
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-secondary">
            No manual entries in this status yet.
          </div>
        ) : (
          filteredEntries.map((entry, index) => {
            const irr = entry.result?.irr_10
            const monthlyCashFlow = entry.result?.cash_flow_monthly_yr1
            const netYield = entry.result?.net_yield_pct
            const equityMultiple = entry.result?.equity_multiple_10

            return (
              <div
                key={entry.id}
                className={cn(
                  "flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-bg-elevated/40",
                  index > 0 && "border-t border-border-default",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-primary">{entry.name || "Untitled analysis"}</p>
                    <p className="text-xs text-text-muted">{formatSavedAt(entry.savedAt)}</p>
                  </div>
                  <select
                    value={entry.status}
                    onChange={(event) => handleStatusChange(entry.id, event.target.value as ManualPortfolioStatus)}
                    className={cn(
                      "shrink-0 cursor-pointer rounded-full border-0 px-2.5 py-0.5 text-[10px] font-bold uppercase outline-none",
                      STATUS_BADGE[entry.status],
                    )}
                    aria-label={`Update status for ${entry.name}`}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="font-mono">
                    <span className="mr-1 text-[10px] uppercase tracking-wide text-text-muted">IRR 10yr</span>
                    <span className={isPositiveNumber(irr) ? "text-success" : "text-warning"}>
                      {formatPercent(irr)}
                    </span>
                  </span>
                  <span className="font-mono">
                    <span className="mr-1 text-[10px] uppercase tracking-wide text-text-muted">CF/mo Y1</span>
                    <span className={isPositiveNumber(monthlyCashFlow) ? "text-success" : "text-danger"}>
                      {formatCurrency(monthlyCashFlow)}
                    </span>
                  </span>
                  <span className="font-mono">
                    <span className="mr-1 text-[10px] uppercase tracking-wide text-text-muted">Net Yield</span>
                    <span className="text-text-primary">{formatPercent(netYield)}</span>
                  </span>
                  <span className="font-mono">
                    <span className="mr-1 text-[10px] uppercase tracking-wide text-text-muted">Equity ×</span>
                    <span className="text-text-primary">{formatMultiple(equityMultiple)}</span>
                  </span>
                </div>

                <div className="flex gap-3 text-xs">
                  <button
                    onClick={() => handleOpen(entry)}
                    className="text-brand hover:underline"
                  >
                    Open Analysis →
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-text-muted transition-colors hover:text-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
