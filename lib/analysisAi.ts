import type { AskAiContextPayload } from "@/types/analyseView"
import type { AnalyseResponse } from "@/types/api"

interface StructuredAiAnalysisSection {
  title?: string | null
  body?: string | null
  content?: string | null
  bullets?: string[] | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toTextLines(value: unknown): string[] {
  if (typeof value !== "string") return []

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === "string") return JSON.stringify(value)
  if (typeof value === "number" || typeof value === "boolean") return String(value)

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`
  }

  if (!isRecord(value)) return JSON.stringify(value)

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`
}

function hashString(value: string): string {
  let hash = 2166136261

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function compactResultSnapshot(result: AnalyseResponse | null | undefined) {
  if (!result) return null

  return {
    address_resolved: result.address_resolved ?? null,
    score: result.score,
    verdict: result.verdict,
    net_yield_pct: result.net_yield_pct,
    cash_flow_monthly_yr1: result.cash_flow_monthly_yr1,
    irr_10: result.irr_10,
    kpf: result.kpf,
  }
}

export function buildAnalysisChatContextId(context: AskAiContextPayload): string {
  const seed = stableSerialize({
    mode: context.mode,
    selectedProperty: context.selectedProperty,
    propertyInputs: context.propertyInputs,
    propertyResults: {
      A: compactResultSnapshot(context.propertyResults.A ?? null),
      B: compactResultSnapshot(context.propertyResults.B ?? null),
    },
  })

  return `analysis:${context.mode}:${hashString(seed)}`
}

export function getAiAnalysisLines(
  result: AnalyseResponse,
  fallbackLines: string[]
): string[] {
  const aiAnalysis = result.ai_analysis

  if (typeof aiAnalysis === "string") {
    const lines = toTextLines(aiAnalysis)
    return lines.length > 0 ? lines : fallbackLines
  }

  if (!isRecord(aiAnalysis)) return fallbackLines

  const summaryLines = toTextLines(aiAnalysis.summary)
  const sectionLines = Array.isArray(aiAnalysis.sections)
    ? aiAnalysis.sections.flatMap((section) => {
        if (!isRecord(section)) return []

        const typedSection = section as StructuredAiAnalysisSection
        const title = typeof typedSection.title === "string" ? typedSection.title.trim() : ""
        const body = [typedSection.body, typedSection.content]
          .flatMap((entry) => toTextLines(entry))
        const bullets = Array.isArray(typedSection.bullets)
          ? typedSection.bullets
              .filter((bullet): bullet is string => typeof bullet === "string")
              .map((bullet) => bullet.trim())
              .filter(Boolean)
              .map((bullet) => `• ${bullet}`)
          : []

        return [title, ...body, ...bullets].filter(Boolean)
      })
    : []
  const rawTextLines = toTextLines(aiAnalysis.raw_text)

  const lines = [...summaryLines, ...sectionLines, ...rawTextLines]
  return lines.length > 0 ? lines : fallbackLines
}
