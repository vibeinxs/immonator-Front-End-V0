"use client"

// Score ring: SVG arc showing 0-10 score with colour-coded stroke.
// Accepts score (0-10), verdict label, and optional sub-text.

const VERDICT_LABEL: Record<string, string> = {
  strong_buy: "STRONG BUY",
  worth_analysing: "ANALYSING",
  proceed_with_caution: "CAUTION",
  avoid: "AVOID",
}

function scoreColor(score: number): string {
  if (score >= 7.5) return "var(--success)"
  if (score >= 5.5) return "var(--warning)"
  return "var(--danger)"
}

function scoreTextClass(score: number): string {
  if (score >= 7.5) return "text-success"
  if (score >= 5.5) return "text-warning"
  return "text-danger"
}

interface VerdictRingProps {
  score: number          // 0–10
  verdict: string        // e.g. "worth_analysing"
  subText?: string       // e.g. confidence label
  size?: number          // px (default 128)
}

export function VerdictRing({
  score,
  verdict,
  subText,
  size = 128,
}: VerdictRingProps) {
  const clamped = Math.max(0, Math.min(10, score))
  const R = (size / 2) * 0.76          // radius (leaves padding)
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * R
  // We draw an arc spanning 270° (starting at 135°, clockwise) so the gap sits at the bottom.
  const arcFraction = 0.75
  const dashTotal = circumference * arcFraction
  const dashFill  = dashTotal * (clamped / 10)
  // Rotate so arc starts at 135° (bottom-left) and goes clockwise.
  const rotateOffset = 135

  const color = scoreColor(clamped)
  const textClass = scoreTextClass(clamped)
  const label = VERDICT_LABEL[verdict] ?? verdict.toUpperCase().replace(/_/g, " ")
  const haloId = `halo-${verdict}-${Math.round(clamped * 10)}`

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Radial glow halo behind arc */}
        <defs>
          <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.13" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R * 1.5} fill={`url(#${haloId})`} />

        {/* Track */}
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={size * 0.09}
          strokeDasharray={`${dashTotal} ${circumference}`}
          strokeLinecap="round"
          strokeDashoffset={0}
          style={{ transform: `rotate(${rotateOffset}deg)`, transformOrigin: "center" }}
        />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.09}
          strokeDasharray={`${dashFill} ${circumference}`}
          strokeLinecap="round"
          strokeDashoffset={0}
          style={{
            transform: `rotate(${rotateOffset}deg)`,
            transformOrigin: "center",
            transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        {/* Score text */}
        <text
          x={cx} y={cy - size * 0.04}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.26}
          fontWeight="800"
          fontFamily="var(--font-mono)"
          fill="var(--text-primary)"
        >
          {clamped.toFixed(1)}
        </text>
        {/* /10 sub-label */}
        <text
          x={cx} y={cy + size * 0.17}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.1}
          fontWeight="500"
          fill="var(--text-muted)"
        >
          / 10
        </text>
      </svg>

      {/* Verdict label */}
      <span
        className={`text-xs font-bold uppercase ${textClass}`}
        style={{ letterSpacing: "0.15em" }}
      >
        {label}
      </span>
      {subText && (
        <span className="text-[10px] text-text-muted">{subText}</span>
      )}
    </div>
  )
}
