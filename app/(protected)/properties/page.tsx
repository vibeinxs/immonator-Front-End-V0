"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  Plus,
  ChevronDown,
  X,
  Heart,
  LayoutGrid,
  List,
  Search,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VerdictBadge } from "@/components/verdict-badge"
import { immoApi, saveToPortfolio, getCompactAnalysis } from "@/lib/immonatorApi"
import { copy } from "@/lib/copy"
import { getUserName, isNewUser, setNewUserSeen } from "@/lib/auth"
import { useLocale } from "@/lib/i18n/locale-context"
import { EUR } from "@/lib/utils"

/* ── Types ───────────────────────────────────────── */
interface Property {
  id: string
  title: string
  address: string
  city: string
  zip: string
  price: number
  price_per_sqm: number
  sqm: number
  rooms: number
  year_built: number
  image_url?: string
  days_listed: number
  gross_yield: number
  compact_analysis?: {
    verdict: "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"
    one_line_summary: string
  }
  is_watched?: boolean
}

interface Stats {
  total: number
  cities: number
}

/* ── Toast ───────────────────────────────────────── */
function Toast({
  message,
  variant = "default",
  onDismiss,
}: {
  message: string
  variant?: "default" | "success" | "warning"
  onDismiss: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-up">
      <div
        className={`flex min-w-[280px] items-center rounded-xl border border-border-default bg-bg-surface px-5 py-3 text-sm text-text-primary shadow-lg ${
          variant === "success"
            ? "border-l-[3px] border-l-success"
            : variant === "warning"
              ? "border-l-[3px] border-l-warning"
              : ""
        }`}
      >
        {message}
      </div>
    </div>
  )
}

/* ── EmptyState ──────────────────────────────────── */
function EmptyState({
  icon,
  headline,
  body,
  actionLabel,
  onAction,
}: {
  icon: string
  headline: string
  body: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-5xl">{icon}</span>
      <h3 className="mt-4 font-serif text-xl text-text-primary">{headline}</h3>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">{body}</p>
      <button
        onClick={onAction}
        className="mt-6 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover"
      >
        {actionLabel}
      </button>
    </div>
  )
}

/* ── ContextHint ─────────────────────────────────── */
function ContextHint({
  hintId,
  headline,
  body,
}: {
  hintId: string
  headline: string
  body: string
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(`hint_${hintId}`)
      if (!dismissed) setVisible(true)
    }
  }, [hintId])

  if (!visible) return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-subtle px-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-brand">{headline}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{body}</p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(`hint_${hintId}`, "true")
          setVisible(false)
        }}
        className="text-text-muted transition-colors hover:text-text-primary"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ── OnboardingOverlay ───────────────────────────── */
function OnboardingOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useLocale()
  const [screen, setScreen] = useState(0)
  const name = getUserName() || "Investor"

  const dismiss = () => {
    setNewUserSeen()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg-surface/95 backdrop-blur-sm">
      <button
        onClick={dismiss}
        className="absolute top-6 right-6 text-text-muted transition-colors hover:text-text-primary"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Progress dots */}
      <div className="absolute bottom-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === screen ? "bg-brand" : "bg-border-strong"
            }`}
          />
        ))}
      </div>

      <div className="max-w-md px-6 text-center">
        {screen === 0 && (
          <div className="animate-fade-in">
            <h2 className="font-serif text-4xl text-text-primary">
              {t("properties.onboard.s1.title").replace("{0}", name)}
            </h2>
            <p className="mt-3 text-text-secondary">
              {t("properties.onboard.s1.body")}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              {[
                t("properties.onboard.s1.check1"),
                t("properties.onboard.s1.check2"),
                t("properties.onboard.s1.check3"),
              ].map((line, i) => (
                <p
                  key={i}
                  className="text-sm font-medium text-success"
                  style={{
                    opacity: 0,
                    animation: `fade-up 300ms ease forwards`,
                    animationDelay: `${i * 400}ms`,
                  }}
                >
                  {"✓"} {line}
                </p>
              ))}
            </div>
            <button
              onClick={() => setScreen(1)}
              className="mt-8 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover"
              style={{
                opacity: 0,
                animation: "fade-up 300ms ease forwards",
                animationDelay: "900ms",
              }}
            >
              {t("properties.onboard.s1.cta")} {"\u2192"}
            </button>
          </div>
        )}

        {screen === 1 && (
          <div className="animate-fade-in">
            <h2 className="font-serif text-3xl text-text-primary">
              {t("properties.onboard.s2.title")}
            </h2>
            <p className="mt-3 text-text-secondary">
              {t("properties.onboard.s2.body")}
            </p>
            {/* Mini card animation */}
            <div className="mx-auto mt-8 w-48 rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
              <div className="h-16 rounded-lg bg-bg-elevated" />
              <div className="mt-3 flex items-center justify-between">
                <div className="h-2 w-20 rounded bg-bg-elevated" />
                <Heart
                  className="h-5 w-5 text-danger"
                  style={{
                    animation: "pulse-badge 1s ease infinite",
                  }}
                  fill="currentColor"
                />
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={() => setScreen(2)}
                className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover"
              >
                {t("properties.onboard.s2.cta")} {"\u2192"}
              </button>
              <button
                onClick={dismiss}
                className="text-sm text-brand transition-colors hover:text-brand-hover"
              >
                {t("properties.onboard.s2.skip")}
              </button>
            </div>
          </div>
        )}

        {screen === 2 && (
          <div className="animate-fade-in">
            <h2 className="font-serif text-3xl text-text-primary">
              {t("properties.onboard.s3.title")}
            </h2>
            <p className="mt-3 text-text-secondary">
              {t("properties.onboard.s3.body")}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href="/strategy"
                onClick={dismiss}
                className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover"
              >
                {t("properties.onboard.s3.cta")} {"\u2192"}
              </Link>
              <button
                onClick={dismiss}
                className="text-sm text-brand transition-colors hover:text-brand-hover"
              >
                {t("properties.onboard.s3.skip")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── AddPropertyModal ────────────────────────────── */
const CITIES = [
  "Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne",
  "Stuttgart", "Düsseldorf", "Leipzig", "Dresden", "Other",
] as const

const HEATING_TYPES = [
  "Fernwärme", "Gas", "Öl", "Wärmepumpe", "Elektro", "Pellets", "Unknown",
] as const

const STUTTGART_EXAMPLE = {
  title: "3-Zimmer Wohnung · Stuttgart-Möhringen",
  city: "Stuttgart",
  zip: "70567",
  price: "385000",
  size: "78",
  rooms: "3",
  yearBuilt: "1968",
  rent: "1150",
  heatingType: "Fernwärme",
  floor: "3. OG",
  listingUrl: "",
  notes: "Altbau, renovated kitchen, balcony south-facing.\nS-Bahn Möhringen 400m. Listed 38 days, one price reduction of €15,000.",
}

// Synthetic demo property — shown in the empty state so new users can explore
// the detail page without adding a real listing first.
const DEMO_PROPERTY: Property = {
  id: "_demo",
  title: "3-Zimmer Wohnung · Stuttgart-Möhringen",
  address: "Möhringer Straße",
  city: "Stuttgart",
  zip: "70567",
  price: 385000,
  price_per_sqm: 4936,
  sqm: 78,
  rooms: 3,
  year_built: 1968,
  days_listed: 38,
  gross_yield: 4.2,
  compact_analysis: {
    verdict: "worth_analysing",
    one_line_summary:
      "Solid Altbau in a good location — yields are tight but a recent price cut leaves room to negotiate.",
  },
  is_watched: false,
}

function FieldLabel({
  text,
  required,
}: {
  text: string
  required?: boolean
}) {
  return (
    <label className="mb-1 block text-xs font-medium text-text-secondary">
      {text}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  )
}

function AddPropertyModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [activeTab, setActiveTab] = useState<"link" | "manual">("link")

  // ── Tab 1: Paste Link ──────────────────────────────────────────────────────
  const [linkUrl, setLinkUrl] = useState("")
  const [linkCity, setLinkCity] = useState("")
  const [linkError, setLinkError] = useState("")
  const [linkSubmitting, setLinkSubmitting] = useState(false)
  const [linkSuccess, setLinkSuccess] = useState(false)

  const handleLinkSubmit = async () => {
    setLinkError("")
    const isValidUrl =
      linkUrl.includes("immobilienscout24.de") ||
      linkUrl.includes("immoscout24.de") ||
      linkUrl.includes("immonet.de")
    if (!linkUrl || !isValidUrl) {
      setLinkError("Please paste a valid ImmoScout24 or Immonet link")
      return
    }
    if (!linkCity) {
      setLinkError("Please select a city")
      return
    }
    setLinkSubmitting(true)
    // TriggerScrapeRequest only accepts city, max_price, min_rooms (openapi.json)
    const linkResult = await immoApi.triggerScrape({
      city: linkCity,
      max_price: 1000000,
      min_rooms: 1,
    })
    setLinkSubmitting(false)
    if (linkResult.error) {
      setLinkError(linkResult.error)
      return
    }
    setLinkSuccess(true)
    setTimeout(() => {
      resetAll()
      onOpenChange(false)
      onSuccess?.()
    }, 3000)
  }

  // ── Tab 2: Add Manually ────────────────────────────────────────────────────
  const [title, setTitle] = useState("")
  const [city, setCity] = useState("Stuttgart")
  const [zip, setZip] = useState("")
  const [price, setPrice] = useState("")
  const [size, setSize] = useState("")
  const [rooms, setRooms] = useState("")
  const [yearBuilt, setYearBuilt] = useState("")
  const [rent, setRent] = useState("")
  const [heatingType, setHeatingType] = useState("")
  const [floor, setFloor] = useState("")
  const [listingUrl, setListingUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualSuccess, setManualSuccess] = useState(false)
  const [manualError, setManualError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const [showExampleHint, setShowExampleHint] = useState(false)

  const clearExampleHint = () => setShowExampleHint(false)

  const loadStuttgartExample = () => {
    setTitle(STUTTGART_EXAMPLE.title)
    setCity(STUTTGART_EXAMPLE.city)
    setZip(STUTTGART_EXAMPLE.zip)
    setPrice(STUTTGART_EXAMPLE.price)
    setSize(STUTTGART_EXAMPLE.size)
    setRooms(STUTTGART_EXAMPLE.rooms)
    setYearBuilt(STUTTGART_EXAMPLE.yearBuilt)
    setRent(STUTTGART_EXAMPLE.rent)
    setHeatingType(STUTTGART_EXAMPLE.heatingType)
    setFloor(STUTTGART_EXAMPLE.floor)
    setListingUrl(STUTTGART_EXAMPLE.listingUrl)
    setNotes(STUTTGART_EXAMPLE.notes)
    setShowExampleHint(true)
    setFieldErrors({})
  }

  const handleManualSubmit = async () => {
    const errors: Record<string, boolean> = {}
    if (!title) errors.title = true
    if (!city) errors.city = true
    if (!price) errors.price = true
    if (!size) errors.size = true
    if (!rooms) errors.rooms = true
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setManualError("")
    setManualSubmitting(true)
    // NOTE: POST /api/properties is not yet in openapi.json (GET only).
    // Backend needs to add this route for manual entries to persist.
    const manualResult = await immoApi.createManualProperty({
      source: "manual",
      title,
      city,
      zip_code: zip || undefined,
      price: Number(price),
      size_sqm: Number(size),
      rooms: Number(rooms),
      year_built: yearBuilt ? Number(yearBuilt) : undefined,
      estimated_rent: rent ? Number(rent) : undefined,
      heating_type: heatingType || undefined,
      floor: floor || undefined,
      listing_url: listingUrl || undefined,
      notes: notes || undefined,
    })
    setManualSubmitting(false)
    if (manualResult.error) {
      setManualError(manualResult.error)
      return
    }
    setManualSuccess(true)
    setTimeout(() => {
      resetAll()
      onOpenChange(false)
      onSuccess?.()
    }, 3000)
  }

  const resetAll = () => {
    setActiveTab("link")
    setLinkUrl("")
    setLinkCity("")
    setLinkError("")
    setLinkSuccess(false)
    setTitle("")
    setCity("Stuttgart")
    setZip("")
    setPrice("")
    setSize("")
    setRooms("")
    setYearBuilt("")
    setRent("")
    setHeatingType("")
    setFloor("")
    setListingUrl("")
    setNotes("")
    setManualSuccess(false)
    setManualError("")
    setFieldErrors({})
    setShowExampleHint(false)
  }

  const inputCls = (hasError?: boolean) =>
    `w-full rounded-lg border ${hasError ? "border-danger" : "border-border-default"} bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15`

  const selectCls = (hasError?: boolean) =>
    `w-full rounded-lg border ${hasError ? "border-danger" : "border-border-default"} bg-bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15`

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAll(); onOpenChange(v) }}>
      <DialogContent className="border-border-default bg-bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-text-primary">
            Add Property
          </DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="border-b border-border-default">
          <div className="flex gap-6">
            {(["link", "manual"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-brand text-brand"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab === "link" ? "Paste Link" : "Add Manually"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab 1: Paste Link ─────────────────────────────────────── */}
        {activeTab === "link" && (
          <div className="flex flex-col gap-4 pt-2">
            {linkSuccess ? (
              <p className="py-6 text-center text-sm text-success">
                Adding property... analysis starts in ~30 seconds.
              </p>
            ) : (
              <>
                <div>
                  <FieldLabel text="ImmoScout24 Link" required />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => { setLinkUrl(e.target.value); setLinkError("") }}
                    placeholder="https://www.immoscout24.de/expose/..."
                    className={inputCls(!!linkError && !linkUrl)}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Paste the full URL from the listing page
                  </p>
                </div>
                <div>
                  <FieldLabel text="City" required />
                  <select
                    value={linkCity}
                    onChange={(e) => { setLinkCity(e.target.value); setLinkError("") }}
                    className={selectCls(!!linkError && !linkCity)}
                  >
                    <option value="">Select city...</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {linkError && (
                  <p className="text-xs text-danger">{linkError}</p>
                )}
                <button
                  onClick={handleLinkSubmit}
                  disabled={linkSubmitting}
                  className="h-12 w-full rounded-lg bg-brand text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  {linkSubmitting ? "Adding..." : "Add Property"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Tab 2: Add Manually ───────────────────────────────────── */}
        {activeTab === "manual" && (
          <div className="flex flex-col gap-4 pt-2">
            {manualSuccess ? (
              <p className="py-6 text-center text-sm text-success">
                Property added. Immonator is analysing...
              </p>
            ) : (
              <>
                {/* Stuttgart example button */}
                <div className="flex justify-end">
                  <button
                    onClick={loadStuttgartExample}
                    className="cursor-pointer text-xs text-brand"
                  >
                    Load Stuttgart example →
                  </button>
                </div>

                {/* Example hint banner */}
                {showExampleHint && (
                  <div className="rounded-lg bg-brand-subtle p-2 text-xs text-brand">
                    This is example data — edit any field or just click Add
                  </div>
                )}

                {/* 2-col grid on desktop, 1-col on mobile */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Property Title — full width */}
                  <div className="sm:col-span-2">
                    <FieldLabel text="Property Title" required />
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        clearExampleHint()
                        setFieldErrors((p) => ({ ...p, title: false }))
                      }}
                      placeholder="3-Zimmer Wohnung, Möhringen"
                      className={inputCls(fieldErrors.title)}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <FieldLabel text="City" required />
                    <select
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value)
                        clearExampleHint()
                        setFieldErrors((p) => ({ ...p, city: false }))
                      }}
                      className={selectCls(fieldErrors.city)}
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* ZIP Code */}
                  <div>
                    <FieldLabel text="ZIP Code" />
                    <input
                      value={zip}
                      onChange={(e) => {
                        setZip(e.target.value.slice(0, 5))
                        clearExampleHint()
                      }}
                      placeholder="70567"
                      maxLength={5}
                      className={inputCls()}
                    />
                  </div>

                  {/* Asking Price */}
                  <div>
                    <FieldLabel text="Asking Price (€)" required />
                    <input
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value)
                        clearExampleHint()
                        setFieldErrors((p) => ({ ...p, price: false }))
                      }}
                      placeholder="385000"
                      className={`${inputCls(fieldErrors.price)} font-mono`}
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      Enter without dots or commas
                    </p>
                  </div>

                  {/* Size */}
                  <div>
                    <FieldLabel text="Size (m²)" required />
                    <input
                      type="number"
                      value={size}
                      onChange={(e) => {
                        setSize(e.target.value)
                        clearExampleHint()
                        setFieldErrors((p) => ({ ...p, size: false }))
                      }}
                      placeholder="78"
                      className={`${inputCls(fieldErrors.size)} font-mono`}
                    />
                  </div>

                  {/* Rooms */}
                  <div>
                    <FieldLabel text="Number of Rooms" required />
                    <input
                      type="number"
                      step="0.5"
                      value={rooms}
                      onChange={(e) => {
                        setRooms(e.target.value)
                        clearExampleHint()
                        setFieldErrors((p) => ({ ...p, rooms: false }))
                      }}
                      placeholder="3"
                      className={`${inputCls(fieldErrors.rooms)} font-mono`}
                    />
                  </div>

                  {/* Year Built */}
                  <div>
                    <FieldLabel text="Year Built" />
                    <input
                      type="number"
                      value={yearBuilt}
                      onChange={(e) => { setYearBuilt(e.target.value); clearExampleHint() }}
                      placeholder="1968"
                      min={1850}
                      className={`${inputCls()} font-mono`}
                    />
                  </div>

                  {/* Monthly Rent */}
                  <div>
                    <FieldLabel text="Monthly Rent (€)" />
                    <input
                      value={rent}
                      onChange={(e) => { setRent(e.target.value); clearExampleHint() }}
                      placeholder="1150"
                      className={`${inputCls()} font-mono`}
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      Current or estimated achievable rent
                    </p>
                  </div>

                  {/* Heating Type */}
                  <div>
                    <FieldLabel text="Heating Type" />
                    <select
                      value={heatingType}
                      onChange={(e) => { setHeatingType(e.target.value); clearExampleHint() }}
                      className={selectCls()}
                    >
                      <option value="">Select...</option>
                      {HEATING_TYPES.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Floor */}
                  <div>
                    <FieldLabel text="Floor" />
                    <input
                      value={floor}
                      onChange={(e) => { setFloor(e.target.value); clearExampleHint() }}
                      placeholder="3. OG"
                      className={inputCls()}
                    />
                  </div>

                  {/* Listing URL — full width */}
                  <div className="sm:col-span-2">
                    <FieldLabel text="Listing URL" />
                    <input
                      type="url"
                      value={listingUrl}
                      onChange={(e) => { setListingUrl(e.target.value); clearExampleHint() }}
                      placeholder="https://..."
                      className={inputCls()}
                    />
                  </div>

                  {/* Notes — full width */}
                  <div className="sm:col-span-2">
                    <FieldLabel text="Notes" />
                    <textarea
                      value={notes}
                      onChange={(e) => { setNotes(e.target.value); clearExampleHint() }}
                      rows={3}
                      className={`${inputCls()} resize-none`}
                    />
                  </div>
                </div>

                {Object.values(fieldErrors).some(Boolean) && (
                  <p className="text-xs text-danger">Please fill required fields</p>
                )}

                {manualError && (
                  <p className="text-xs text-danger">{manualError}</p>
                )}

                <button
                  onClick={handleManualSubmit}
                  disabled={manualSubmitting}
                  className="h-12 w-full rounded-lg bg-brand text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  {manualSubmitting ? "Adding..." : "Add Property"}
                </button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ── FilterDropdown ──────────────────────────────── */
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string | null
  onChange: (val: string | null) => void
}) {
  if (value) {
    return (
      <button
        onClick={() => onChange(null)}
        className="flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-subtle px-3 py-1.5 text-sm text-brand transition-colors"
      >
        {value}
        <X className="h-3 w-3" />
      </button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-border-strong">
          {label}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="border-border-default bg-bg-surface"
      >
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onChange(opt)}
            className="text-text-secondary hover:text-text-primary"
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ── PropertyCard ────────────────────────────────── */
function PropertyCard({
  property,
  onWatch,
  t,
}: {
  property: Property
  onWatch: (id: string) => void
  t: (key: string) => string
}) {
  const daysClass =
    property.days_listed > 60
      ? "text-danger"
      : property.days_listed > 30
        ? "text-warning"
        : "text-primary-foreground"

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-150 hover:border-border-strong hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-video w-full bg-bg-elevated">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.title}
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-text-muted">
            🏢
          </div>
        )}

        {/* Top-left verdict */}
        {property.compact_analysis && (
          <div className="absolute top-2 left-2">
            <VerdictBadge verdict={property.compact_analysis.verdict} />
          </div>
        )}

        {/* Top-right days pill */}
        <div
          className={`absolute top-2 right-2 rounded-md bg-black/50 px-2 py-1 text-xs backdrop-blur-sm ${daysClass}`}
        >
          {property.days_listed} {t("properties.card.days")}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-2xl text-text-primary">
            {EUR}
            {(property.price ?? 0).toLocaleString("de-DE")}
          </span>
          <span className="font-mono text-xs text-text-muted">
            {EUR}
            {(property.price_per_sqm ?? 0).toLocaleString("de-DE")}/m{"\u00B2"}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm font-medium text-text-primary">
          {property.title}
        </p>

        <p className="mt-1 text-xs text-text-secondary">
          {"📍"} {property.city} {"\u00B7"} {property.zip}
        </p>

        {/* Spec pills */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">
            {property.sqm}m{"\u00B2"}
          </span>
          <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">
            {property.rooms} {t("properties.card.rooms")}
          </span>
          <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">
            {property.year_built}
          </span>
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-border-default" />

        {/* Yield row */}
        <div className="grid grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
              {t("properties.card.grossYield")}
            </p>
            <p
              className={`font-mono text-xl ${
                property.gross_yield >= 5
                  ? "text-success"
                  : "text-text-primary"
              }`}
            >
              {(property.gross_yield ?? 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
              {t("properties.card.eurSqm")}
            </p>
            <p className="font-mono text-xl text-text-primary">
              {(property.price_per_sqm ?? 0).toLocaleString("de-DE")}
            </p>
          </div>
        </div>

        {/* AI summary */}
        <p className="mt-2 line-clamp-2 text-xs italic text-text-secondary">
          {property.compact_analysis
            ? (property.compact_analysis.one_line_summary ?? "—")
            : (
                <span className="not-italic text-text-muted">
                  {t("properties.card.saveAnalysis")}
                </span>
              )}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border-default bg-bg-base/50 px-4 py-2.5">
        <Link
          href={`/properties/${property.id}`}
          className="text-xs text-brand transition-colors hover:text-brand-hover"
        >
          {t("properties.card.viewDetails")}
        </Link>
        <button
          onClick={() => onWatch(property.id)}
          className={`transition-all duration-150 hover:scale-110 ${
            property.is_watched
              ? "text-danger"
              : "text-text-muted hover:text-danger"
          }`}
        >
          <Heart
            className="h-4 w-4"
            fill={property.is_watched ? "currentColor" : "none"}
          />
        </button>
      </div>
    </div>
  )
}

/* ── Skeleton Card ───────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
      <div className="aspect-video w-full animate-pulse bg-bg-elevated" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-6 w-3/4 animate-pulse rounded bg-bg-elevated" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-bg-elevated" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-bg-elevated" />
        <div className="border-t border-border-default pt-3">
          <div className="h-6 w-1/4 animate-pulse rounded bg-bg-elevated" />
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────── */
export default function PropertiesPage() {
  const { t } = useLocale()

  // State
  const [properties, setProperties] = useState<Property[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    variant: "default" | "success" | "warning"
  } | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Filters
  const [cityFilter, setCityFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [priceFilter, setPriceFilter] = useState<string | null>(null)
  const [yieldFilter, setYieldFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const hasFilters = cityFilter || typeFilter || priceFilter || yieldFilter

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    const [propsRes, statsRes] = await Promise.all([
      immoApi.fetchProperties(),
      immoApi.fetchPropertyStats(),
    ])
    if (propsRes.data?.properties) setProperties(propsRes.data.properties as Property[])
    if (statsRes.data) setStats(statsRes.data as unknown as Stats)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()

    // Check onboarding
    if (typeof window !== "undefined") {
      if (isNewUser()) {
        setShowOnboarding(true)
      }
    }
  }, [fetchData])

  // Unique cities for filter
  const cities = [...new Set(properties.map((p) => p.city))].sort()

  // Filter + sort
  const filtered = properties
    .filter((p) => {
      if (cityFilter && p.city !== cityFilter) return false
      if (priceFilter) {
        const maxP = parseInt(priceFilter.replace(/\D/g, ""), 10)
        if (maxP && p.price > maxP) return false
      }
      if (yieldFilter) {
        const minY = parseFloat(yieldFilter.replace("%", ""))
        if (minY && p.gross_yield < minY) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === "yield") return b.gross_yield - a.gross_yield
      return 0
    })

  const clearFilters = useCallback(() => {
    setCityFilter(null)
    setTypeFilter(null)
    setPriceFilter(null)
    setYieldFilter(null)
  }, [])

  // Watch handler
  const handleWatch = async (id: string) => {
    const { error } = await saveToPortfolio(id)
    if (error) {
      setToast({ message: copy.toasts.error, variant: "warning" })
      return
    }

    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_watched: true } : p))
    )

    const isFirstSave =
      typeof window !== "undefined" && !localStorage.getItem("immo_first_save")
    if (isFirstSave) {
      localStorage.setItem("immo_first_save", "true")
      setToast({ message: copy.toasts.firstSave, variant: "success" })
    } else {
      setToast({ message: copy.toasts.saved, variant: "success" })
    }

    const verdictLabels: Record<string, string> = {
      strong_buy: "Strong Buy",
      worth_analysing: "Worth Analysing",
      proceed_with_caution: "Proceed with Caution",
      avoid: "Avoid",
    }

    let attempts = 0
    const poll = async () => {
      if (attempts >= 10) return
      attempts++
      const { data } = await getCompactAnalysis(id)
      if (data?.status === "generated" && data.analysis?.verdict) {
        const label = verdictLabels[data.analysis.verdict] ?? data.analysis.verdict
        setToast({ message: copy.toasts.analysisReady(label), variant: "success" })
        setProperties((prev) =>
          prev.map((p) =>
            p.id === id && data.analysis
              ? {
                  ...p,
                  compact_analysis: {
                    verdict: data.analysis.verdict,
                    one_line_summary: data.analysis.one_line_summary,
                  },
                }
              : p
          )
        )
        return
      }
      setTimeout(poll, 3000)
    }

    setTimeout(poll, 3000)
  }

  return (
    <>
      {showOnboarding && (
        <OnboardingOverlay onClose={() => setShowOnboarding(false)} />
      )}

      <div className="flex flex-col gap-0 animate-fade-in">
        {/* Page Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl text-text-primary">
              {t("properties.title")}
            </h1>
            {loading ? (
              <div className="mt-1 h-4 w-40 animate-pulse rounded bg-bg-elevated" />
            ) : (
              <p className="mt-1 text-sm text-text-secondary">
                {t("properties.statsLine")
                  .replace("{0}", String(stats?.total ?? 0))
                  .replace("{1}", String(stats?.cities ?? 0))}
              </p>
            )}
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-sm text-text-primary transition-colors hover:bg-bg-hover"
          >
            {t("properties.addProperty")}
          </button>
        </div>

        {/* Context Hint */}
        <ContextHint
          hintId="properties-save-tip"
          headline={t("properties.hint.headline")}
          body={t("properties.hint.body")}
        />

        {/* Filter Bar */}
        <div className="sticky top-[58px] z-10 -mx-4 mb-6 border-b border-border-default bg-bg-surface px-4 py-3 shadow-[0_1px_0_#E2E8F0] md:-mx-8 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <FilterDropdown
                label={t("properties.filter.city")}
                options={cities.length > 0 ? cities : ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"]}
                value={cityFilter}
                onChange={setCityFilter}
              />
              <FilterDropdown
                label={t("properties.filter.type")}
                options={["Apartment", "House", "Multi-family"]}
                value={typeFilter}
                onChange={setTypeFilter}
              />
              <FilterDropdown
                label={t("properties.filter.price")}
                options={[`${EUR}200k`, `${EUR}300k`, `${EUR}500k`, `${EUR}750k`, `${EUR}1M+`]}
                value={priceFilter}
                onChange={setPriceFilter}
              />
              <FilterDropdown
                label={t("properties.filter.minYield")}
                options={["3%", "4%", "5%", "6%", "7%+"]}
                value={yieldFilter}
                onChange={setYieldFilter}
              />
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="cursor-pointer text-sm text-brand transition-colors hover:text-brand-hover"
                >
                  {t("properties.filter.clearAll")}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <FilterDropdown
                label={t("properties.filter.sortYield")}
                options={["yield"]}
                value={sortBy}
                onChange={setSortBy}
              />
              <div className="flex items-center gap-1 rounded-lg border border-border-default p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === "grid"
                      ? "text-brand"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === "list"
                      ? "text-brand"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 && !hasFilters && properties.length === 0 ? (
          <div className="flex flex-col items-center gap-8">
            {/* Teaser prompt */}
            <div className="text-center">
              <p className="font-serif text-xl text-text-primary">
                See how it works
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Here&apos;s a sample Stuttgart apartment — click View Details to explore a full analysis.
              </p>
            </div>

            {/* Demo card — same PropertyCard but capped to ~360 px wide */}
            <div className="relative w-full max-w-sm">
              {/* Demo label */}
              <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-brand/30 bg-brand-subtle px-3 py-0.5 text-[11px] font-medium text-brand">
                Sample · not saved
              </div>
              <PropertyCard
                property={DEMO_PROPERTY}
                onWatch={() =>
                  setToast({ message: "Add the property to save it to your watchlist.", variant: "default" })
                }
                t={t}
              />
            </div>

            {/* CTA row */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover"
              >
                {t("properties.empty.addUrl")}
              </button>
              <p className="text-xs text-text-muted">
                Paste an ImmoScout24 link or add manually
              </p>
            </div>
          </div>
        ) : filtered.length === 0 && hasFilters ? (
          <EmptyState
            icon={"⚙️"}
            headline={t("properties.empty.noResults")}
            body={t("properties.empty.noResultsBody")}
            actionLabel={t("properties.empty.clearFilters")}
            onAction={clearFilters}
          />
        ) : (
          <div
            className={`stagger-children ${
              viewMode === "grid"
                ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-4"
            }`}
          >
            {filtered.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onWatch={handleWatch}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      <AddPropertyModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={fetchData} />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  )
}
