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

  const DEMO_CODE = "DEMO2025"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Demo mode: bypass API for local testing
    if (accessCode.toUpperCase() === DEMO_CODE) {
      const demoToken = "demo_token_" + Date.now()
      const demoUserId = "demo_user_001"
      const demoName = name || "Demo User"
      saveSession(demoToken, demoUserId, demoName, true)
      router.push("/properties")
      return
    }

    const { data, error: apiError } = await immoApi.betaLogin(accessCode, name || undefined)

    if (apiError || !data) {
      setError(t("login.error"))
      setLoading(false)
      return
    }

    saveSession(data.session_token, data.user_id, name || "Investor", true)
    router.push("/properties")
  }

  const floatingCards = [
    {
      verdict: t("login.card.strongBuy"),
      headline: t("login.card.belowVal"),
      yield: "5.8%",
      delay: "0s",
      badgeClass: "bg-success-bg text-success",
    },
    {
      verdict: t("login.card.worthAnalysing"),
      headline: t("login.card.atMarket"),
      yield: "4.2%",
      delay: "1s",
      badgeClass: "bg-brand-subtle text-brand",
    },
    {
      verdict: t("login.card.caution"),
      headline: t("login.card.aboveVal"),
      yield: "3.1%",
      delay: "2s",
      badgeClass: "bg-warning-bg text-warning",
    },
  ]

  return (
    <div className="grid min-h-screen bg-bg-base md:grid-cols-2">
      {/* Left column */}
      <div className="flex flex-col justify-center border-r border-border-default bg-bg-surface px-8 py-16 md:px-16">
        {/* Logo + Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-serif text-xl text-text-primary">Immonator</span>
            <span className="ml-2 rounded bg-brand-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">
              BETA
            </span>
          </div>
          <LocaleSwitcher />
        </div>

        {/* Headline */}
        <h1 className="mt-10 max-w-sm font-serif text-5xl leading-[1.1] text-text-primary">
          {t("login.headline")}
        </h1>

        {/* Subtext */}
        <p className="mt-4 max-w-xs text-lg leading-relaxed text-text-secondary">
          {t("login.subtitle")}
        </p>

        {/* Feature pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            t("login.pills.valuation"),
            t("login.pills.strategy"),
            t("login.pills.negotiation"),
          ].map((pill) => (
            <span
              key={pill}
              className="rounded-full bg-brand-subtle px-3 py-1.5 text-xs font-medium text-brand"
            >
              {pill}
            </span>
          ))}
        </div>

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
            className="mt-2 h-12 w-full rounded-xl bg-brand text-base font-semibold text-white transition-colors duration-150 hover:bg-brand-hover disabled:opacity-50"
          >
            {loading ? t("login.submitting") : t("login.submit")}
          </button>
        </form>
      </div>

      {/* Right column */}
      <div
        className="relative hidden items-center justify-center overflow-hidden md:flex"
        style={{
          backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="relative h-[400px] w-[320px]">
          {floatingCards.map((card, i) => (
            <div
              key={i}
              className="absolute w-[280px] rounded-2xl border border-border-default bg-bg-surface p-5"
              style={{
                boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
                top: `${i * 60}px`,
                left: `${i * 20}px`,
                zIndex: floatingCards.length - i,
                animation: `float 6s ease-in-out infinite`,
                animationDelay: card.delay,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${card.badgeClass}`}
                >
                  {card.verdict}
                </span>
                <span className="font-mono text-sm font-medium text-text-primary">{card.yield}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-text-primary">{card.headline}</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-bg-elevated">
                <div
                  className="h-1.5 rounded-full bg-brand"
                  style={{ width: `${80 - i * 15}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
