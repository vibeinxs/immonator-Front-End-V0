"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Briefcase,
  Building2,
  Compass,
  MessageSquareText,
  SearchCheck,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { listEntries, type ManualPortfolioEntry } from "@/lib/manualPortfolio"
import { useLocale } from "@/lib/i18n/locale-context"

type HomeCopy = {
  eyebrow: string
  title: string
  subtitle: string
  explainerPoints: string[]
  quickStart: {
    label: string
    title: string
    body: string
    primaryCta: string
    secondaryCta: string
    propertiesCta: string
  }
  actions: {
    heading: string
    subheading: string
    open: string
    items: Array<{
      key: string
      title: string
      body: string
      href: string
      variant: "default" | "outline"
      icon: typeof BarChart3
    }>
  }
  capabilities: {
    heading: string
    subheading: string
    items: Array<{
      id: string
      title: string
      body: string
      icon: typeof Sparkles
    }>
  }
  guidance: {
    heading: string
    subheading: string
    items: Array<{
      id: string
      title: string
      body: string
      href: string
      cta: string
    }>
  }
  recent: {
    heading: string
    subheading: string
    untitled: string
    savedFallback: string
    empty: string
  }
}

const HOME_COPY: Record<"en" | "de", HomeCopy> = {
  en: {
    eyebrow: "Product home",
    title: "Understand what Immonator does and choose the right next step.",
    subtitle:
      "Immonator helps you analyse individual properties, review investment quality, compare opportunities, shape a buying strategy, and keep portfolio work organised.",
    explainerPoints: [
      "Independent property analysis before you commit more time or capital.",
      "Investment review with practical signals for yield, cash flow, and valuation.",
      "Buying strategy support when you need to compare options or pressure-test a deal.",
      "Portfolio tracking so saved analyses and watched properties stay easy to revisit.",
    ],
    quickStart: {
      label: "Where to begin",
      title: "Start with the task you want to complete now.",
      body:
        "If you are new, begin with a single property analysis. If you already have candidates, compare them side by side or open your portfolio to continue previous work.",
      primaryCta: "Start New Analysis",
      secondaryCta: "Open Portfolio",
      propertiesCta: "Browse Properties",
    },
    actions: {
      heading: "Primary next actions",
      subheading: "Jump directly into the main workflows without changing the rest of the app.",
      open: "Open",
      items: [
        {
          key: "analysis",
          title: "Start New Analysis",
          body: "Open the full analysis workspace to underwrite a property from scratch.",
          href: "/analyse",
          variant: "default",
          icon: BarChart3,
        },
        {
          key: "compare",
          title: "Compare Properties",
          body: "Go directly to compare mode when you want to review two deals side by side.",
          href: "/analyse?mode=compare",
          variant: "outline",
          icon: ArrowRightLeft,
        },
        {
          key: "portfolio",
          title: "Open Portfolio",
          body: "Continue with watched properties, saved analyses, and portfolio review work.",
          href: "/portfolio",
          variant: "outline",
          icon: Briefcase,
        },
      ],
    },
    capabilities: {
      heading: "Platform capabilities",
      subheading: "Use the current product modules depending on the decision you need to make.",
      items: [
        {
          id: "advisor",
          title: "Intelligent Property Advisor",
          body: "Get guided interpretation of the property and its underwriting signals so you can decide what deserves another step.",
          icon: Sparkles,
        },
        {
          id: "snapshot",
          title: "Intelligent Property Snapshot",
          body: "Review a compact summary of value, yield, cash flow, and key signals before going deeper.",
          icon: SearchCheck,
        },
        {
          id: "review",
          title: "Investment Review",
          body: "Check whether a property fits your return expectations, financing assumptions, and downside tolerance.",
          icon: Building2,
        },
        {
          id: "strategy",
          title: "Buying Strategy Insight",
          body: "Use comparison and strategy workflows to understand where a property fits in your broader acquisition plan.",
          icon: Compass,
        },
        {
          id: "ask",
          title: "Ask the Property Advisor",
          body: "Use the advisor chat in analysis workflows when you want follow-up questions answered in context.",
          icon: MessageSquareText,
        },
      ],
    },
    guidance: {
      heading: "Where to start",
      subheading: "Choose the path that best matches your current decision.",
      items: [
        {
          id: "new-user",
          title: "New to the platform",
          body: "Start with one property analysis to see how Immonator structures valuation, returns, and risk signals.",
          href: "/analyse",
          cta: "Start with analysis",
        },
        {
          id: "compare",
          title: "Comparing deals",
          body: "Open compare mode when you already have two candidates and want one place to review the numbers consistently.",
          href: "/analyse?mode=compare",
          cta: "Open compare mode",
        },
        {
          id: "portfolio",
          title: "Tracking properties",
          body: "Go to portfolio when you want to revisit saved work, watched assets, or ongoing investment review.",
          href: "/portfolio",
          cta: "Open portfolio",
        },
      ],
    },
    recent: {
      heading: "Recent manual analyses",
      subheading: "Quick access to your latest saved manual work.",
      untitled: "Untitled analysis",
      savedFallback: "Saved recently",
      empty: "No recent manual analyses yet. Run an analysis and save it to see it here.",
    },
  },
  de: {
    eyebrow: "Produktstart",
    title: "Verstehen Sie, was Immonator kann, und gehen Sie direkt zum passenden nächsten Schritt.",
    subtitle:
      "Immonator hilft Ihnen dabei, einzelne Immobilien zu analysieren, Investments zu prüfen, Chancen zu vergleichen, Ihre Kaufstrategie zu schärfen und Portfolio-Arbeit sauber zu organisieren.",
    explainerPoints: [
      "Unabhängige Immobilienanalyse, bevor Sie mehr Zeit oder Kapital binden.",
      "Investment-Review mit praktischen Signalen zu Rendite, Cashflow und Bewertung.",
      "Unterstützung für Ihre Kaufstrategie, wenn Sie Optionen vergleichen oder einen Deal gegenprüfen möchten.",
      "Portfolio-Tracking, damit gespeicherte Analysen und beobachtete Objekte leicht wiederzufinden sind.",
    ],
    quickStart: {
      label: "Startpunkt",
      title: "Beginnen Sie mit der Aufgabe, die Sie jetzt erledigen möchten.",
      body:
        "Wenn Sie neu sind, starten Sie mit einer Einzelanalyse. Wenn Sie bereits Kandidaten haben, wechseln Sie in den Vergleich oder öffnen Ihr Portfolio, um bestehende Arbeit fortzusetzen.",
      primaryCta: "Neue Analyse starten",
      secondaryCta: "Portfolio öffnen",
      propertiesCta: "Immobilien ansehen",
    },
    actions: {
      heading: "Wichtige nächste Aktionen",
      subheading: "Springen Sie direkt in die Haupt-Workflows, ohne den Rest der App zu verändern.",
      open: "Öffnen",
      items: [
        {
          key: "analysis",
          title: "Neue Analyse starten",
          body: "Öffnen Sie den vollständigen Analyse-Workspace, um eine Immobilie von Grund auf zu prüfen.",
          href: "/analyse",
          variant: "default",
          icon: BarChart3,
        },
        {
          key: "compare",
          title: "Immobilien vergleichen",
          body: "Gehen Sie direkt in den Vergleichsmodus, wenn Sie zwei Deals nebeneinander bewerten möchten.",
          href: "/analyse?mode=compare",
          variant: "outline",
          icon: ArrowRightLeft,
        },
        {
          key: "portfolio",
          title: "Portfolio öffnen",
          body: "Setzen Sie die Arbeit mit beobachteten Objekten, gespeicherten Analysen und Portfolio-Review fort.",
          href: "/portfolio",
          variant: "outline",
          icon: Briefcase,
        },
      ],
    },
    capabilities: {
      heading: "Produktfunktionen",
      subheading: "Nutzen Sie die bestehenden Produktmodule je nach Entscheidung, die Sie treffen möchten.",
      items: [
        {
          id: "advisor",
          title: "Intelligent Property Advisor",
          body: "Erhalten Sie eine geführte Einordnung der Immobilie und ihrer Underwriting-Signale, damit Sie die nächsten Schritte sicher priorisieren können.",
          icon: Sparkles,
        },
        {
          id: "snapshot",
          title: "Intelligent Property Snapshot",
          body: "Prüfen Sie eine kompakte Übersicht zu Wert, Rendite, Cashflow und zentralen Signalen, bevor Sie tiefer einsteigen.",
          icon: SearchCheck,
        },
        {
          id: "review",
          title: "Investment Review",
          body: "Bewerten Sie, ob eine Immobilie zu Ihren Renditeerwartungen, Finanzierungsannahmen und Ihrem Risikorahmen passt.",
          icon: Building2,
        },
        {
          id: "strategy",
          title: "Buying Strategy Insight",
          body: "Nutzen Sie Vergleichs- und Strategie-Workflows, um die Rolle einer Immobilie in Ihrem gesamten Ankaufsvorhaben zu verstehen.",
          icon: Compass,
        },
        {
          id: "ask",
          title: "Ask the Property Advisor",
          body: "Verwenden Sie den Advisor-Chat in Analyse-Workflows, wenn Sie Folgefragen direkt im Kontext klären möchten.",
          icon: MessageSquareText,
        },
      ],
    },
    guidance: {
      heading: "Womit Sie starten sollten",
      subheading: "Wählen Sie den Pfad, der am besten zu Ihrer aktuellen Entscheidung passt.",
      items: [
        {
          id: "new-user",
          title: "Neu auf der Plattform",
          body: "Beginnen Sie mit einer Einzelanalyse, um zu sehen, wie Immonator Bewertung, Renditen und Risikosignale strukturiert.",
          href: "/analyse",
          cta: "Mit Analyse starten",
        },
        {
          id: "compare",
          title: "Deals vergleichen",
          body: "Öffnen Sie den Vergleichsmodus, wenn Sie bereits zwei Kandidaten haben und die Zahlen an einem Ort konsistent prüfen möchten.",
          href: "/analyse?mode=compare",
          cta: "Vergleich öffnen",
        },
        {
          id: "portfolio",
          title: "Objekte nachverfolgen",
          body: "Gehen Sie ins Portfolio, wenn Sie gespeicherte Arbeit, beobachtete Assets oder laufende Investment-Reviews erneut aufrufen möchten.",
          href: "/portfolio",
          cta: "Portfolio öffnen",
        },
      ],
    },
    recent: {
      heading: "Letzte manuelle Analysen",
      subheading: "Schneller Zugriff auf Ihre zuletzt gespeicherten manuellen Analysen.",
      untitled: "Unbenannte Analyse",
      savedFallback: "Kürzlich gespeichert",
      empty: "Noch keine letzten manuellen Analysen. Führen Sie eine Analyse aus und speichern Sie sie, damit sie hier erscheint.",
    },
  },
}

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

  useEffect(() => {
    const syncEntries = () => setRecentEntries(listEntries().slice(0, 3))

    syncEntries()
    window.addEventListener("storage", syncEntries)
    return () => window.removeEventListener("storage", syncEntries)
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center rounded-full bg-brand-subtle px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
              {copy.eyebrow}
            </div>
            <div className="space-y-3">
              <h1 className="font-serif text-3xl text-text-primary md:text-4xl">{copy.title}</h1>
              <p className="max-w-2xl text-base leading-relaxed text-text-secondary">{copy.subtitle}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {copy.explainerPoints.map((point, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border-default bg-bg-base px-4 py-3 text-sm text-text-secondary"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-bg-base p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              {copy.quickStart.label}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-text-primary">{copy.quickStart.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{copy.quickStart.body}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild className="rounded-xl bg-brand px-5 text-white hover:bg-brand-hover">
                <Link href="/analyse">{copy.quickStart.primaryCta}</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-border-default bg-bg-surface">
                <Link href="/portfolio">{copy.quickStart.secondaryCta}</Link>
              </Button>
            </div>
            <Link
              href="/properties"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover"
            >
              {copy.quickStart.propertiesCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
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

      <section className="rounded-2xl border border-border-default bg-bg-surface p-6 md:p-8">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-text-primary">{copy.capabilities.heading}</h2>
          <p className="mt-1 text-sm text-text-secondary">{copy.capabilities.subheading}</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
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
    </div>
  )
}
