"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
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
      <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full bg-brand-subtle px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
              {copy.eyebrow}
            </div>
            <div className="space-y-3">
              <h1 className="max-w-4xl font-serif text-3xl text-text-primary md:text-5xl md:leading-[1.08]">
                {copy.title}
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-text-secondary md:text-lg">
                {copy.subtitle}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {heroStats.map((stat) => (
                <div key={stat.id} className="rounded-2xl border border-border-default bg-bg-base px-4 py-4">
                  <p className="font-mono text-2xl font-semibold text-text-primary">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-text-muted">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {copy.highlights.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.id} className="rounded-2xl border border-border-default bg-bg-base p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-text-primary">{item.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.body}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border-default bg-bg-base p-5 md:p-6">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {copy.focus.heading}
              </p>
              <h2 className="text-xl font-semibold text-text-primary">{activeFocus.title}</h2>
              <p className="text-sm leading-relaxed text-text-secondary">{copy.focus.subheading}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
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

            <div className="mt-5 rounded-2xl border border-border-default bg-bg-surface p-5">
              <p className="text-sm leading-relaxed text-text-secondary">{activeFocus.body}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {activeFocus.figures.map((figure) => (
                  <div key={figure.id} className="rounded-xl border border-border-default bg-bg-base p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{figure.label}</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{figure.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild className="rounded-xl bg-brand px-5 text-white hover:bg-brand-hover">
                  <Link href={activeFocus.href}>{activeFocus.cta}</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl border-border-default bg-bg-base">
                  <Link href="/properties">{browsePropertiesItem.cta}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{copy.actions.heading}</h2>
          <p className="mt-1 text-sm text-text-secondary">{copy.actions.subheading}</p>
        </div>
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
          <h2 className="text-xl font-semibold text-text-primary">{copy.capabilities.heading}</h2>
          <p className="mt-1 text-sm text-text-secondary">{copy.capabilities.subheading}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {copy.capabilities.items.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.id} className="rounded-2xl border border-border-default bg-bg-base p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-elevated text-text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.body}</p>
                </div>
              )
            })}
          </div>
        </section>

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
                      <p className="truncate text-sm font-semibold text-text-primary">{entry.name || copy.recent.untitled}</p>
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
      </div>

      <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
        <h2 className="text-xl font-semibold text-text-primary">{copy.guidance.heading}</h2>
        <p className="mt-1 text-sm text-text-secondary">{copy.guidance.subheading}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {copy.guidance.items.map((step) => (
            <div key={step.id} className="rounded-2xl border border-border-default bg-bg-base p-5">
              <h3 className="text-base font-semibold text-text-primary">{step.title}</h3>
              <p className="mt-2 min-h-20 text-sm leading-relaxed text-text-secondary">{step.body}</p>
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
  )
}
