"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { isLoggedIn } from "@/lib/auth"
import { VerdictBadge } from "@/components/verdict-badge"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useLocale } from "@/lib/i18n/locale-context"

function useScrollFadeIn() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1"
          el.style.transform = "translateY(0)"
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function ScrollFadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollFadeIn()
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: 0, transform: "translateY(20px)", transition: "opacity 400ms ease, transform 400ms ease" }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [showArrow, setShowArrow] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) {
      router.push("/properties")
    }
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => setShowArrow(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Nav */}
      <header className="flex h-[58px] items-center justify-between border-b border-border-default bg-bg-surface px-6 md:px-10">
        <div className="flex items-center">
          <span className="font-serif text-xl text-text-primary">Immonator</span>
          <span className="ml-2 rounded bg-brand-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Link
            href="/beta-login"
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-hover"
          >
            {t("landing.nav.beta")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex min-h-[90vh] flex-col items-center justify-center px-6 text-center">
        <h1
          className="mx-auto max-w-3xl font-serif text-5xl leading-[1.12] text-text-primary md:text-6xl"
          style={{ opacity: 0, animation: "fade-up 500ms ease forwards" }}
        >
          {t("landing.hero.title")}
        </h1>

        <p
          className="mx-auto mt-5 max-w-[420px] text-lg leading-relaxed text-text-secondary"
          style={{ opacity: 0, animation: "fade-up 500ms ease 150ms forwards" }}
        >
          {t("landing.hero.subtitle")}
        </p>

        {/* Feature pills */}
        <div
          className="mt-6 flex flex-wrap justify-center gap-3"
          style={{ opacity: 0, animation: "fade-up 500ms ease 250ms forwards" }}
        >
          {[
            t("landing.pills.ertragswert"),
            t("landing.pills.aiVerdict"),
            t("landing.pills.negotiation"),
          ].map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-border-default bg-bg-elevated px-4 py-2 text-[13px] text-text-secondary"
            >
              {pill}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div style={{ opacity: 0, animation: "fade-up 500ms ease 350ms forwards" }}>
          <Link
            href="/beta-login"
            className="mt-8 inline-block rounded-xl bg-brand px-8 text-base font-semibold leading-[52px] text-white transition-colors duration-150 hover:bg-brand-hover"
          >
            {t("landing.cta.primary")}
          </Link>
          <p className="mt-3 text-xs text-text-muted">
            {t("landing.cta.inviteOnly")}
          </p>
        </div>

        {/* Scroll indicator */}
        <div
          className="mt-12 text-sm text-text-muted"
          style={{
            opacity: showArrow ? 1 : 0,
            transition: "opacity 500ms ease",
            animation: showArrow ? "scroll-bounce 2s ease-in-out infinite" : "none",
          }}
        >
          {"\u2193"}
        </div>
      </section>

      {/* Mock Output Card */}
      <section className="px-6 pb-20">
        <ScrollFadeIn className="mx-auto max-w-[520px]">
          <div className="rounded-2xl border border-border-default bg-bg-surface p-6" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
            {/* Top row */}
            <div className="flex items-center justify-between">
              <VerdictBadge verdict="strong_buy" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">{t("landing.mock.confidence")}</span>
                <div className="h-1.5 w-16 rounded-full bg-bg-elevated">
                  <div className="h-1.5 w-[80%] rounded-full bg-brand" />
                </div>
              </div>
            </div>

            {/* Headline */}
            <p className="mt-4 text-base font-semibold text-text-primary">
              <span className="font-mono">12%</span> {t("landing.mock.belowVal")}{" \u00B7 "}
              <span className="font-mono">5.8%</span> {t("landing.mock.grossYield")}
            </p>

            {/* Two columns */}
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
              <span className="text-success">{t("landing.mock.belowBoden")}</span>
              <span className="text-warning">{t("landing.mock.heating")}</span>
              <span className="text-success">{t("landing.mock.tenant")}</span>
              <span className="text-warning">{t("landing.mock.window")}<span className="font-mono">8,000</span></span>
              <span className="text-success">{t("landing.mock.altbau")}</span>
            </div>

            {/* Divider + bottom row */}
            <div className="mt-4 border-t border-border-default pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">{t("landing.mock.instant")}</span>
                <div className="flex gap-4">
                  {[
                    { label: "Ertragswert", value: "\u20AC261k", color: "text-text-muted" },
                    { label: "Sachwert", value: "\u20AC274k", color: "text-text-muted" },
                    { label: "Yield", value: "5.8%", color: "text-success" },
                    { label: "Offer", value: "\u20AC255k", color: "text-brand" },
                  ].map((m) => (
                    <div key={m.label} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] uppercase tracking-wider text-text-muted">{m.label}</span>
                      <span className={`font-mono text-sm font-medium ${m.color}`}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-text-muted">
            {t("landing.mock.note")}
          </p>
        </ScrollFadeIn>
      </section>

      {/* Three Capabilities */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        {[
          {
            icon: "\u2696",
            title: t("landing.cap1.title"),
            body: t("landing.cap1.body"),
            mockup: (
              <div className="min-w-[240px] rounded-xl border border-border-default bg-bg-surface p-4">
                {[
                  { label: "Ertragswert", value: "\u20AC261,000", color: "text-success" },
                  { label: "Sachwert", value: "\u20AC274,000", color: "text-text-primary" },
                  { label: t("landing.cap1.asking"), value: "\u20AC285,000", color: "text-danger" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-text-secondary">{row.label}</span>
                    <span className={`font-mono font-medium ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            ),
            reverse: false,
          },
          {
            icon: "\uD83C\uDFAF",
            title: t("landing.cap2.title"),
            body: t("landing.cap2.body"),
            mockup: (
              <div className="min-w-[240px] rounded-xl border border-border-default bg-bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{t("landing.cap2.stratLabel")}</p>
                <p className="mt-2 text-sm text-text-primary">
                  {t("landing.cap2.target")} <span className="font-medium">{t("landing.cap2.targetCities")}</span>
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {t("landing.cap2.minYield")} <span className="font-mono">5.5%</span>{" \u00B7 "}{t("landing.cap2.max")} {"\u20AC"}<span className="font-mono">320,000</span>
                </p>
              </div>
            ),
            reverse: true,
          },
          {
            icon: "\uD83E\uDD1D",
            title: t("landing.cap3.title"),
            body: t("landing.cap3.body"),
            mockup: (
              <div className="min-w-[240px] rounded-xl border border-border-default bg-bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">{t("landing.cap3.opening")}</span>
                  <span className="font-mono text-lg font-medium text-success">{"\u20AC255,000"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-text-muted">{t("landing.cap3.walkAway")}</span>
                  <span className="font-mono text-sm text-text-secondary">{"\u20AC272,000"}</span>
                </div>
              </div>
            ),
            reverse: false,
          },
        ].map((item, i) => (
          <ScrollFadeIn
            key={i}
            className={`mx-auto flex max-w-4xl flex-col items-center gap-12 ${i > 0 ? "mt-20" : ""} md:flex-row ${item.reverse ? "md:flex-row-reverse" : ""}`}
          >
            <div className="flex-1">
              <span className="text-4xl">{item.icon}</span>
              <h3 className="mt-4 font-serif text-3xl text-text-primary">{item.title}</h3>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-text-secondary">{item.body}</p>
            </div>
            <div className="flex-shrink-0">{item.mockup}</div>
          </ScrollFadeIn>
        ))}
      </section>

      {/* Quote */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <span className="font-serif text-7xl leading-none text-brand opacity-50">{"\u275E"}</span>
          <p className="mx-auto mt-2 max-w-lg font-serif text-2xl leading-relaxed text-text-primary italic">
            {t("landing.quote.text")}
          </p>
          <p className="mt-5 text-sm text-text-muted">
            {t("landing.quote.author")}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border-default bg-bg-surface px-6 py-20 text-center">
        <h2 className="font-serif text-4xl text-text-primary">{t("landing.final.title")}</h2>
        <Link
          href="/beta-login"
          className="mt-6 inline-block rounded-xl bg-brand px-8 text-base font-semibold leading-[52px] text-white transition-colors duration-150 hover:bg-brand-hover"
        >
          {t("landing.final.cta")}
        </Link>
        <p className="mt-3 text-xs text-text-muted">{t("landing.final.note")}</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-default px-6 py-8 text-center">
        <p className="text-xs text-text-muted">
          {t("landing.footer")}
        </p>
      </footer>
    </div>
  )
}
