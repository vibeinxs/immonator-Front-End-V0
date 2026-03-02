"use client"

import { useLocale } from "@/lib/i18n/locale-context"

export function LocaleSwitcher() {
  const { locale, setLocale, isTranslating } = useLocale()

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border-default text-sm">
      {isTranslating && (
        <div className="ml-2 h-2 w-2 animate-pulse rounded-full bg-brand" title="Translating..." />
      )}
      <button
        onClick={() => setLocale("en")}
        className={`rounded-l-[7px] px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
          locale === "en"
            ? "bg-brand text-white"
            : "text-text-muted hover:text-text-primary"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <div className="h-4 w-px bg-border-default" />
      <button
        onClick={() => setLocale("de")}
        className={`rounded-r-[7px] px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
          locale === "de"
            ? "bg-brand text-white"
            : "text-text-muted hover:text-text-primary"
        }`}
        aria-label="Auf Deutsch wechseln"
      >
        DE
      </button>
    </div>
  )
}
