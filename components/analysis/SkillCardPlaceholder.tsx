"use client"

import { Brain } from "lucide-react"

interface SkillCardPlaceholderProps {
  title: string
  description: string
  featureDescription: string
  ctaLabel: string
  badge?: string
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
}: SkillCardPlaceholderProps) {
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
            </div>
          </div>

          {/* Right: disabled CTA */}
          <button
            disabled
            className="shrink-0 cursor-not-allowed rounded-lg border border-border-default
                       bg-bg-base px-4 py-2 text-sm font-medium text-text-muted
                       opacity-60 sm:self-start"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  )
}
