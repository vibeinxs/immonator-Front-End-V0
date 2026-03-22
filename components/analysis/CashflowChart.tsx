"use client"

import { useLocale } from "@/lib/i18n/locale-context"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { EUR } from "@/lib/utils"

export interface YearData {
  year: number
  cashflow_pre_tax?: number
  cashflow_after_tax?: number
  cashflow_monthly?: number
  equity?: number
  rent?: number
  mortgage?: number
  cumulative_cashflow?: number
}

const TARGET_YEARS = [1, 5, 10, 15, 20]

function pickCashflow(row: YearData): number {
  // Prefer after-tax monthly, then pre-tax monthly, then annual / 12
  const monthly = row.cashflow_monthly ?? null
  if (monthly !== null) return monthly
  if (row.cashflow_after_tax !== undefined) {
    return Math.abs(row.cashflow_after_tax) > 5000
      ? row.cashflow_after_tax / 12
      : row.cashflow_after_tax
  }
  if (row.cashflow_pre_tax !== undefined) {
    return Math.abs(row.cashflow_pre_tax) > 5000
      ? row.cashflow_pre_tax / 12
      : row.cashflow_pre_tax
  }
  return 0
}

interface ChartRow {
  label: string
  value: number
}

function buildChartData(yearData: YearData[]): ChartRow[] {
  return TARGET_YEARS.map((y) => {
    const row = yearData.find((r) => r.year === y)
    return {
      label: `Yr ${y}`,
      value: row ? Math.round(pickCashflow(row)) : 0,
    }
  })
}

function formatEurK(v: number): string {
  if (Math.abs(v) >= 1000) return `${EUR}${(v / 1000).toFixed(1)}k`
  return `${EUR}${Math.round(v)}`
}

// ── Custom bar shape with value label inside ──────────────────────────────────
interface CustomBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
}

function CustomBar({ x = 0, y = 0, width = 0, height = 0, value = 0 }: CustomBarProps) {
  const positive = value >= 0
  const fill = positive ? "var(--success)" : "var(--danger)"
  const absH = Math.abs(height)

  // Show label inside bar only if bar is tall enough to hold the text
  const showLabel = absH > 32
  // For negative bars: anchor at 14px above the bar tip (furthest point from zero)
  // For positive bars: anchor at 14px above the bar base (closest to x-axis)
  const labelY = positive ? y + absH - 14 : y + 14

  // Short format: just the sign + number (no € glyph, avoids font glyph issues)
  const shortLabel = (() => {
    const abs = Math.abs(value)
    const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : String(Math.round(abs))
    return positive ? `+${formatted}` : `-${formatted}`
  })()

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={absH}
        fill={fill}
        fillOpacity={positive ? 0.9 : 0.88}
        rx={5}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.95)"
          fontSize={10}
          fontWeight="700"
          fontFamily="monospace"
        >
          {shortLabel}
        </text>
      )}
    </g>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
interface TooltipPayload {
  value?: number
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const val = payload[0].value ?? 0
  const positive = val >= 0
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-text-secondary">{label}</p>
      <p className={`mt-0.5 font-mono font-bold ${positive ? "text-success" : "text-danger"}`}>
        {positive ? "+" : ""}
        {EUR}
        {val.toLocaleString("de-DE")}/mo
      </p>
    </div>
  )
}

// ── Main chart ─────────────────────────────────────────────────────────────────
interface CashflowChartProps {
  yearData: YearData[]
}

export function CashflowChart({ yearData }: CashflowChartProps) {
  const { t } = useLocale()

  if (!yearData || yearData.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-text-muted">
        {t("analyse.results.noYearData")}
      </div>
    )
  }

  const data = buildChartData(yearData)
  const allZero = data.every((d) => d.value === 0)

  if (allZero) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-text-muted">
        {t("analyse.results.noCashflowData")}
      </div>
    )
  }

  const values = data.map((d) => d.value)
  const minVal = Math.min(...values, 0)
  const maxVal = Math.max(...values, 0)

  // When all values are negative: maxVal = 0.
  // Add headroom above the zero line so the €0 label and reference line are clearly visible.
  // When there are positive values: standard 20% padding above the highest bar.
  const domainTop = maxVal === 0 ? Math.abs(minVal) * 0.15 : maxVal * 1.2
  // Add 20% padding below the most negative value.
  const domainBottom = minVal === 0 ? 0 : minVal * 1.2

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: 4, bottom: 4 }}
          barCategoryGap="30%"
        >
          {/* Horizontal dashed grid lines — reduced opacity so they don't show through bars */}
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="var(--color-border-default, #E2E9F0)"
            strokeOpacity={0.6}
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--color-text-muted, #8296A8)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--color-text-muted, #8296A8)" }}
            tickFormatter={formatEurK}
            domain={[domainBottom, domainTop]}
            width={52}
          />

          <Tooltip content={<CustomTooltip />} cursor={false} />

          {/* Zero reference line — solid, slightly darker than the grid */}
          <ReferenceLine
            y={0}
            stroke="var(--color-border-default, #CBD5E1)"
            strokeWidth={1.5}
          />

          <Bar dataKey="value" shape={<CustomBar />} maxBarSize={52}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.value >= 0 ? "var(--success)" : "var(--danger)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
