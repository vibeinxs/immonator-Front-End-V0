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
const Y_AXIS_MIN_PADDING = 80
const Y_AXIS_MIN_TOP_PADDING_NEGATIVE_ONLY = 120
const Y_AXIS_PADDING_RATIO = 0.1
const Y_AXIS_TOP_PADDING_RATIO_NEGATIVE_ONLY = 0.18

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
  const rounded = Math.round(v)
  const abs = Math.abs(rounded)
  const formatted = abs.toLocaleString("de-DE")
  return rounded < 0 ? `-${EUR}${formatted}` : `${EUR}${formatted}`
}

function getNiceStep(range: number, targetTicks = 4): number {
  if (range <= 0) return 100
  const rough = range / targetTicks
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const residual = rough / magnitude

  if (residual <= 1) return magnitude
  if (residual <= 2) return 2 * magnitude
  if (residual <= 5) return 5 * magnitude
  return 10 * magnitude
}

function buildTicks(bottom: number, top: number): number[] {
  const span = Math.max(top - bottom, 1)
  const step = getNiceStep(span, 4)
  const tickMin = Math.floor(bottom / step) * step
  const tickMax = Math.ceil(top / step) * step
  const ticks: number[] = []

  for (let tick = tickMin; tick <= tickMax; tick += step) {
    ticks.push(tick)
  }

  if (!ticks.includes(0)) ticks.push(0)
  return ticks.sort((a, b) => a - b)
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
  const amount = formatEurK(val)
  return (
    <div className="rounded-md border border-border-default bg-bg-surface px-2 py-1.5 shadow-sm">
      <p className="text-[11px] font-medium text-text-secondary">{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-text-primary">
        {amount} per month
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

  const span = Math.max(maxVal - minVal, 1)
  const bottomPadding = Math.max(Y_AXIS_MIN_PADDING, span * Y_AXIS_PADDING_RATIO)
  const topPadding = maxVal <= 0
    ? Math.max(
        Y_AXIS_MIN_TOP_PADDING_NEGATIVE_ONLY,
        Math.abs(minVal) * Y_AXIS_TOP_PADDING_RATIO_NEGATIVE_ONLY
      )
    : Math.max(Y_AXIS_MIN_PADDING, span * Y_AXIS_PADDING_RATIO)
  const domainBottom = minVal < 0 ? minVal - bottomPadding : -topPadding
  const domainTop = maxVal > 0 ? maxVal + topPadding : topPadding
  const ticks = buildTicks(domainBottom, domainTop)

  return (
    <div className="h-[260px] w-full md:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: 2, bottom: 28 }}
          barCategoryGap="40%"
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="var(--color-border-default, #E2E9F0)"
            strokeOpacity={0.45}
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={0}
            tickMargin={14}
            tick={{ fontSize: 11, fill: "var(--color-text-muted, #8296A8)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tick={{ fontSize: 10, fill: "var(--color-text-muted, #8296A8)" }}
            tickFormatter={formatEurK}
            domain={[domainBottom, domainTop]}
            ticks={ticks}
            width={68}
          />

          <Tooltip content={<CustomTooltip />} cursor={false} />

          <ReferenceLine
            y={0}
            stroke="var(--color-text-secondary, #6B7D8F)"
            strokeWidth={1.5}
            strokeOpacity={0.8}
          />

          <Bar dataKey="value" shape={<CustomBar />} maxBarSize={36}>
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
