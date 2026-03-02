import type { CSSProperties, ReactNode } from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { LocaleProvider } from "@/lib/i18n/locale-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "Immonator - Smart Real Estate Investment Analysis",
  description:
    "Make confident real estate investment decisions with data-driven analysis. German property market insights, yield calculations, and portfolio tracking.",
}

export const viewport: Viewport = {
  themeColor: "#F8FAFC",
  width: "device-width",
  initialScale: 1,
}

const fallbackFontVars = {
  "--font-dm-sans": "'DM Sans', sans-serif",
  "--font-dm-serif": "'DM Serif Display', serif",
  "--font-jetbrains": "'JetBrains Mono', monospace",
} as CSSProperties

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning={true} style={fallbackFontVars}>
      <body suppressHydrationWarning={true} className="font-sans antialiased">
        <LocaleProvider>{props.children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  )
}
