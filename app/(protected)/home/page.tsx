"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Briefcase,
  Building2,
  Compass,
  LineChart,
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
  statLabels: {
    workflows: string
    capabilities: string
    modes: string
    recent: string
  }
  highlights: Array<{
    id: string
    title: string
    body: string
    icon: typeof Building2
  }>
  focus: {
    heading: string
    subheading: string
    items: Array<{
      id: string
      label: string
      title: string
      body: string
      href: string
      cta: string
      figures: Array<{
        id: string
        label: string
        value: string
      }>
    }>
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
    browseLabel: string
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
    title: "Use Immonator as your starting point for property decisions.",
    subtitle:
      "Understand the product quickly, jump into the right workflow, and keep your current analysis work moving without leaving the authenticated app.",
    statLabels: {
      workflows: "Primary workflows",
      capabilities: "Core capabilities",
      modes: "Analysis modes",
      recent: "Saved manual analyses",
    },
    highlights: [
      {
        id: "analysis",
        title: "Independent property analysis",
        body: "Review value, yield, cash flow, and risk signals before you spend more time on a deal.",
        icon: Building2,
      },
      {
        id: "strategy",
        title: "Buying strategy support",
        body: "Compare options and pressure-test how a property fits your broader acquisition plan.",
        icon: Compass,
      },
      {
        id: "portfolio",
        title: "Portfolio continuity",
        body: "Pick up saved analyses, watched properties, and investment review work without rebuilding context.",
        icon: Briefcase,
      },
    ],
    focus: {
      heading: "Explore a workflow",
      subheading: "Switch between product areas to see what each one is best for before you jump in.",
      items: [
        {
          id: "analysis",
          label: "Analysis",
          title: "Start with a single property when you need a grounded first view.",
          body: "Use the full underwriting workspace to understand valuation, returns, financing impact, and risks for one property at a time.",
          href: "/analyse",
          cta: "Start New Analysis",
          figures: [
            { id: "output", label: "Primary output", value: "Valuation + verdict" },
            { id: "best", label: "Best for", value: "First-pass review" },
            { id: "depth", label: "View depth", value: "Full underwriting" },
          ],
        },
        {
          id: "compare",
          label: "Compare",
          title: "Open compare mode when the question is which deal looks stronger.",
          body: "Run two full analyses with the same input depth and compare the outputs side by side in one place.",
          href: "/analyse?mode=compare",
          cta: "Compare Properties",
          figures: [
            { id: "properties", label: "Compared at once", value: "2 properties" },
            { id: "format", label: "Comparison style", value: "A vs B" },
            { id: "decision", label: "Best for", value: "Deal selection" },
          ],
        },
        {
          id: "portfolio",
          label: "Portfolio",
          title: "Go to Portfolio when you want continuity across saved work.",
          body: "Track watched assets, revisit manual analyses, and continue portfolio review without restarting from scratch.",
          href: "/portfolio",
          cta: "Open Portfolio",
          figures: [
            { id: "coverage", label: "Tracks", value: "Saved + watched" },
            { id: "focus", label: "Best for", value: "Ongoing review" },
            { id: "continuity", label: "Context", value: "Previous work" },
          ],
        },
        {
          id: "properties",
          label: "Properties",
          title: "Browse the live property browser when you want new opportunities.",
          body: "Move from product guidance into the listings workflow to browse, add, and save real properties for deeper review.",
          href: "/properties",
          cta: "Browse Properties",
          figures: [
            { id: "purpose", label: "Best for", value: "Finding deals" },
            { id: "next", label: "Natural next step", value: "Save to review" },
            { id: "source", label: "Input source", value: "Live listings" },
          ],
        },
      ],
    },
    actions: {
      heading: "Primary next actions",
      subheading: "Use the main workflows directly from Home.",
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
          icon: LineChart,
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
      browseLabel: "Need fresh opportunities first? Browse Properties",
      items: [
        {
          id: "new-user",
          title: "New to the platform",
          body: "Start with one property analysis to understand how Immonator structures valuation, returns, and risk signals.",
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
    title: "Nutzen Sie Immonator als Ausgangspunkt für Immobilienentscheidungen.",
    subtitle:
      "Verstehen Sie das Produkt schnell, wechseln Sie direkt in den passenden Workflow und setzen Sie Ihre bestehende Analysearbeit fort, ohne die authentifizierte App zu verlassen.",
    statLabels: {
      workflows: "Haupt-Workflows",
      capabilities: "Kernfunktionen",
      modes: "Analysemodi",
      recent: "Gespeicherte manuelle Analysen",
    },
    highlights: [
      {
        id: "analysis",
        title: "Unabhängige Immobilienanalyse",
        body: "Prüfen Sie Wert, Rendite, Cashflow und Risikosignale, bevor Sie mehr Zeit in einen Deal investieren.",
        icon: Building2,
      },
      {
        id: "strategy",
        title: "Unterstützung für die Kaufstrategie",
        body: "Vergleichen Sie Optionen und prüfen Sie, wie eine Immobilie in Ihren breiteren Ankaufsplan passt.",
        icon: Compass,
      },
      {
        id: "portfolio",
        title: "Portfolio-Kontinuität",
        body: "Greifen Sie auf gespeicherte Analysen, beobachtete Objekte und laufende Investment-Reviews zurück.",
        icon: Briefcase,
      },
    ],
    focus: {
      heading: "Workflow erkunden",
      subheading: "Wechseln Sie zwischen Produktbereichen und sehen Sie direkt, wofür sich jeder Bereich am besten eignet.",
      items: [
        {
          id: "analysis",
          label: "Analyse",
          title: "Starten Sie mit einer Einzelimmobilie, wenn Sie zuerst eine belastbare Einschätzung brauchen.",
          body: "Nutzen Sie den vollständigen Underwriting-Workspace, um Bewertung, Rendite, Finanzierungseffekt und Risiken für eine Immobilie zu verstehen.",
          href: "/analyse",
          cta: "Neue Analyse starten",
          figures: [
            { id: "output", label: "Haupt-Output", value: "Bewertung + Urteil" },
            { id: "best", label: "Am besten für", value: "Ersteinschätzung" },
            { id: "depth", label: "Analyse-Tiefe", value: "Vollständiges Underwriting" },
          ],
        },
        {
          id: "compare",
          label: "Vergleich",
          title: "Öffnen Sie den Vergleichsmodus, wenn die Frage lautet, welcher Deal stärker wirkt.",
          body: "Führen Sie zwei vollständige Analysen mit derselben Eingabetiefe aus und vergleichen Sie die Ergebnisse nebeneinander.",
          href: "/analyse?mode=compare",
          cta: "Immobilien vergleichen",
          figures: [
            { id: "properties", label: "Gleichzeitig verglichen", value: "2 Immobilien" },
            { id: "format", label: "Vergleichsformat", value: "A vs B" },
            { id: "decision", label: "Am besten für", value: "Deal-Auswahl" },
          ],
        },
        {
          id: "portfolio",
          label: "Portfolio",
          title: "Gehen Sie ins Portfolio, wenn Sie bestehende Arbeit fortsetzen möchten.",
          body: "Verfolgen Sie beobachtete Assets, öffnen Sie manuelle Analysen erneut und setzen Sie Portfolio-Reviews ohne Neustart fort.",
          href: "/portfolio",
          cta: "Portfolio öffnen",
          figures: [
            { id: "coverage", label: "Enthält", value: "Gespeichert + beobachtet" },
            { id: "focus", label: "Am besten für", value: "Laufende Reviews" },
            { id: "continuity", label: "Kontext", value: "Bisherige Arbeit" },
          ],
        },
        {
          id: "properties",
          label: "Immobilien",
          title: "Öffnen Sie den Immobilienbrowser, wenn Sie neue Chancen suchen.",
          body: "Wechseln Sie von der Produktübersicht in den Listings-Workflow, um reale Objekte zu durchsuchen, hinzuzufügen und für eine tiefere Prüfung zu speichern.",
          href: "/properties",
          cta: "Immobilien ansehen",
          figures: [
            { id: "purpose", label: "Am besten für", value: "Deal-Findung" },
            { id: "next", label: "Nächster Schritt", value: "Zum Review speichern" },
            { id: "source", label: "Quelle", value: "Live-Listings" },
          ],
        },
      ],
    },
    actions: {
      heading: "Wichtige nächste Aktionen",
      subheading: "Nutzen Sie die Haupt-Workflows direkt von Home aus.",
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
          icon: LineChart,
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
      browseLabel: "Brauchen Sie zuerst neue Chancen? Immobilien ansehen",
      items: [
        {
          id: "new-user",
          title: "Neu auf der Plattform",
          body: "Beginnen Sie mit einer Einzelanalyse, um zu verstehen, wie Immonator Bewertung, Renditen und Risikosignale strukturiert.",
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
                  <Link href="/properties">{locale === "de" ? "Immobilien ansehen" : "Browse Properties"}</Link>
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
