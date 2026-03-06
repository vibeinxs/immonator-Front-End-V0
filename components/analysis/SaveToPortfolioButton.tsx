"use client"

import { useState } from "react"
import { BookmarkPlus, Check } from "lucide-react"
import { saveEntry } from "@/lib/manualPortfolio"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"
import type { ManualPortfolioStatus } from "@/lib/manualPortfolio"

interface SaveToPortfolioButtonProps {
  input: AnalyseRequest
  result: AnalyseResponse
}

export function SaveToPortfolioButton({ input, result }: SaveToPortfolioButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(input.address || "My Property")
  const [status, setStatus] = useState<ManualPortfolioStatus>("watching")
  const [saved, setSaved] = useState(false)

  const handleOpen = () => {
    setName(input.address || "My Property")
    setSaved(false)
    setOpen(true)
  }

  const handleSave = () => {
    saveEntry({ name, status, input, result })
    setSaved(true)
    setTimeout(() => setOpen(false), 900)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-brand/50 hover:text-brand"
      >
        <BookmarkPlus className="h-4 w-4" />
        Save to Portfolio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-bg-surface p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-semibold text-text-primary mb-4">Save to Portfolio</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-text-muted mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-text-muted mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ManualPortfolioStatus)}
                  className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-brand cursor-pointer"
                >
                  <option value="watching">Watching</option>
                  <option value="analysing">Analysing</option>
                  <option value="purchased">Purchased</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-border-default py-2 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
              >
                {saved ? <><Check className="h-4 w-4" /> Saved!</> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
