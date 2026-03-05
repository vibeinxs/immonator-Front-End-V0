import { EUR } from "@/lib/utils"

/**
 * Format a number as Euro currency: € 2 400
 * Uses narrow no-break space (U+202F) as thousands separator.
 */
export function formatEUR(value: number, decimals = 0): string {
  const sign = value < 0 ? "-" : ""
  return (
    sign +
    EUR +
    "\u202f" +
    Math.abs(value).toLocaleString("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  )
}

/**
 * Format a number as a percentage: 3,5 %
 * Input is already in percentage points (e.g. 3.5 means 3.5%).
 */
export function formatPct(value: number, decimals = 1): string {
  return value.toFixed(decimals).replace(".", ",") + "\u202f%"
}

/**
 * Format a number as a multiple: 2,3 ×
 */
export function formatX(value: number, decimals = 1): string {
  return value.toFixed(decimals).replace(".", ",") + "\u202f×"
}

/**
 * Format with sign prefix: +3,5 % or -1,2 %
 */
export function formatPctDelta(value: number, decimals = 1): string {
  const sign = value >= 0 ? "+" : ""
  return sign + value.toFixed(decimals).replace(".", ",") + "\u202f%"
}

/**
 * Format EUR delta with sign: +€ 120 or -€ 45
 */
export function formatEURDelta(value: number, decimals = 0): string {
  const sign = value >= 0 ? "+" : "-"
  return (
    sign +
    EUR +
    "\u202f" +
    Math.abs(value).toLocaleString("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  )
}

/**
 * Format multiple delta with sign: +0,2 × or -0,1 ×
 */
export function formatXDelta(value: number, decimals = 1): string {
  const sign = value >= 0 ? "+" : ""
  return sign + value.toFixed(decimals).replace(".", ",") + "\u202f×"
}
