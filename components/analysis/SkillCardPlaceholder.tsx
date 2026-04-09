"use client"

import { Brain, Loader2 } from "lucide-react"

interface SkillCardPlaceholderProps {
  title: string
  description: string
  featureDescription: string
  ctaLabel: string
  badge?: string
  actionTestId?: string
  // ── Optional live-state props (wired up when API is connected) ────────────
  /** True while the skill API call is in-flight */
  loading?: boolean
  /** Error message string, if the last run failed */
  error?: string | null
  /** True when a result exists and is ready to view */
  hasResult?: boolean
  /** Callback fired when the CTA button is clicked; if omitted the button stays disabled */
  onRun?: () => void
}

function SkillIcon() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        flexShrink: 0,
        background: "linear-gradient(135deg, #3B7BF5 0%, #5A9FFF 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Brain style={{ width: 18, height: 18, color: "white" }} />
    </div>
  )
}

export function SkillCardPlaceholder({
  title,
  description,
  featureDescription,
  ctaLabel,
  badge,
  actionTestId,
  loading = false,
  error,
  hasResult = false,
  onRun,
}: SkillCardPlaceholderProps) {
  const isInteractive = !!onRun
  const isDisabled = !isInteractive || loading

  const buttonLabel = loading
    ? "Running…"
    : hasResult
      ? "View Result"
      : ctaLabel

  return (
    <section className="rounded-2xl border border-border-default bg-bg-surface">
      <div className="border-b border-border-default px-4 py-3 md:px-5">
        <h2 className="text-sm font-semibold text-text-primary md:text-base">{title}</h2>
        <p className="mt-1 text-xs text-text-muted md:text-sm">{description}</p>
      </div>
      <div className="p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: icon + text */}
          <div className="flex items-start gap-3">
            <SkillIcon />
            <div>
              <p className="text-sm leading-relaxed text-text-secondary">
                {featureDescription}
              </p>
              {badge && (
                <span
                  className="mt-2 inline-flex items-center rounded-full border border-brand/20
                             bg-brand/5 px-2 py-0.5 text-[11px] font-medium text-brand"
                >
                  {badge}
                </span>
              )}
              {error && (
                <p className="mt-2 text-[11px] font-medium text-red-500">{error}</p>
              )}
            </div>
          </div>

          {/* Right: CTA */}
          <button
            disabled={isDisabled}
            onClick={isInteractive && !loading ? onRun : undefined}
            data-testid={actionTestId}
            className={[
              "shrink-0 rounded-lg border px-4 py-2 text-sm font-medium sm:self-start",
              "inline-flex items-center gap-2",
              isDisabled
                ? "cursor-not-allowed border-border-default bg-bg-base text-text-muted opacity-60"
                : "cursor-pointer border-brand/30 bg-brand/5 text-brand hover:bg-brand/10 active:bg-brand/15",
            ].join(" ")}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {buttonLabel}
          </button>
        </div>
      </div>
    </section>
  )
}
