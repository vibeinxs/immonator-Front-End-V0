"use client"

import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n/locale-context"

type Verdict = "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"

const verdictStyle: Record<
  Verdict,
  { bgClass: string; textClass: string }
> = {
  strong_buy: {
    bgClass: "bg-success-bg",
    textClass: "text-success",
  },
  worth_analysing: {
    bgClass: "bg-brand-subtle",
    textClass: "text-brand",
  },
  proceed_with_caution: {
    bgClass: "bg-warning-bg",
    textClass: "text-warning",
  },
  avoid: {
    bgClass: "bg-danger-bg",
    textClass: "text-danger",
  },
}

interface VerdictBadgeProps {
  verdict: Verdict
  className?: string
}

export function VerdictBadge({ verdict, className }: VerdictBadgeProps) {
  const { t } = useLocale()
  const style = verdictStyle[verdict]

  return (
    <span
      className={cn(
        "inline-block animate-pulse-badge rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em]",
        style.bgClass,
        style.textClass,
        className
      )}
    >
      {t(`verdict.${verdict}`)}
    </span>
  )
}
