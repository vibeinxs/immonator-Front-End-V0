"use client"

import { useLocale } from "@/lib/i18n/locale-context"

interface LandShareBlockProps {
  landSharePct: number
  purchasePrice?: number
}

export function LandShareBlock({ landSharePct, purchasePrice }: LandShareBlockProps) {
  const { t } = useLocale()
  const good = landSharePct >= 20
  const cls = good ? "text-success" : "text-text-muted"

  return (
    <p className={`text-xs font-medium ${cls}`}>
      = {landSharePct.toFixed(1)}% {t("analyse.landShare.ofPurchase")} — {good ? t("analyse.landShare.good") : t("analyse.landShare.low")}
      {purchasePrice != null && (
        <span className="text-text-muted">
          {" "}({t("analyse.landShare.landValue")}: €{Math.round((purchasePrice * landSharePct) / 100).toLocaleString("de-DE")})
        </span>
      )}
    </p>
  )
}
