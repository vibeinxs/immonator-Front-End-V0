"use client"

interface LandShareBlockProps {
  landSharePct: number
  purchasePrice?: number
}

export function LandShareBlock({ landSharePct, purchasePrice }: LandShareBlockProps) {
  const good = landSharePct >= 20
  const cls = good ? "text-success" : "text-text-muted"

  return (
    <p className={`text-xs font-medium ${cls}`}>
      = {landSharePct.toFixed(1)}% of purchase price —{" "}
      {good ? "good AfA advantage" : "low AfA advantage"}
      {purchasePrice != null && (
        <span className="text-text-muted">
          {" "}(land value: €{Math.round((purchasePrice * landSharePct) / 100).toLocaleString("de-DE")})
        </span>
      )}
    </p>
  )
}
