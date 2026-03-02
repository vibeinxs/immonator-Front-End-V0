import { cn } from "@/lib/utils"

type Verdict = "strong_buy" | "worth_analysing" | "proceed_with_caution" | "avoid"

const verdictConfig: Record<
  Verdict,
  { label: string; bgClass: string; textClass: string }
> = {
  strong_buy: {
    label: "Strong Buy",
    bgClass: "bg-success-bg",
    textClass: "text-success",
  },
  worth_analysing: {
    label: "Worth Analysing",
    bgClass: "bg-brand-subtle",
    textClass: "text-brand",
  },
  proceed_with_caution: {
    label: "Proceed with Caution",
    bgClass: "bg-warning-bg",
    textClass: "text-warning",
  },
  avoid: {
    label: "Avoid",
    bgClass: "bg-danger-bg",
    textClass: "text-danger",
  },
}

interface VerdictBadgeProps {
  verdict: Verdict
  className?: string
}

export function VerdictBadge({ verdict, className }: VerdictBadgeProps) {
  const config = verdictConfig[verdict]

  return (
    <span
      className={cn(
        "inline-block animate-pulse-badge rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em]",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {config.label}
    </span>
  )
}
