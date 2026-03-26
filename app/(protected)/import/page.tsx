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

const ACCEPTED_EXT = [".pdf", ".xlsx", ".xls", ".csv", ".jpg", ".jpeg", ".png", ".webp"]

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
    setUrlError(null)
    setExtractionError(null)
    setResult(null)

    const trimmed = urlInput.trim()
    if (!trimmed) {
      setUrlError("Please paste a listing URL.")
      return
    }
    if (!isValidUrl(trimmed)) {
      setUrlError("Invalid URL — must start with http:// or https://")
      return
    }

    setStatus("loading")
    const { data, error } = await extractListingFromUrl(trimmed)

    if (error || !data) {
      setStatus("error")
      setExtractionError(error ?? "Extraction failed — the listing could not be read.")
      return
    }

    const hasFields = Object.values(data.property).some((v) => v != null && v !== "")
    if (!hasFields) {
      setStatus("error")
      setExtractionError("No meaningful fields found in this listing.")
      return
    }

    setResult(data)
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

    const { data, error } = await extractListingFromFile(file)

    if (error || !data) {
      setStatus("error")
      setExtractionError(error ?? "Extraction failed — could not parse the file.")
      return
    }

    const hasFields = Object.values(data.property).some((v) => v != null && v !== "")
    if (!hasFields) {
      setStatus("error")
      setExtractionError("No meaningful property fields found in this file.")
      return
    }

    setResult(data)
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

  const canExtractFile = !!file && status !== "loading"
  const canDestinate = status === "success"

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
                      PDF · XLSX · CSV · JPG · PNG · WEBP
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXT.join(",")}
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
