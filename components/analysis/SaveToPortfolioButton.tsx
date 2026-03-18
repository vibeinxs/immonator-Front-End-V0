"use client"

import { useEffect, useMemo, useState } from "react"
import { BookmarkPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { saveEntry, type ManualPortfolioStatus } from "@/lib/manualPortfolio"
import { cn } from "@/lib/utils"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"

interface SaveToPortfolioButtonProps {
  input: AnalyseRequest
  result: AnalyseResponse | null
  className?: string
}

const STATUS_OPTIONS: ManualPortfolioStatus[] = ["watching", "analysing", "negotiating", "purchased", "rejected"]

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isValidAnalysisResult(result: AnalyseResponse | null): result is AnalyseResponse {
  if (!result) return false

  return (
    isFiniteNumber(result.score) &&
    isFiniteNumber(result.net_yield_pct) &&
    isFiniteNumber(result.kpf) &&
    isFiniteNumber(result.cash_flow_monthly_yr1) &&
    isFiniteNumber(result.irr_10) &&
    Array.isArray(result.year_data)
  )
}

function getDefaultName(input: AnalyseRequest, result: AnalyseResponse | null) {
  const resolvedAddress = typeof result?.address_resolved === "string" ? result.address_resolved.trim() : ""
  const inputAddress = input.address.trim()

  return resolvedAddress || inputAddress || "Manual Property"
}

export function SaveToPortfolioButton({ input, result, className }: SaveToPortfolioButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(getDefaultName(input, result))
  const [status, setStatus] = useState<ManualPortfolioStatus>("watching")

  const canSave = useMemo(() => isValidAnalysisResult(result), [result])

  useEffect(() => {
    if (!open) {
      setName(getDefaultName(input, result))
      setStatus("watching")
    }
  }, [input, open, result])

  const trimmedName = name.trim()
  const saveDisabled = !canSave || trimmedName.length === 0

  const handleSave = () => {
    if (!result || !canSave || trimmedName.length === 0) return

    saveEntry({
      name: trimmedName,
      status,
      input,
      result,
    })

    toast({
      title: "Saved to portfolio",
      description: `${trimmedName} is now in your manual portfolio.`,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("gap-2", className)}
          disabled={!canSave}
        >
          <BookmarkPlus className="h-4 w-4" />
          Save to portfolio
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border-default bg-bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Save Property A to portfolio</DialogTitle>
          <DialogDescription className="text-text-secondary">
            Save the current manual analysis input and result for Property A into local manual portfolio storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portfolio-entry-name" className="text-text-primary">Name</Label>
            <Input
              id="portfolio-entry-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter a portfolio name"
              className="border-border-default bg-bg-base text-text-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio-entry-status" className="text-text-primary">Status</Label>
            <select
              id="portfolio-entry-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ManualPortfolioStatus)}
              className="flex h-10 w-full rounded-md border border-border-default bg-bg-base px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-brand"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {!canSave ? (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              Run a valid Property A analysis before saving to the portfolio.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saveDisabled}>
            Save entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
