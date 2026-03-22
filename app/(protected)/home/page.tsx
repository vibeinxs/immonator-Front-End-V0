"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Brain, Building2, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { listEntries, type ManualPortfolioEntry } from "@/lib/manualPortfolio"
import { useLocale } from "@/lib/i18n/locale-context"
import { HOME_COPY } from "./copy"

function formatSavedAt(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    dateStyle: "medium",
  }).format(date)
}

function ScoreRing({ score = 7.8, max = 10 }: { score?: number; max?: number }) {
  const [animated, setAnimated] = useState(false)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / max)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 350)
    return () => clearTimeout(t)
  }, [])

  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      {/* Outer glow ring */}
      <circle cx="68" cy="68" r={radius + 6} fill="none" stroke="rgba(59,123,245,0.06)" strokeWidth="1" />
      {/* Track */}
      <circle cx="68" cy="68" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      {/* Progress arc */}
      <circle
        cx="68"
        cy="68"
        r={radius}
        fill="none"
        stroke="#3B7BF5"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={animated ? offset : circumference}
        style={{
          transformOrigin: "68px 68px",
          transform: "rotate(-90deg)",
          transition: "stroke-dashoffset 1.8s cubic-bezier(0.34, 1.1, 0.64, 1)",
          filter: "drop-shadow(0 0 6px rgba(59,123,245,0.5))",
        }}
      />
      {/* Score value */}
      <text
        x="68"
        y="60"
        textAnchor="middle"
        fill="white"
        fontSize="29"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
      >
        {score}
      </text>
      <text
        x="68"
        y="78"
        textAnchor="middle"
        fill="rgba(255,255,255,0.38)"
        fontSize="9"
        fontFamily="DM Sans, sans-serif"
        letterSpacing="1.2"
      >
        IMO SCORE
      </text>
      <text
        x="68"
        y="92"
        textAnchor="middle"
        fill="rgba(255,255,255,0.22)"
        fontSize="9"
        fontFamily="DM Sans, sans-serif"
      >
        / {max}
      </text>
    </svg>
  )
}

const PIPELINE_STAGES = [
  {
    step: "01",
    Icon: Building2,
    title: "Property Input",
    body: "Enter a listing URL or manually input price, size, location, and financing terms in seconds.",
    accent: "#3B7BF5",
  },
  {
    step: "02",
    Icon: BarChart3,
    title: "15+ Metric Engine",
    body: "Gross yield, net yield, ROI, tax efficiency, financing burden, and price/m² — computed instantly.",
    accent: "#5A9FFF",
  },
  {
    step: "03",
    Icon: Brain,
    title: "Decision Signal",
    body: "A single IMO Score with AI-generated insight delivers a clear buy, hold, or pass verdict.",
    accent: "#89C4FF",
  },
]

const PREVIEW_KPIS = [
  { label: "GROSS YIELD", value: "4.8%", positive: true },
  { label: "PRICE / SQM", value: "€9,200", positive: null },
  { label: "NET YIELD", value: "3.6%", positive: true },
  { label: "LOAN TERM", value: "28 yr", positive: null },
]

export default function HomePage() {
  const { locale } = useLocale()
  const copy = HOME_COPY[locale]
  const [recentEntries, setRecentEntries] = useState<ManualPortfolioEntry[]>([])
  const [activeFocusId, setActiveFocusId] = useState(copy.focus.items[0]?.id ?? "analysis")

  useEffect(() => {
    const syncEntries = () => setRecentEntries(listEntries().slice(0, 3))
    syncEntries()
    window.addEventListener("storage", syncEntries)
    return () => window.removeEventListener("storage", syncEntries)
  }, [])

  useEffect(() => {
    if (!copy.focus.items.some((item) => item.id === activeFocusId)) {
      setActiveFocusId(copy.focus.items[0]?.id ?? "analysis")
    }
  }, [activeFocusId, copy.focus.items])

  const activeFocus = useMemo(
    () => copy.focus.items.find((item) => item.id === activeFocusId) ?? copy.focus.items[0],
    [activeFocusId, copy.focus.items],
  )
  const browsePropertiesItem = useMemo(
    () => copy.focus.items.find((item) => item.id === "properties") ?? copy.focus.items[0],
    [copy.focus.items],
  )

  const heroStats = [
    { id: "workflows", value: "3", label: copy.statLabels.workflows },
    { id: "capabilities", value: "5", label: copy.statLabels.capabilities },
    { id: "modes", value: "2", label: copy.statLabels.modes },
    { id: "recent", value: String(recentEntries.length), label: copy.statLabels.recent },
  ]

  return (
    <div className="space-y-6">
      {/* ── DARK HERO ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(140deg, #080F1E 0%, #0C1829 55%, #081322 100%)",
          borderRadius: "1.25rem",
          overflow: "hidden",
          position: "relative",
        }}
        className="p-8 md:p-12"
      >
        {/* Dot-grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(59,123,245,0.04) 1px, transparent 1px), linear-gradient(90deg,rgba(59,123,245,0.04) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            pointerEvents: "none",
          }}
        />
        {/* Radial glows */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-80px",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,123,245,0.11) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "25%",
            width: "380px",
            height: "380px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(80,140,255,0.05) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <div className="relative grid gap-10 xl:grid-cols-[1.1fr_0.9fr] items-center">
          {/* ── Left: copy + stats ── */}
          <div>
            {/* Eyebrow pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "999px",
                border: "1px solid rgba(59,123,245,0.3)",
                background: "rgba(59,123,245,0.09)",
                padding: "5px 14px",
                marginBottom: "28px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#3B7BF5",
                  display: "block",
                  boxShadow: "0 0 7px #3B7BF5",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "#3B7BF5",
                }}
              >
                {copy.eyebrow}
              </span>
            </div>

            <h1
              className="font-serif"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3.75rem)",
                lineHeight: 1.04,
                color: "white",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                maxWidth: "560px",
                marginBottom: "20px",
              }}
            >
              {copy.title}
            </h1>

            <p
              style={{
                color: "rgba(255,255,255,0.50)",
                fontSize: "1.0625rem",
                lineHeight: 1.72,
                maxWidth: "440px",
                marginBottom: "32px",
              }}
            >
              {copy.subtitle}
            </p>

            {/* CTA row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "40px" }}>
              <Link
                href={activeFocus.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#3B7BF5",
                  color: "white",
                  borderRadius: "12px",
                  padding: "11px 24px",
                  fontWeight: 500,
                  fontSize: "0.9375rem",
                  textDecoration: "none",
                }}
              >
                {activeFocus.cta}
                <ArrowRight style={{ width: "16px", height: "16px" }} />
              </Link>
              <Link
                href="/properties"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.72)",
                  borderRadius: "12px",
                  padding: "11px 24px",
                  fontWeight: 500,
                  fontSize: "0.9375rem",
                  textDecoration: "none",
                }}
              >
                {browsePropertiesItem.cta}
              </Link>
            </div>

            {/* Stats strip */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "20px",
                paddingTop: "28px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {heroStats.map((stat) => (
                <div key={stat.id}>
                  <p
                    className="font-mono"
                    style={{ fontSize: "1.875rem", fontWeight: 600, color: "white", lineHeight: 1 }}
                  >
                    {stat.value}
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.30)",
                      marginTop: "7px",
                    }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: analysis card mockup ── */}
          <div
            style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "20px",
              padding: "28px",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Card header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
              <div>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.32)",
                  }}
                >
                  ANALYSIS PREVIEW
                </p>
                <p style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.875rem", fontWeight: 500, marginTop: "5px" }}>
                  Maximilianstr. 42, München
                </p>
              </div>
              <span
                style={{
                  background: "rgba(52,199,89,0.13)",
                  border: "1px solid rgba(52,199,89,0.28)",
                  color: "#34C759",
                  borderRadius: "8px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  padding: "4px 10px",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                STRONG BUY
              </span>
            </div>

            {/* Score ring + KPI grid */}
            <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
              <div style={{ flexShrink: 0 }}>
                <ScoreRing score={7.8} />
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {PREVIEW_KPIS.map((kpi) => (
                  <div
                    key={kpi.label}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.10em",
                        color: "rgba(255,255,255,0.30)",
                        textTransform: "uppercase",
                        marginBottom: "5px",
                      }}
                    >
                      {kpi.label}
                    </p>
                    <p
                      className="font-mono"
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: kpi.positive ? "#34C759" : "rgba(255,255,255,0.82)",
                      }}
                    >
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI insight strip */}
            <div
              style={{
                marginTop: "18px",
                background: "rgba(59,123,245,0.08)",
                border: "1px solid rgba(59,123,245,0.18)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <Brain style={{ width: "15px", height: "15px", color: "#3B7BF5", flexShrink: 0, marginTop: "2px" }} />
              <p style={{ fontSize: "12px", lineHeight: 1.58, color: "rgba(255,255,255,0.55)" }}>
                Above-median gross yield of 4.8% and strong microlocation support long-term value retention.
                Key risk: rising interest-rate sensitivity on 28-year horizon.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS / PIPELINE ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
        <div style={{ marginBottom: "28px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-2">
            How Immonator Works
          </p>
          <h2 className="font-serif text-2xl text-text-primary md:text-3xl">{copy.focus.heading}</h2>
          <p className="mt-2 text-sm text-text-secondary max-w-xl">{copy.focus.subheading}</p>
        </div>

        {/* 3-step pipeline */}
        <div className="grid gap-4 md:grid-cols-3">
          {PIPELINE_STAGES.map((stage, i) => {
            const StageIcon = stage.Icon
            return (
              <div key={stage.step} className="relative rounded-2xl border border-border-default bg-bg-base p-5">
                {/* Step badge */}
                <span
                  className="font-mono"
                  style={{
                    position: "absolute",
                    top: "14px",
                    right: "16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--color-text-muted, #8296A8)",
                    opacity: 0.4,
                  }}
                >
                  {stage.step}
                </span>

                {/* Arrow connector (md+) */}
                {i < 2 && (
                  <div
                    className="hidden md:flex items-center justify-center"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "-14px",
                      transform: "translateY(-50%)",
                      zIndex: 10,
                      background: "var(--color-bg-surface, white)",
                      borderRadius: "50%",
                      padding: "3px",
                    }}
                  >
                    <ArrowRight style={{ width: "13px", height: "13px", color: "#8296A8" }} />
                  </div>
                )}

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "44px",
                    height: "44px",
                    borderRadius: "13px",
                    background: `${stage.accent}14`,
                    border: `1px solid ${stage.accent}2A`,
                    marginBottom: "14px",
                  }}
                >
                  <StageIcon style={{ width: "20px", height: "20px", color: stage.accent }} />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{stage.title}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{stage.body}</p>
              </div>
            )
          })}
        </div>

        {/* Focus-area switcher */}
        <div className="mt-6 rounded-2xl border border-border-default bg-bg-base p-5 md:p-6">
          <div className="flex flex-wrap gap-2 mb-5">
            {copy.focus.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveFocusId(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  item.id === activeFocus.id
                    ? "bg-brand text-white"
                    : "border border-border-default bg-bg-surface text-text-secondary hover:text-text-primary"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <h3 className="text-base font-semibold text-text-primary mb-2">{activeFocus.title}</h3>
          <p className="text-sm leading-relaxed text-text-secondary mb-4">{activeFocus.body}</p>

          <div className="grid gap-3 sm:grid-cols-3 mb-5">
            {activeFocus.figures.map((figure) => (
              <div key={figure.id} className="rounded-xl border border-border-default bg-bg-surface p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{figure.label}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary font-mono">{figure.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-xl bg-brand px-5 text-white hover:bg-brand-hover">
              <Link href={activeFocus.href}>{activeFocus.cta}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-border-default bg-bg-base">
              <Link href="/properties">{browsePropertiesItem.cta}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── QUICK ACTIONS ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
        <h2 className="text-xl font-semibold text-text-primary">{copy.actions.heading}</h2>
        <p className="mt-1 text-sm text-text-secondary">{copy.actions.subheading}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {copy.actions.items.map((action) => {
            const Icon = action.icon
            return (
              <div
                key={action.key}
                className="flex h-full flex-col rounded-2xl border border-border-default bg-bg-base p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-text-primary">{action.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{action.body}</p>
                <Button
                  asChild
                  variant={action.variant}
                  className="mt-5 justify-between rounded-xl border-border-default bg-bg-surface"
                >
                  <Link href={action.href}>
                    {copy.actions.open}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── RECENT ANALYSES + GUIDANCE ────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
          <h2 className="text-xl font-semibold text-text-primary">{copy.recent.heading}</h2>
          <p className="mt-1 text-sm text-text-secondary">{copy.recent.subheading}</p>

          {recentEntries.length > 0 ? (
            <div className="mt-5 space-y-3">
              {recentEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/analyse?manual=${encodeURIComponent(entry.id)}`}
                  className="block rounded-2xl border border-border-default bg-bg-base p-4 transition-colors hover:bg-bg-elevated"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-text-primary">
                        {entry.name || copy.recent.untitled}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {formatSavedAt(entry.savedAt, locale) ?? copy.recent.savedFallback}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand">
                      {entry.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border-default bg-bg-base p-5 text-sm text-text-secondary">
              {copy.recent.empty}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
          <h2 className="text-xl font-semibold text-text-primary">{copy.guidance.heading}</h2>
          <p className="mt-1 text-sm text-text-secondary">{copy.guidance.subheading}</p>
          <div className="mt-5 space-y-3">
            {copy.guidance.items.map((step) => (
              <div key={step.id} className="rounded-2xl border border-border-default bg-bg-base p-4">
                <h3 className="text-base font-semibold text-text-primary">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.body}</p>
                <Link
                  href={step.href}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover"
                >
                  {step.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
          <Link
            href="/properties"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover"
          >
            {copy.guidance.browseLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      {/* ── CAPABILITIES (dark) ───────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #080D19 0%, #0C1527 100%)",
          borderRadius: "1.25rem",
          padding: "clamp(28px, 5vw, 48px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(59,123,245,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(59,123,245,0.025) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />
        {/* Top-right glow */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,123,245,0.07) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <div className="relative">
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "rgba(59,123,245,0.65)",
              marginBottom: "8px",
            }}
          >
            Platform Capabilities
          </p>
          <h2
            className="font-serif"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              color: "white",
              fontWeight: 400,
              marginBottom: "8px",
            }}
          >
            {copy.capabilities.heading}
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.42)",
              fontSize: "0.9375rem",
              marginBottom: "32px",
              maxWidth: "460px",
            }}
          >
            {copy.capabilities.subheading}
          </p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {copy.capabilities.items.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "20px",
                    transition: "border-color 0.2s ease, background 0.2s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = "rgba(59,123,245,0.36)"
                    el.style.background = "rgba(59,123,245,0.065)"
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = "rgba(255,255,255,0.08)"
                    el.style.background = "rgba(255,255,255,0.04)"
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "rgba(59,123,245,0.12)",
                      marginBottom: "14px",
                    }}
                  >
                    <Icon style={{ width: "18px", height: "18px", color: "#3B7BF5" }} />
                  </div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "white", marginBottom: "8px" }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: "0.8125rem", lineHeight: 1.58, color: "rgba(255,255,255,0.40)" }}>
                    {item.body}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
