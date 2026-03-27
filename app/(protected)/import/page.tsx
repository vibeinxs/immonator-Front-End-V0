"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAnalysisStore } from "@/store/analysisStore"
import {
  extractListingFromUrl,
  extractListingFromFile,
  createManualProperty,
  saveToPortfolio,
} from "@/lib/immonatorApi"
import { PRESET_A } from "@/features/analysis/presets"
import type { ImportExtractResponse } from "@/types/api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCEPTED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const ACCEPTED_EXT = [".pdf", ".xlsx", ".xls", ".csv", ".jpg", ".jpeg", ".png", ".webp", ".gif"]

function detectSourceType(
  file: File
): ImportExtractResponse["source_type"] | null {
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) return "pdf"
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx"
  if (name.endsWith(".csv")) return "csv"
  if (/\.(jpe?g|png|webp|gif)$/.test(name)) return "image"
  if (ACCEPTED_MIME.has(file.type)) {
    if (file.type === "application/pdf") return "pdf"
    if (file.type.includes("spreadsheet") || file.type.includes("excel")) return "xlsx"
    if (file.type === "text/csv") return "csv"
    if (file.type.startsWith("image/")) return "image"
  }
  return null
}

function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim())
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

// ─── Field display config ─────────────────────────────────────────────────────

const FIELD_LABELS: Array<{
  key: keyof ImportExtractResponse["property"]
  label: string
  format?: (v: unknown) => string
}> = [
  { key: "title", label: "Title" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "zip", label: "ZIP" },
  {
    key: "purchase_price",
    label: "Purchase price",
    format: (v) => v != null ? `€${Number(v).toLocaleString("de-DE")}` : "",
  },
  {
    key: "living_area_sqm",
    label: "Living area",
    format: (v) => v != null ? `${v} m²` : "",
  },
  { key: "rooms", label: "Rooms", format: (v) => v != null ? String(v) : "" },
  { key: "year_built", label: "Year built", format: (v) => v != null ? String(v) : "" },
  {
    key: "cold_rent",
    label: "Cold rent",
    format: (v) => v != null ? `€${Number(v).toLocaleString("de-DE")}/mo` : "",
  },
  {
    key: "warm_rent",
    label: "Warm rent",
    format: (v) => v != null ? `€${Number(v).toLocaleString("de-DE")}/mo` : "",
  },
  {
    key: "rent_per_sqm",
    label: "Rent/m²",
    format: (v) => v != null ? `€${Number(v).toFixed(2)}/m²` : "",
  },
  {
    key: "maintenance_reserve",
    label: "Maintenance reserve",
    format: (v) => v != null ? `€${Number(v).toLocaleString("de-DE")}/mo` : "",
  },
  { key: "parking", label: "Parking" },
  { key: "notes", label: "Notes" },
]

// ─── Component ────────────────────────────────────────────────────────────────

type SourceMode = "url" | "file"
type Status = "idle" | "loading" | "success" | "error"
const IMPORT_FLOW_TAG = "[ImportListingsPage]"
type ImportExtractionResponseWire = ImportExtractResponse & {
  success?: boolean
  error?: string | null
  message?: string | null
  detail?: string | null
}

function isLikelyUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function sanitizeAddress(address: string | null | undefined): string {
  const normalized = typeof address === "string" ? address.trim() : ""
  if (!normalized) return ""
  if (isLikelyUrl(normalized)) return ""
  return normalized
}

function hasMeaningfulStructuredFields(property: ImportExtractResponse["property"]): boolean {
  const keys: Array<keyof ImportExtractResponse["property"]> = [
    "title",
    "address",
    "city",
    "zip",
    "purchase_price",
    "living_area_sqm",
    "rooms",
    "year_built",
    "cold_rent",
    "warm_rent",
    "rent_per_sqm",
    "maintenance_reserve",
    "parking",
    "notes",
  ]

  return keys.some((key) => {
    const value = property[key]
    if (typeof value === "string") return value.trim().length > 0
    return value != null
  })
}

function resolveBackendMessage(response: ImportExtractionResponseWire | null | undefined): string | null {
  if (!response) return null
  return response.error || response.detail || response.message || null
}

function buildExtractionErrorLabel(
  fallback: string,
  error: string | null,
  status?: number,
  errorKind?: "network" | "unauthorized" | "forbidden" | "not_found" | "invalid_input" | "server" | "unknown"
): string {
  if (errorKind === "network") return "Network failure — please check your connection and retry."
  if (status === 401 || status === 403) return error || "Unauthorized — please sign in and try again."
  if (status === 404) return error || "Extraction endpoint not found (404)."
  if (status === 422) return error || "Invalid input (422)."
  if (errorKind === "server") return error || "Server error — please try again."
  return error || fallback
}

function normalizeExtractionResult(
  data: ImportExtractResponse | null,
  error: string | null,
  fallbackError: string,
  status?: number,
  errorKind?: "network" | "unauthorized" | "forbidden" | "not_found" | "invalid_input" | "server" | "unknown"
): { result: ImportExtractResponse | null; extractionError: string | null } {
  const wireData = data as ImportExtractionResponseWire | null
  const backendError = resolveBackendMessage(wireData) ?? error

  if (error || !wireData) {
    return {
      result: null,
      extractionError: buildExtractionErrorLabel(fallbackError, backendError, status, errorKind),
    }
  }

  if (wireData.success === false) {
    return {
      result: null,
      extractionError: backendError ?? "Extraction failed.",
    }
  }

  const sanitizedAddress = sanitizeAddress(wireData.property.address)
  const normalizedResult: ImportExtractResponse = {
    ...wireData,
    property: {
      ...wireData.property,
      address: sanitizedAddress || undefined,
    },
  }

  if (!hasMeaningfulStructuredFields(normalizedResult.property)) {
    return {
      result: null,
      extractionError: "No meaningful structured property fields were extracted.",
    }
  }

  return { result: normalizedResult, extractionError: null }
}

export default function ImportListingsPage() {
  const router = useRouter()
  const { setInputA } = useAnalysisStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sourceMode, setSourceMode] = useState<SourceMode>("url")
  const [urlInput, setUrlInput] = useState("")
  const [urlError, setUrlError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [status, setStatus] = useState<Status>("idle")
  const [result, setResult] = useState<ImportExtractResponse | null>(null)
  const [extractionError, setExtractionError] = useState<string | null>(null)

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── URL fetch ──────────────────────────────────────────────────────────────

  async function handleFetchUrl() {
    console.log(`${IMPORT_FLOW_TAG} route=/import action=fetch-url:start`, {
      sourceMode,
      textareaState: urlInput,
    })
    setUrlError(null)
    setExtractionError(null)
    setResult(null)

    const trimmed = urlInput.trim()
    const validationPassed = Boolean(trimmed) && isValidUrl(trimmed)
    console.log(`${IMPORT_FLOW_TAG} route=/import action=fetch-url:validate`, {
      rawInputValue: urlInput,
      trimmedValue: trimmed,
      validationPassed,
    })
    if (!trimmed) {
      setUrlError("Please paste a listing URL.")
      return
    }
    if (!isValidUrl(trimmed)) {
      setUrlError("Invalid URL — must start with http:// or https://")
      return
    }

    setStatus("loading")
    const requestPayload = { url: trimmed }
    console.log(`${IMPORT_FLOW_TAG} route=/import action=fetch-url:request`, requestPayload)
    const { data, error, status: responseStatus, errorKind } = await extractListingFromUrl(trimmed)
    console.log(`${IMPORT_FLOW_TAG} route=/import action=fetch-url:response`, {
      data,
      error,
      responseStatus,
      errorKind,
    })

    const normalized = normalizeExtractionResult(
      data,
      error,
      "Extraction failed — the listing could not be read.",
      responseStatus,
      errorKind
    )

    if (!normalized.result) {
      setStatus("error")
      setExtractionError(normalized.extractionError)
      return
    }

    setResult(normalized.result)
    setStatus("success")
  }

  // ── File extraction ────────────────────────────────────────────────────────

  function handleFileSelect(selected: File) {
    setFileError(null)
    setExtractionError(null)
    setResult(null)
    setStatus("idle")
    setSaveStatus("idle")

    const type = detectSourceType(selected)
    if (!type) {
      setFileError(
        `Unsupported file type. Accepted: PDF, XLSX, CSV, JPEG, PNG, WEBP`
      )
      setFile(null)
      return
    }
    setFile(selected)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFileSelect(selected)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) handleFileSelect(dropped)
  }

  async function handleExtractFile() {
    if (!file) return
    setExtractionError(null)
    setResult(null)
    setStatus("loading")
    console.log(`${IMPORT_FLOW_TAG} route=/import action=extract-file:request`, {
      sourceMode,
      file: file ? { name: file.name, type: file.type, size: file.size } : null,
    })

    const { data, error, status: responseStatus, errorKind } = await extractListingFromFile(file)
    console.log(`${IMPORT_FLOW_TAG} route=/import action=extract-file:response`, {
      data,
      error,
      responseStatus,
      errorKind,
    })

    const normalized = normalizeExtractionResult(
      data,
      error,
      "Extraction failed — could not parse the file.",
      responseStatus,
      errorKind
    )

    if (!normalized.result) {
      setStatus("error")
      setExtractionError(normalized.extractionError)
      return
    }

    setResult(normalized.result)
    setStatus("success")
  }

  // ── Tab switch resets ──────────────────────────────────────────────────────

  function switchMode(mode: SourceMode) {
    setSourceMode(mode)
    setResult(null)
    setStatus("idle")
    setExtractionError(null)
    setUrlError(null)
    setFileError(null)
    setSaveStatus("idle")
  }

  // ── Destinations ───────────────────────────────────────────────────────────

  function handleAnalyzeNow() {
    if (!result) return
    const p = result.property
    setInputA({
      ...PRESET_A,
      address: [p.address, p.city, p.zip].filter(Boolean).join(", ") || PRESET_A.address,
      sqm: p.living_area_sqm ?? PRESET_A.sqm,
      year_built: p.year_built ?? PRESET_A.year_built,
      purchase_price: p.purchase_price ?? PRESET_A.purchase_price,
      equity: p.purchase_price ? Math.round(p.purchase_price * 0.2) : PRESET_A.equity,
      rent_monthly: p.warm_rent ?? p.cold_rent ?? PRESET_A.rent_monthly,
      hausgeld_monthly: p.maintenance_reserve ?? PRESET_A.hausgeld_monthly,
    })
    router.push("/analyse")
  }

  async function handleSaveToPortfolio() {
    if (!result) return
    setSaveStatus("saving")
    setSaveError(null)

    const p = result.property
    const createRes = await createManualProperty({
      source: "manual",
      title: p.title || result.source_name || "Imported listing",
      city: p.city || "",
      zip_code: p.zip || undefined,
      price: p.purchase_price ?? 0,
      size_sqm: p.living_area_sqm ?? 0,
      rooms: p.rooms ?? 0,
      year_built: p.year_built ?? undefined,
      estimated_rent: p.warm_rent ?? p.cold_rent ?? undefined,
      notes: [
        p.notes,
        result.extraction_warnings.length ? `Warnings: ${result.extraction_warnings.join("; ")}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || undefined,
      listing_url: sourceMode === "url" ? urlInput.trim() : undefined,
    })

    if (createRes.error || !createRes.data?.id) {
      setSaveStatus("error")
      setSaveError(createRes.error ?? "Could not save property.")
      return
    }

    const watchRes = await saveToPortfolio(createRes.data.id)
    if (watchRes.error) {
      setSaveStatus("error")
      setSaveError(watchRes.error)
      return
    }

    setSaveStatus("saved")
    router.push("/portfolio")
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasValidExtraction = status === "success" && !!result && hasMeaningfulStructuredFields(result.property)
  const canExtractFile = !!file && status !== "loading"
  const canDestinate = hasValidExtraction

  return (
    <div className="mx-auto w-full max-w-[960px] py-2">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-text-primary">
          Import Listings
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Paste a listing URL or upload a file, review the extracted fields, then send to Analyze or Portfolio.
        </p>
      </div>

      <div className="space-y-4">
        {/* ── Step 1 ── */}
        <section className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step 1</p>
          <h2 className="mt-1 text-sm font-semibold text-text-primary">Add listing source</h2>

          {/* Source tabs */}
          <div className="mt-3 flex gap-1 rounded-lg border border-border-default bg-bg-base p-1 w-fit">
            {(["url", "file"] as SourceMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  sourceMode === m
                    ? "bg-bg-surface text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {m === "url" ? "Link / URL" : "File upload"}
              </button>
            ))}
          </div>

          {/* URL input */}
          {sourceMode === "url" && (
            <div className="mt-3 space-y-2">
              <textarea
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value)
                  setUrlError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleFetchUrl()
                  }
                }}
                placeholder="https://www.immobilienscout24.de/expose/123456789"
                rows={2}
                className={`w-full rounded-xl border px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 bg-bg-base resize-none ${
                  urlError ? "border-red-400" : "border-border-default"
                }`}
              />
              {urlError && (
                <p className="text-xs text-red-500">{urlError}</p>
              )}
              <button
                onClick={handleFetchUrl}
                disabled={status === "loading"}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" && sourceMode === "url"
                  ? "Fetching…"
                  : "Fetch details"}
              </button>
            </div>
          )}

          {/* File input */}
          {sourceMode === "file" && (
            <div className="mt-3 space-y-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-colors ${
                  dragOver
                    ? "border-brand bg-brand/5"
                    : "border-border-default bg-bg-base hover:border-brand/50"
                }`}
              >
                <svg
                  className="h-8 w-8 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                {file ? (
                  <span className="text-sm font-medium text-text-primary">{file.name}</span>
                ) : (
                  <>
                    <span className="text-sm text-text-secondary">
                      Drop a file here or <span className="text-brand underline">browse</span>
                    </span>
                    <span className="text-xs text-text-muted">
                      PDF · XLSX · XLS · CSV · Images
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={`${ACCEPTED_EXT.join(",")},image/*`}
                onChange={handleFileInputChange}
                className="hidden"
              />
              {fileError && (
                <p className="text-xs text-red-500">{fileError}</p>
              )}
              {file && (
                <button
                  onClick={handleExtractFile}
                  disabled={!canExtractFile}
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "loading" && sourceMode === "file"
                    ? "Extracting…"
                    : "Extract details"}
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Step 2 ── */}
        <section className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step 2</p>
          <h2 className="mt-1 text-sm font-semibold text-text-primary">
            Review extracted details
          </h2>

          {status === "loading" && (
            <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              Extracting property data…
            </div>
          )}

          {status === "error" && extractionError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">{extractionError}</p>
            </div>
          )}

          {status === "success" && result && (
            <div className="mt-3 space-y-3">
              {/* Source badge */}
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand uppercase">
                  {result.source_type}
                </span>
                <span className="text-xs text-text-muted truncate max-w-xs">{result.source_name}</span>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                {FIELD_LABELS.map(({ key, label, format }) => {
                  const val = result.property[key]
                  if (val == null || val === "") return null
                  const display = format ? format(val) : String(val)
                  return (
                    <div key={key}>
                      <p className="text-xs text-text-muted">{label}</p>
                      <p className="text-sm font-medium text-text-primary">{display}</p>
                    </div>
                  )
                })}
              </div>

              {/* Warnings */}
              {result.extraction_warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Extraction warnings</p>
                  <ul className="space-y-0.5">
                    {result.extraction_warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-700">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing fields */}
              {result.missing_fields.length > 0 && (
                <p className="text-xs text-text-muted">
                  Missing fields:{" "}
                  <span className="text-text-secondary">
                    {result.missing_fields.join(", ")}
                  </span>
                </p>
              )}
            </div>
          )}

          {status === "idle" && (
            <p className="mt-2 text-sm text-text-secondary">
              Extracted fields will appear here for review before sending to analysis or portfolio.
            </p>
          )}
        </section>

        {/* ── Step 3 ── */}
        <section className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step 3</p>
          <h2 className="mt-1 text-sm font-semibold text-text-primary">Choose destination</h2>

          {!canDestinate && (
            <p className="mt-2 text-xs text-text-muted">
              Available after a successful extraction.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleAnalyzeNow}
              disabled={!canDestinate}
              className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyze now
            </button>
            <button
              onClick={handleSaveToPortfolio}
              disabled={!canDestinate || saveStatus === "saving"}
              className="rounded-lg border border-border-default px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saveStatus === "saving" ? "Saving…" : "Save to Portfolio"}
            </button>
          </div>

          {saveError && (
            <p className="mt-2 text-xs text-red-500">{saveError}</p>
          )}
        </section>
      </div>
    </div>
  )
}
