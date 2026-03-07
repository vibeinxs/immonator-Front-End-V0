"use client"

import { useMemo, useState } from "react"
import { BookmarkPlus, Check, Loader2 } from "lucide-react"
import { immoApi } from "@/lib/immonatorApi"
import { useLocale } from "@/lib/i18n/locale-context"
import { encodePortfolioSnapshot } from "@/lib/portfolioNotes"
import { UI_STATUS_ORDER, apiToUiStatus, type UiPortfolioStatus, uiToApiStatus } from "@/lib/portfolioStatus"
import type { AnalyseRequest, AnalyseResponse } from "@/types/api"

interface SaveToPortfolioButtonProps {
  input: AnalyseRequest
  result: AnalyseResponse
  titleHint?: string
  existingPortfolioId?: string | null
  existingStatus?: UiPortfolioStatus
  existingSavedAt?: string | null
  onSaved?: (meta: { portfolioId: string; status: UiPortfolioStatus; savedAt?: string | null }) => void
}

function deriveCity(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : ""
}

function deriveTitle(input: AnalyseRequest, hint?: string): string {
  if (hint?.trim()) return hint.trim()
  return input.address || "Saved analysis"
}

export function SaveToPortfolioButton({
  input,
  result,
  titleHint,
  existingPortfolioId,
  existingStatus,
  existingSavedAt,
  onSaved,
}: SaveToPortfolioButtonProps) {
  const { t } = useLocale()
  const [status, setStatus] = useState<UiPortfolioStatus>(existingStatus ?? "watching")
  const [portfolioId, setPortfolioId] = useState<string | null>(existingPortfolioId ?? null)
  const [savedAt, setSavedAt] = useState<string | null>(existingSavedAt ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSaved = !!portfolioId

  const statusOptions = useMemo(
    () => UI_STATUS_ORDER.map((value) => ({ value, label: t(`portfolio.status.${value}`) })),
    [t]
  )

  async function resolvePortfolioIdByProperty(propertyId: string): Promise<{ portfolioId: string; addedAt: string | null } | null> {
    const listRes = await immoApi.getPortfolio()
    if (!listRes.data?.items) return null
    const match = listRes.data.items.find((item) => item.property_id === propertyId)
    if (!match) return null
    return { portfolioId: match.portfolio_id, addedAt: match.added_at }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      let targetPortfolioId = portfolioId
      let createdAt = savedAt

      if (!targetPortfolioId) {
        const manualRes = await immoApi.createManualProperty({
          source: "manual",
          title: deriveTitle(input, titleHint),
          city: deriveCity(input.address),
          price: input.purchase_price,
          size_sqm: input.sqm,
          rooms: Math.max(1, Math.round(input.sqm / 35)),
          year_built: input.year_built,
          estimated_rent: input.rent_monthly,
        })

        if (!manualRes.data?.id) throw new Error(manualRes.error ?? "Failed to create property")

        const watchRes = await immoApi.saveToPortfolio(manualRes.data.id)
        if (!watchRes.data?.success) throw new Error(watchRes.error ?? "Failed to save portfolio")

        const resolved = await resolvePortfolioIdByProperty(manualRes.data.id)
        if (!resolved?.portfolioId) throw new Error("Portfolio item not found after save")

        targetPortfolioId = resolved.portfolioId
        createdAt = resolved.addedAt
      }

      const snapshot = encodePortfolioSnapshot({ input, result, label: titleHint })
      const updateRes = await immoApi.updatePortfolioStatus(targetPortfolioId, uiToApiStatus(status), snapshot, input.purchase_price)
      if (!updateRes.data?.success) throw new Error(updateRes.error ?? "Failed to update status")

      setPortfolioId(targetPortfolioId)
      setSavedAt(createdAt ?? new Date().toISOString())
      onSaved?.({ portfolioId: targetPortfolioId, status, savedAt: createdAt ?? new Date().toISOString() })
      window.dispatchEvent(new CustomEvent("portfolio:changed"))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("portfolio.save.genericError"))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (nextStatus: UiPortfolioStatus) => {
    setStatus(nextStatus)
    if (!portfolioId) return

    setSaving(true)
    setError(null)
    try {
      const snapshot = encodePortfolioSnapshot({ input, result, label: titleHint })
      const updateRes = await immoApi.updatePortfolioStatus(portfolioId, uiToApiStatus(nextStatus), snapshot, input.purchase_price)
      if (!updateRes.data?.success) throw new Error(updateRes.error ?? "Failed to update status")
      onSaved?.({ portfolioId, status: nextStatus, savedAt })
      window.dispatchEvent(new CustomEvent("portfolio:changed"))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("portfolio.save.genericError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-brand/50 hover:text-brand disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isSaved ? <Check className="h-4 w-4 text-success" /> : <BookmarkPlus className="h-4 w-4" />}
          {isSaved ? t("portfolio.save.saved") : t("portfolio.save.cta")}
        </button>

        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as UiPortfolioStatus)}
          className="rounded-lg border border-border-default bg-bg-surface px-2.5 py-2 text-xs font-semibold text-text-primary outline-none focus:border-brand"
          disabled={saving}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {savedAt && <span className="text-xs text-text-muted">{t("portfolio.save.savedAt")} {new Date(savedAt).toLocaleString()}</span>}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
