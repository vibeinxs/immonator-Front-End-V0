"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isLoggedIn, saveSession } from "@/lib/auth"
import { immoApi } from "@/lib/immonatorApi"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useLocale } from "@/lib/i18n/locale-context"

export default function BetaLoginPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [accessCode, setAccessCode] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) {
      router.push("/properties")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data, error: apiError } = await immoApi.betaLogin({
      beta_code: accessCode,
      display_name: name || undefined,
    })

    if (apiError || !data) {
      setError(t("login.error"))
      setLoading(false)
      return
    }

    saveSession(data.session_token, data.user_id, name || "Investor", data.is_new_user)
    router.push("/properties")
  }

  // Preview card KPI data
  const previewKpis = [
    { label: t("login.preview.kpi1label"), value: t("login.preview.kpi1value"), color: "text-success" },
    { label: t("login.preview.kpi2label"), value: t("login.preview.kpi2value"), color: "text-success" },
    { label: t("login.preview.kpi3label"), value: t("login.preview.kpi3value"), color: "text-success" },
    { label: t("login.preview.kpi4label"), value: t("login.preview.kpi4value"), color: "text-text-primary" },
  ]

  // Score ring geometry (static 7.8/10)
  const R = 28
  const circumference = 2 * Math.PI * R
  const dashTotal = circumference * 0.75
  const dashFill = dashTotal * (7.8 / 10)

  return (
    <div className="grid min-h-screen bg-bg-base md:grid-cols-2">
      {/* ── Left column ─────────────────────────────────── */}
      <div className="flex flex-col justify-center border-r border-border-default bg-bg-surface px-8 py-16 md:px-16">
        {/* Logo + locale switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-serif text-xl text-text-primary">Immonator</span>
            <span className="ml-2 rounded bg-brand-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">
              BETA
            </span>
          </div>
          <LocaleSwitcher />
        </div>

        {/* 3-line stacked headline — each clause fades up in sequence */}
        <div className="mt-10 max-w-sm">
          {[t("login.headline"), t("login.headline2"), t("login.headline3")].map((line, i) => (
            <h1
              key={i}
              className="font-serif text-5xl leading-[1.12] text-text-primary"
              style={{
                opacity: 0,
                animation: `fade-up 500ms ease ${i * 110}ms forwards`,
              }}
            >
              {line}
            </h1>
          ))}
        </div>

        {/* Subtitle */}
        <p
          className="mt-5 max-w-xs text-base leading-relaxed text-text-secondary"
          style={{ opacity: 0, animation: "fade-up 500ms ease 370ms forwards" }}
        >
          {t("login.subtitle")}
        </p>

        {/* Trust line */}
        <p
          className="mt-3 text-sm text-text-muted"
          style={{ opacity: 0, animation: "fade-up 500ms ease 480ms forwards" }}
        >
          {t("login.trustLine")}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-10 max-w-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {t("login.label.code")}
            </label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder={t("login.placeholder.code")}
              required
              className={`h-14 w-full rounded-xl border bg-bg-elevated px-4 font-mono text-lg text-text-primary placeholder:font-sans placeholder:text-sm placeholder:text-text-muted transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 ${
                error ? "border-danger" : "border-border-default"
              }`}
            />
            {error && (
              <p className="mt-1.5 text-sm text-danger">{error}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {t("login.label.name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("login.placeholder.name")}
              className="h-11 w-full rounded-xl border border-border-default bg-bg-elevated px-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 w-full rounded-xl bg-gradient-to-b from-brand to-brand-hover text-base font-semibold text-white [box-shadow:0_4px_20px_rgba(59,123,245,0.22)] hover:[box-shadow:0_6px_24px_rgba(59,123,245,0.30)] active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          >
            {loading ? t("login.submitting") : t("login.submit")}
          </button>
        </form>
      </div>

      {/* ── Right column — analysis preview ─────────────── */}
      <div
        className="relative hidden items-center justify-center overflow-hidden md:flex"
        style={{
          backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="flex flex-col items-center gap-5">
          {/* Analysis preview card */}
          <div
            className="w-[340px] rounded-2xl border border-border bg-bg-surface p-6"
            style={{
              boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.05)",
              animation: "fade-up 600ms ease 200ms both",
            }}
          >
            {/* Property header */}
            <p className="text-xs font-medium text-text-muted">
              {t("login.preview.address")}
            </p>

            {/* Score ring + Verdict */}
            <div className="mt-4 flex items-center gap-5">
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
                <defs>
                  <radialGradient id="login-score-halo" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* Glow halo */}
                <circle cx="36" cy="36" r="44" fill="url(#login-score-halo)" />
                {/* Arc track */}
                <circle
                  cx="36" cy="36" r={R}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="7"
                  strokeDasharray={`${dashTotal} ${circumference}`}
                  strokeLinecap="round"
                  style={{ transform: "rotate(135deg)", transformOrigin: "center" }}
                />
                {/* Arc fill */}
                <circle
                  cx="36" cy="36" r={R}
                  fill="none"
                  stroke="var(--success)"
                  strokeWidth="7"
                  strokeDasharray={`${dashFill} ${circumference}`}
                  strokeLinecap="round"
                  style={{
                    transform: "rotate(135deg)",
                    transformOrigin: "center",
                    transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
                {/* Score number */}
                <text
                  x="36" y="33"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="17"
                  fontWeight="800"
                  fontFamily="var(--font-mono)"
                  fill="var(--text-primary)"
                >
                  {t("login.preview.score")}
                </text>
                {/* /10 label */}
                <text
                  x="36" y="47"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fontWeight="500"
                  fill="var(--text-muted)"
                >
                  / 10
                </text>
              </svg>

              <div>
                <span className="rounded-lg bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
                  {t("login.preview.verdict")}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                  {t("login.preview.address")}
                </p>
              </div>
            </div>

            {/* 4 KPI tiles */}
            <div className="mt-5 grid grid-cols-4 gap-2">
              {previewKpis.map(({ label, value, color }) => (
                <div key={label} className="rounded-lg bg-bg-elevated p-2 text-center">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-text-muted">
                    {label}
                  </p>
                  <p className={`mt-1 font-mono text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* AI insight strip */}
            <div className="mt-4 rounded-lg bg-brand-subtle px-3 py-2.5">
              <p className="text-[11px] font-semibold text-brand">
                {t("login.preview.aiLabel")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                {t("login.preview.aiLine")}
              </p>
            </div>
          </div>

          {/* Caption */}
          <p className="text-xs text-text-muted">{t("login.right.caption")}</p>
        </div>
      </div>
    </div>
  )
}
