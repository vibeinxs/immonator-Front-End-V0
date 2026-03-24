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
      label: `Year ${y}`,
      value: row ? Math.round(pickCashflow(row)) : 0,
    }
  })
}

function formatEurK(v: number): string {
  if (Math.abs(v) >= 1000) return `${EUR}${(v / 1000).toFixed(1)}k`
  return `${EUR}${Math.round(v)}`
}

// ── Custom bar shape ───────────────────────────────────────────────────────────
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
    <div className="h-64 w-full md:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 8, bottom: 14 }}
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
            interval={0}
            tickMargin={10}
            tick={{ fontSize: 11, fill: "var(--color-text-muted, #8296A8)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickMargin={6}
            tick={{ fontSize: 10, fill: "var(--color-text-muted, #8296A8)" }}
            tickFormatter={formatEurK}
            domain={[domainBottom, domainTop]}
            width={58}
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
