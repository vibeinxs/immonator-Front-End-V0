"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, AlertTriangle, CheckCircle2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useAnalysisStore } from "@/store/analysisStore"
import { PRESET_A } from "@/features/analysis/presets"
import { extractFromUrl, extractFromFile } from "@/lib/immonatorApi"
import type { ImportExtractResponse, ImportExtractProperty, AnalyseRequest } from "@/types/api"

type FetchStatus = "idle" | "loading" | "success" | "error"

/** Map extracted property fields → AnalyseRequest, filling gaps from PRESET_A defaults. */
function buildAnalyseRequest(p: ImportExtractProperty): AnalyseRequest {
  const parts = [p.address, p.zip && p.city ? `${p.zip} ${p.city}` : (p.city ?? p.zip)].filter(Boolean)
  const address = parts.join(", ") || ""

  return {
    ...PRESET_A,
    address: address || PRESET_A.address,
    purchase_price: p.purchase_price ?? PRESET_A.purchase_price,
    sqm: p.living_area_sqm ?? PRESET_A.sqm,
    year_built: p.year_built ?? PRESET_A.year_built,
    rent_monthly: p.cold_rent ?? p.warm_rent ?? PRESET_A.rent_monthly,
    hausgeld_monthly: p.maintenance_reserve ?? PRESET_A.hausgeld_monthly,
  }
}

/** Format a number as €-currency for display. */
function eur(value: number | null): string {
  if (value == null) return "—"
  return `€${value.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
}

export default function ImportListingsPage() {
  const router = useRouter()
  const { setInputA } = useAnalysisStore()

  const [urls, setUrls] = useState("")
  const [status, setStatus] = useState<FetchStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [extracted, setExtracted] = useState<ImportExtractResponse | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [manualConfirmation, setManualConfirmation] = useState(false)

  const canFetch = urls.trim().length > 0 || uploadedFiles.length > 0
  const canUseDestination = Boolean(extracted) || manualConfirmation

  const helperMessage = useMemo(() => {
    if (uploadedFiles.length === 0) return null
    return `${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""} selected`
  }, [uploadedFiles.length])

  const handleClear = () => {
    setUrls("")
    setUploadedFiles([])
    setStatus("idle")
    setErrorMessage("")
    setExtracted(null)
    setManualConfirmation(false)
  }

  const handleFetchDetails = async () => {
    if (!canFetch) {
      setStatus("error")
      setErrorMessage("Please paste a listing link or upload a document before fetching.")
      return
    }

    setStatus("loading")
    setErrorMessage("")
    setExtracted(null)

    // Prefer file upload if a file was selected, otherwise use URL extraction
    if (uploadedFiles.length > 0) {
      const { data, error } = await extractFromFile(uploadedFiles[0])
      if (error || !data) {
        setStatus("error")
        setErrorMessage(error || "Extraction failed. Please try again.")
        return
      }
      setExtracted(data)
      setStatus("success")
      return
    }

    const url = urls.trim().split(/\s+/)[0] // first URL
    const { data, error } = await extractFromUrl(url)
    if (error || !data) {
      setStatus("error")
      setErrorMessage(error || "We could not extract details from the provided input. Please review and retry.")
      return
    }
    setExtracted(data)
    setStatus("success")
  }

  const handleAnalyzeNow = () => {
    if (!extracted) return
    const input = buildAnalyseRequest(extracted.property)
    setInputA(input)
    router.push("/analyse")
  }

  const p = extracted?.property ?? null

  return (
    <div className="mx-auto w-full max-w-[960px] py-2">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-text-primary">Import Listings</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Add a listing source in Step 1, review extracted details in Step 2, then choose where to send it in Step 3.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step 1 · Input source</p>
            <CardTitle className="text-sm text-text-primary">Paste listing link</CardTitle>
            <p className="text-sm text-text-secondary">
              Paste a property URL and fetch the detected details automatically.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://www.immobilienscout24.de/expose/123456789"
              className="min-h-32"
            />

            <div className="rounded-lg border border-dashed border-border-default bg-bg-base p-4">
              <p className="text-sm font-medium text-text-primary">Or upload listing documents</p>
              <p className="mt-1 text-xs text-text-secondary">
                Upload exposés, rent sheets, screenshots, or spreadsheets
              </p>
              <p className="mt-1 text-xs text-text-muted">Upload PDF, Excel, CSV, or screenshots</p>
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-base">
                <Upload className="size-4" />
                Select file(s)
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.xls,.xlsx,.csv,image/*"
                  onChange={(e) => setUploadedFiles(Array.from(e.target.files ?? []))}
                />
              </label>
              {helperMessage ? <p className="mt-2 text-xs text-text-secondary">{helperMessage}</p> : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button onClick={handleFetchDetails} disabled={status === "loading"} className="sm:w-auto">
                {status === "loading" ? (
                  <>
                    <Spinner className="size-4" />
                    Fetching...
                  </>
                ) : (
                  "Fetch details"
                )}
              </Button>
              <Button variant="ghost" onClick={handleClear} className="sm:w-auto">
                Clear
              </Button>
            </div>

            {status === "error" && (
              <div role="alert" className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4" />
                  <p>{errorMessage}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleFetchDetails} className="w-fit">
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Step 2 · Review extracted details
            </p>
            <CardTitle className="text-sm text-text-primary">Review extracted details</CardTitle>
          </CardHeader>
          <CardContent>
            {status === "success" && extracted && p ? (
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  Details fetched successfully from {extracted.source_name}.
                </p>
                <div className="grid gap-2 rounded-md border border-border-default bg-bg-base p-3 sm:grid-cols-2">
                  <p>
                    <span className="text-text-secondary">Address:</span>{" "}
                    {[p.address, p.zip, p.city].filter(Boolean).join(", ") || "—"}
                  </p>
                  <p>
                    <span className="text-text-secondary">Price:</span> {eur(p.purchase_price)}
                  </p>
                  <p>
                    <span className="text-text-secondary">Cold rent:</span> {eur(p.cold_rent)}
                    {p.cold_rent == null && p.warm_rent != null && ` (warm: ${eur(p.warm_rent)})`}
                  </p>
                  <p>
                    <span className="text-text-secondary">Size:</span>{" "}
                    {p.living_area_sqm != null ? `${p.living_area_sqm} m²` : "—"}
                  </p>
                  <p>
                    <span className="text-text-secondary">Rooms:</span> {p.rooms ?? "—"}
                  </p>
                  <p>
                    <span className="text-text-secondary">Year built:</span> {p.year_built ?? "—"}
                  </p>
                  {p.title && (
                    <p className="sm:col-span-2">
                      <span className="text-text-secondary">Title:</span> {p.title}
                    </p>
                  )}
                </div>

                {extracted.extraction_warnings.length > 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <ul className="list-disc pl-4 text-xs">
                      {extracted.extraction_warnings.map((w, i) => (
                        <li key={`${i}-${w}`}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {extracted.missing_fields.length > 0 && (
                  <p className="text-xs text-text-muted">
                    Missing fields: {extracted.missing_fields.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Extracted fields (address, price, rent, sqm) appear here after you fetch details.
              </p>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-md border border-border-default p-3">
              <Checkbox
                id="manual-confirm"
                checked={manualConfirmation}
                onCheckedChange={(checked) => setManualConfirmation(checked === true)}
              />
              <label htmlFor="manual-confirm" className="text-sm text-text-secondary">
                I confirm the input is complete and can be used even if extraction is unavailable.
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step 3 · Choose destination</p>
            <CardTitle className="text-sm text-text-primary">Choose destination</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button disabled={!canUseDestination} onClick={handleAnalyzeNow}>
                Analyze now
              </Button>
              <Button variant="outline" disabled={!canUseDestination}>
                Save to Portfolio
              </Button>
            </div>
            {!canUseDestination && (
              <p className="mt-2 text-xs text-text-muted">
                Fetch details first, or manually confirm the input in Step 2 to continue.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
