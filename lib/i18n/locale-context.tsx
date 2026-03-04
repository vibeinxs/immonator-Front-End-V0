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
import { translateTexts } from "@/lib/immonatorApi"

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  isTranslating: boolean
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "de",
  setLocale: () => {},
  t: (key: string) => translations.de[key] ?? key,
  isTranslating: false,
})

const STORAGE_KEY = "immo_locale"
const CACHE_KEY = "immo_auto_translations"

function getCache(): Record<string, Record<string, string>> {
  if (typeof window === "undefined") return { en: {}, de: {} }
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : { en: {}, de: {} }
  } catch {
    return { en: {}, de: {} }
  }
}

function setCache(cache: Record<string, Record<string, string>>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* localStorage full or unavailable */
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("de")
  const [autoTranslations, setAutoTranslations] = useState<
    Record<string, string>
  >({})
  const [isTranslating, setIsTranslating] = useState(false)
  const pendingRef = useRef(false)
  const didInit = useRef(false)

  // Read stored locale on mount
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored === "en" || stored === "de") {
        setLocaleState(stored)
      }
      const cache = getCache()
      const loc = stored || "de"
      if (cache[loc]) {
        setAutoTranslations(cache[loc])
      }
    } catch {
      /* SSR or localStorage unavailable */
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
      document.documentElement.lang = newLocale
    } catch {
      /* ignore */
    }
    const cache = getCache()
    setAutoTranslations(cache[newLocale] || {})
  }, [])

  // Auto-translate missing keys
  useEffect(() => {
    if (pendingRef.current) return

    const currentTranslations = translations[locale]
    const otherLocale: Locale = locale === "en" ? "de" : "en"
    const otherTranslations = translations[otherLocale]
    const cached = getCache()[locale] || {}

    const missing: { key: string; text: string }[] = []
    for (const key of Object.keys(otherTranslations)) {
      if (!currentTranslations[key] && !cached[key]) {
        missing.push({ key, text: otherTranslations[key] })
      }
    }

    if (missing.length === 0) return

    pendingRef.current = true
    setIsTranslating(true)

    translateTexts({ texts: missing, targetLocale: locale })
      .then(({ data, error }) => {
        if (error) { console.error(error); return }
        if (data?.translations) {
          const newCache = getCache()
          newCache[locale] = { ...newCache[locale], ...data.translations }
          setCache(newCache)
          setAutoTranslations((prev) => ({ ...prev, ...data.translations }))
        }
      })
      .finally(() => {
        setIsTranslating(false)
        pendingRef.current = false
      })
  }, [locale])

  const t = useCallback(
    (key: string): string => {
      return translations[locale][key] ?? autoTranslations[key] ?? key
    },
    [locale, autoTranslations]
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, isTranslating }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
