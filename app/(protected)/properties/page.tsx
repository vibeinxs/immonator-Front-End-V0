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
import { api } from "@/lib/api"
import { getDisplayName } from "@/lib/auth"
import { useLocale } from "@/lib/i18n/locale-context"

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
  const name = getDisplayName() || "Investor"

  const dismiss = () => {
    localStorage.setItem("immo_new_user", "false")
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
                  {"\\u2713"} {line}
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
function AddPropertyModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLocale()
  const [url, setUrl] = useState("")
  const [city, setCity] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [minRooms, setMinRooms] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!url) return
    setSubmitting(true)
    await api.post("/api/properties/trigger-scrape", {
      url,
      city: city || undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      min_rooms: minRooms ? Number(minRooms) : undefined,
    })
    setSubmitting(false)
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setUrl("")
      setCity("")
      setMaxPrice("")
      setMinRooms("")
      onOpenChange(false)
    }, 3000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border-default bg-bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-text-primary">
            {t("properties.addModal.title")}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <p className="py-6 text-center text-sm text-success">
            {t("properties.addModal.success")}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("properties.addModal.urlPh")}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-text-secondary">
                  {t("properties.addModal.city")}
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("properties.addModal.cityPh")}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-secondary">
                  {t("properties.addModal.maxPrice")}
                </label>
                <input
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder={t("properties.addModal.maxPricePh")}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-secondary">
                  {t("properties.addModal.minRooms")}
                </label>
                <input
                  value={minRooms}
                  onChange={(e) => setMinRooms(e.target.value)}
                  placeholder={t("properties.addModal.minRoomsPh")}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!url || submitting}
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {submitting ? "..." : t("properties.addModal.submit")}
            </button>
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
            {"\\uD83C\\uDFE2"}
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
            {"\u20AC"}
            {property.price.toLocaleString("de-DE")}
          </span>
          <span className="font-mono text-xs text-text-muted">
            {"\u20AC"}
            {property.price_per_sqm.toLocaleString("de-DE")}/m{"\u00B2"}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm font-medium text-text-primary">
          {property.title}
        </p>

        <p className="mt-1 text-xs text-text-secondary">
          {"\\uD83D\\uDCCD"} {property.city} {"\u00B7"} {property.zip}
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
              {property.gross_yield.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
              {t("properties.card.eurSqm")}
            </p>
            <p className="font-mono text-xl text-text-primary">
              {property.price_per_sqm.toLocaleString("de-DE")}
            </p>
          </div>
        </div>

        {/* AI summary */}
        <p className="mt-2 line-clamp-2 text-xs italic text-text-secondary">
          {property.compact_analysis
            ? property.compact_analysis.one_line_summary
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
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [propsRes, statsRes] = await Promise.all([
        api.get<Property[]>("/api/properties"),
        api.get<Stats>("/api/properties/stats"),
      ])
      if (propsRes.data) setProperties(propsRes.data)
      if (statsRes.data) setStats(statsRes.data)
      setLoading(false)
    }
    fetchData()

    // Check onboarding
    if (typeof window !== "undefined") {
      if (localStorage.getItem("immo_new_user") === "true") {
        setShowOnboarding(true)
      }
    }
  }, [])

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
    await api.post(`/api/portfolio/watch/${id}`)
    setProperties((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, is_watched: !p.is_watched } : p
      )
    )
    setToast({
      message: t("properties.toast.saved"),
      variant: "success",
    })
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
                options={["\u20AC200k", "\u20AC300k", "\u20AC500k", "\u20AC750k", "\u20AC1M+"]}
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
          <EmptyState
            icon={"\\uD83D\\uDD0D"}
            headline={t("properties.empty.noProperties")}
            body={t("properties.empty.noPropertiesBody")}
            actionLabel={t("properties.empty.addUrl")}
            onAction={() => setModalOpen(true)}
          />
        ) : filtered.length === 0 && hasFilters ? (
          <EmptyState
            icon={"\\u2699"}
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

      <AddPropertyModal open={modalOpen} onOpenChange={setModalOpen} />

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
