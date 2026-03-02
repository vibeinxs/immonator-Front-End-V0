"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { translations, type Locale } from "./translations"

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  isTranslating: boolean
}

const LocaleContext = createContext<LocaleContextType | null>(null)

const STORAGE_KEY = "immo_locale"
const CACHE_KEY = "immo_auto_translations"

function getCache(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : { en: {}, de: {} }
  } catch {
    return { en: {}, de: {} }
  }
}

function setCache(cache: Record<string, Record<string, string>>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full or unavailable
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("de")
  const [mounted, setMounted] = useState(false)
  const [autoTranslations, setAutoTranslations] = useState<Record<string, string>>({})
  const [isTranslating, setIsTranslating] = useState(false)
  const pendingRef = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored === "en" || stored === "de") {
      setLocaleState(stored)
    }
    // Load cached auto-translations
    const cache = getCache()
    const storedLocale = stored || "de"
    if (cache[storedLocale]) {
      setAutoTranslations(cache[storedLocale])
    }
    setMounted(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
    document.documentElement.lang = newLocale
    // Load cached auto-translations for new locale
    const cache = getCache()
    setAutoTranslations(cache[newLocale] || {})
  }, [])

  // Find missing keys and auto-translate them
  useEffect(() => {
    if (!mounted || pendingRef.current) return

    const currentTranslations = translations[locale]
    const otherLocale: Locale = locale === "en" ? "de" : "en"
    const otherTranslations = translations[otherLocale]
    const cache = getCache()
    const cached = cache[locale] || {}

    // Find keys that exist in the other locale but not in this one,
    // and aren't already cached
    const missing: { key: string; text: string }[] = []
    for (const key of Object.keys(otherTranslations)) {
      if (!currentTranslations[key] && !cached[key]) {
        missing.push({ key, text: otherTranslations[key] })
      }
    }

    if (missing.length === 0) return

    pendingRef.current = true
    setIsTranslating(true)

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: missing, targetLocale: locale }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.translations) {
          const newCache = getCache()
          newCache[locale] = { ...newCache[locale], ...data.translations }
          setCache(newCache)
          setAutoTranslations((prev) => ({ ...prev, ...data.translations }))
        }
      })
      .catch(() => {
        // Silently fail — manual keys still work
      })
      .finally(() => {
        setIsTranslating(false)
        pendingRef.current = false
      })
  }, [locale, mounted])

  const t = useCallback(
    (key: string): string => {
      // Priority: 1) Manual translation, 2) Auto-translated cache, 3) raw key
      return translations[locale][key] ?? autoTranslations[key] ?? key
    },
    [locale, autoTranslations]
  )

  // Prevent flash of wrong language
  if (!mounted) {
    return (
      <LocaleContext.Provider value={{ locale: "de", setLocale, t, isTranslating: false }}>
        {children}
      </LocaleContext.Provider>
    )
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, isTranslating }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider")
  }
  return context
}
