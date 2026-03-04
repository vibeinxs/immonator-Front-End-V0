"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
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
    // If magnitude > 5000 it's probably annual
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

interface CustomBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
}

function CustomBar(props: CustomBarProps) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props
  const positive = value >= 0
  const fill = positive ? "var(--success)" : "var(--danger)"
  const opacity = positive ? 0.85 : 0.7
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={Math.abs(height)}
      fill={fill}
      fillOpacity={opacity}
      rx={4}
    />
  )
}

function formatEurK(v: number): string {
  if (Math.abs(v) >= 1000)
    return `${EUR}${(v / 1000).toFixed(1)}k`
  return `${EUR}${Math.round(v)}`
}

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

interface CashflowChartProps {
  yearData: YearData[]
}

export function CashflowChart({ yearData }: CashflowChartProps) {
  if (!yearData || yearData.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-text-muted">
        No year data available
      </div>
    )
  }

  const data = buildChartData(yearData)
  const allZero = data.every((d) => d.value === 0)

  if (allZero) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-text-muted">
        Cashflow data not yet available
      </div>
    )
  }

  const values = data.map((d) => d.value)
  const minVal = Math.min(...values, 0)
  const maxVal = Math.max(...values, 0)

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="var(--color-border)"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickFormatter={formatEurK}
            domain={[minVal * 1.15, maxVal * 1.15]}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          {/* Zero reference line */}
          {minVal < 0 && (
            <CartesianGrid
              horizontal={false}
              strokeDasharray="0"
              stroke="var(--color-border)"
            />
          )}
          <Bar dataKey="value" shape={<CustomBar />} maxBarSize={48}>
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
