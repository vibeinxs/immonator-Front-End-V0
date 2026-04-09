"use client"

import * as React from "react"
import { useLocale } from "@/lib/i18n/locale-context"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { extractFromUrl, extractFromFile } from "@/lib/extractionApi"
import type { ExtractionResult, AnalyseRequest } from "@/types/api"

// ─── Field label lookup ───────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  address: "Address",
  sqm: "Area (m²)",
  year_built: "Year built",
  condition: "Condition",
  energy_class: "Energy class",
  purchase_price: "Purchase price",
  equity: "Equity",
  interest_rate: "Interest rate",
  repayment_rate: "Repayment rate",
  transfer_tax_pct: "Transfer tax",
  notary_pct: "Notary",
  agent_pct: "Agent commission",
  land_share_pct: "Land share",
  rent_monthly: "Monthly rent",
  hausgeld_monthly: "Hausgeld",
  maintenance_nd: "Maintenance",
  management_nd: "Management",
  grundsteuer_annual: "Grundsteuer",
  rent_growth: "Rent growth",
  appreciation: "Appreciation",
  tax_rate: "Tax rate",
  holding_years: "Holding years",
  afa_rate_input: "AfA rate",
  vacancy_rate: "Vacancy rate",
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResultRow({
  fieldKey,
  value,
  variant,
}: {
  fieldKey: string
  value: unknown
  variant: "extracted" | "assumed"
}) {
  const display = typeof value === "boolean" ? String(value) : String(value ?? "—")
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-text-secondary">{fieldLabel(fieldKey)}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-text-primary">{display}</span>
        {variant === "extracted" ? (
          <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success">
            extracted
          </span>
        ) : (
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning">
            assumed
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DocExtractDrawerProps {
  open: boolean
  onClose: () => void
  onApply: (result: ExtractionResult) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocExtractDrawer({ open, onClose, onApply }: DocExtractDrawerProps) {
  const { t } = useLocale()

  const [inputMode, setInputMode] = React.useState<"url" | "file">("url")
  const [url, setUrl] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const [status, setStatus] = React.useState<"idle" | "loading" | "done" | "error">("idle")
  const [result, setResult] = React.useState<ExtractionResult | null>(null)
  const [errorMsg, setErrorMsg] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  function reset() {
    setUrl("")
    setFile(null)
    setStatus("idle")
    setResult(null)
    setErrorMsg("")
  }

  async function handleExtract() {
    setStatus("loading")
    setResult(null)
    setErrorMsg("")

    let res: { data: ExtractionResult | null; error: string | null }

    if (inputMode === "url") {
      res = await extractFromUrl(url.trim())
    } else if (file) {
      res = await extractFromFile(file)
    } else {
      setStatus("idle")
      return
    }

    if (res.error || !res.data) {
      setErrorMsg(res.error ?? t("extract.error"))
      setStatus("error")
    } else {
      setResult(res.data)
      setStatus("done")
    }
  }

  function handleApply() {
    if (result) {
      onApply(result)
      onClose()
      reset()
    }
  }

  const canExtract =
    status !== "loading" &&
    (inputMode === "url" ? url.trim().length > 0 : file !== null)

  const extractedEntries = result
    ? (Object.entries(result.extracted) as [string, AnalyseRequest[keyof AnalyseRequest]][])
    : []
  const assumedEntries = result
    ? (Object.entries(result.assumed) as [string, AnalyseRequest[keyof AnalyseRequest]][])
    : []

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { onClose(); reset() } }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border-default px-4 py-4">
          <SheetTitle className="text-base font-semibold text-text-primary">
            {t("extract.title")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border-default overflow-hidden text-sm">
            {(["url", "file"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setInputMode(m); reset() }}
                className={`flex-1 py-1.5 font-medium transition-colors ${
                  inputMode === m
                    ? "bg-brand text-white"
                    : "bg-bg-elevated text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {m === "url" ? "URL" : "File"}
              </button>
            ))}
          </div>

          {/* URL input */}
          {inputMode === "url" && (
            <div>
              <p className="mb-1 text-xs font-medium text-text-secondary">
                {t("extract.urlLabel")}
              </p>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.immobilienscout24.de/..."
                className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
              />
            </div>
          )}

          {/* File input */}
          {inputMode === "file" && (
            <div>
              <p className="mb-1 text-xs font-medium text-text-secondary">
                {t("extract.fileLabel")}
              </p>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-default bg-bg-elevated px-4 py-6 text-center cursor-pointer hover:border-brand/50 transition-colors"
              >
                {file ? (
                  <span className="text-sm font-medium text-text-primary">{file.name}</span>
                ) : (
                  <>
                    <span className="text-sm text-text-secondary">Click to choose file</span>
                    <span className="text-xs text-text-muted">PDF, Word (.docx), Excel (.xlsx)</span>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.xlsx"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {/* Extract button */}
          <button
            type="button"
            onClick={handleExtract}
            disabled={!canExtract}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {status === "loading" ? t("extract.loading") : t("extract.extractBtn")}
          </button>

          {/* Error */}
          {status === "error" && (
            <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
              {errorMsg}
            </p>
          )}

          {/* Results */}
          {status === "done" && result && (
            <div className="space-y-3">
              {/* Warning */}
              <div className="rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning">
                {t("extract.warning")}
              </div>

              {/* Extracted fields */}
              {extractedEntries.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {t("extract.extracted")}
                  </p>
                  <div className="divide-y divide-border-default rounded-lg border border-border-default px-3">
                    {extractedEntries.map(([k, v]) => (
                      <ResultRow key={k} fieldKey={k} value={v} variant="extracted" />
                    ))}
                  </div>
                </div>
              )}

              {/* Assumed fields */}
              {assumedEntries.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {t("extract.assumed")}
                  </p>
                  <div className="divide-y divide-border-default rounded-lg border border-border-default px-3">
                    {assumedEntries.map(([k, v]) => (
                      <ResultRow key={k} fieldKey={k} value={v} variant="assumed" />
                    ))}
                  </div>
                </div>
              )}

              {/* Missing fields */}
              {result.missing.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {t("extract.notFound")}
                  </p>
                  <div className="divide-y divide-border-default rounded-lg border border-border-default px-3">
                    {result.missing.map((k) => (
                      <div key={k} className="flex items-center justify-between py-1 text-sm">
                        <span className="text-text-muted">{fieldLabel(k)}</span>
                        <span className="text-xs text-text-muted">—</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              <p className="text-xs text-text-muted text-right">
                Confidence: <span className="font-medium">{result.confidence}</span>
                {result.notes && ` · ${result.notes}`}
              </p>
            </div>
          )}
        </div>

        {/* Footer — Apply button (only shown when results available) */}
        {status === "done" && result && (
          <div className="shrink-0 border-t border-border-default p-4">
            <button
              type="button"
              onClick={handleApply}
              className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              {t("extract.applyBtn")}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
