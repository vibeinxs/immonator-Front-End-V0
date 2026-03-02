"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"

type Sentiment = "positive" | "negative" | "neutral"

interface MetricCardProps {
  label: string
  value: string | number
  prefix?: string
  suffix?: string
  context?: string
  sentiment?: Sentiment
  className?: string
}

function useCountUp(target: number, duration: number = 800) {
  const [current, setCurrent] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true

    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return { current, ref }
}

const sentimentColor: Record<Sentiment, string> = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-text-secondary",
}

export function MetricCard({
  label,
  value,
  prefix = "",
  suffix = "",
  context,
  sentiment = "neutral",
  className,
}: MetricCardProps) {
  const numericValue = typeof value === "number" ? value : parseFloat(value)
  const isNumeric = !isNaN(numericValue)
  const { current, ref } = useCountUp(isNumeric ? numericValue : 0)

  return (
    <div
      className={cn(
        "rounded-[14px] border border-border-default bg-bg-surface p-6 transition-colors duration-150 hover:border-border-strong",
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
        {label}
      </p>
      <p className="mt-2 font-mono text-[32px] leading-tight text-text-primary animate-count-up">
        {prefix}
        <span ref={ref}>{isNumeric ? current.toLocaleString("de-DE") : value}</span>
        {suffix}
      </p>
      {context && (
        <p className={cn("mt-3 text-xs", sentimentColor[sentiment])}>
          {context}
        </p>
      )}
    </div>
  )
}
