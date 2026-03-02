import type { Metadata, Viewport } from "next"
import { DM_Sans, DM_Serif_Display, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LocaleProvider } from "@/lib/i18n/locale-context"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
})

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

const cls = `${dmSans.variable} ${dmSerifDisplay.variable} ${jetbrainsMono.variable}`

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning={true} className={cls}>
      <body suppressHydrationWarning={true} className="font-sans antialiased">
        <LocaleProvider>{props.children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  )
}
