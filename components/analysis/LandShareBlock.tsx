"use client"

import { useLocale } from "@/lib/i18n/locale-context"

interface LandShareBlockProps {
  landSharePct: number
  purchasePrice?: number
}

export function LandShareBlock({ landSharePct, purchasePrice }: LandShareBlockProps) {
  const { t } = useLocale()
  const good = landSharePct >= 20
  const cls = good ? "text-success" : "text-text-secondary"
  const landValue = purchasePrice != null ? Math.round((purchasePrice * landSharePct) / 100) : null

  return (
    <div className="space-y-1.5">
      <p className={`text-sm font-medium leading-relaxed ${cls}`}>
        {landSharePct.toFixed(1)}% {t("analyse.landShare.ofPurchase")}. {good ? t("analyse.landShare.good") : t("analyse.landShare.low")}
      </p>
      {landValue != null && (
        <p className="text-xs text-text-muted">
          {t("analyse.landShare.landValue")}: €{landValue.toLocaleString("de-DE")}
        </p>
      )}
    </div>
  )
}
