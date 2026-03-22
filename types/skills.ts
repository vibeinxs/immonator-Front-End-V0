// ─── Skill Result Types ────────────────────────────────────────────────────────
// Shapes returned by POST /analysis/run and POST /strategy/run.
// raw?: string captures the full AI markdown output for flexible rendering.
// All fields are kept optional where the backend may omit them; required fields
// are those guaranteed by the skill output_schema.json contracts.

// ── Intelligent Property Snapshot (mode: "compact") ──────────────────────────

export interface SnapshotResult {
  /** Investment grade, e.g. "B+" */
  grade: string
  /** Verdict label, e.g. "STRONG BUY" */
  verdict: string
  /** Location quality rating, e.g. "Very Good" */
  location_rating: string
  /** Top 2 property strengths */
  strengths: string[]
  /** Top 2 property risks */
  risks: string[]
  /** One-line deal summary */
  one_line_summary?: string | null
  /** Full AI markdown output (fallback renderer) */
  raw?: string
}

// ── Investment Review (mode: "full") ─────────────────────────────────────────

export interface ReviewResult {
  /** Concise property facts paragraph */
  property_facts?: string
  /** Derived financial metrics narrative */
  derived_metrics?: string
  /** Location & market analysis */
  location_analysis?: string
  /** Deal economics summary */
  deal_economics?: string
  /** List of deal strengths */
  strengths: string[]
  /** List of deal risks */
  risks: string[]
  /** Sensitivity / scenario points */
  sensitivity_points: string[]
  /** Final AI verdict */
  verdict: string
  /** Full AI markdown output (fallback renderer) */
  raw?: string
}

// ── Buying Strategy Insight ───────────────────────────────────────────────────

export interface StrategyResult {
  /** Recommended initial offer price (€) */
  recommended_offer: number
  /** Maximum price before walking away (€) */
  walk_away_ceiling: number
  /** Negotiation leverage points */
  leverage_points: string[]
  /** Due diligence priorities */
  due_diligence_priorities: string[]
  /** Red flags to raise with the seller */
  red_flags: string[]
  /** Full AI markdown output (fallback renderer) */
  raw?: string
}
