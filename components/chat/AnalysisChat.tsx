"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { ChevronDown, Brain, Loader2, Send } from "lucide-react"
import { immoApi } from "@/lib/immonatorApi"
import type {
  AnalysisContextPayload,
  ChatRequest,
  ConversationMessage,
  PropertySkillContextPayload,
} from "@/types/api"
import { copy } from "@/lib/copy"
import { TEST_IDS } from "@/lib/test-ids"
import { useToast } from "@/hooks/use-toast"

type ChatMessage = Pick<ConversationMessage, "role" | "message">

type PropertySkillContextInput = Omit<PropertySkillContextPayload, "mode" | "history">

const SUGGESTION_CHIPS = copy.chat.suggestions

function buildPropertySkillPayload({
  propertySkillContext,
  advisorMode,
  history,
}: {
  propertySkillContext?: PropertySkillContextInput
  advisorMode: "light" | "full"
  history: ChatMessage[]
}): Pick<ChatRequest, "property" | "analysis_result" | "strategy_result" | "history" | "mode"> {
  if (!propertySkillContext) return {}

  return {
    property: propertySkillContext.property,
    ...(propertySkillContext.analysis_result !== undefined
      ? { analysis_result: propertySkillContext.analysis_result }
      : {}),
    ...(propertySkillContext.strategy_result !== undefined
      ? { strategy_result: propertySkillContext.strategy_result }
      : {}),
    history,
    mode: advisorMode,
  }
}

// ── AI avatar ─────────────────────────────────────────────────────────────────
function AiAvatar({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.35,
        background: "linear-gradient(135deg, #3B7BF5 0%, #5A9FFF 100%)",
        flexShrink: 0,
      }}
    >
      <Brain style={{ width: size * 0.55, height: size * 0.55, color: "white" }} />
    </div>
  )
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <AiAvatar size={24} />
      <div
        className="flex gap-1 rounded-2xl rounded-bl-sm border border-border-default bg-bg-surface px-4 py-3"
        style={{ marginTop: "2px" }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-brand/50"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({
  allChips,
  onChipClick,
  streaming,
}: {
  allChips: string[]
  onChipClick: (chip: string) => void
  streaming: boolean
}) {
  return (
    <div>
      {/* Quick-start chips */}
      {allChips.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">
            Quick questions
          </p>
          <div className="flex flex-wrap gap-2">
            {allChips.map((chip) => (
              <button
                key={chip}
                onClick={() => onChipClick(chip)}
                disabled={streaming}
                className="rounded-full border border-border-default bg-bg-surface px-3.5 py-1.5 text-xs text-text-secondary transition-all hover:border-brand hover:bg-brand/5 hover:text-brand disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AnalysisChat({
  contextType,
  contextId,
  analysisContext,
  propertySkillContext,
  title,
  promptHints = [],
  advisorMode = "full",
  activationKey = 0,
}: {
  contextType: string
  contextId?: string
  /**
   * Required when contextType is "analysis_single" or "analysis_compare".
   * Forwarded as analysis_context on every chat turn so the backend AI agent
   * has the current property snapshot.
   */
  analysisContext?: AnalysisContextPayload
  propertySkillContext?: PropertySkillContextInput
  title: string
  promptHints?: string[]
  advisorMode?: "light" | "full"
  activationKey?: number
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(true) // Start open so users discover the chat
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyReloadKey, setHistoryReloadKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const abortedRef = useRef(false)

  // Merge analysis-specific hints + generic suggestions for the empty state
  const allChips = [...promptHints, ...SUGGESTION_CHIPS]

  // Load history for the active context
  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(null)
    setMessages([])

    immoApi
      .getChatHistory(contextType, contextId)
      .then(({ data, error }) => {
        if (cancelled) return

        setHistoryLoading(false)

        if (data?.messages) {
          setMessages(data.messages)
          return
        }
        if (error) {
          setHistoryError(error)
          toast({ title: copy.chat.errorGeneric, variant: "destructive" })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryLoading(false)
          setHistoryError(copy.chat.errorNetwork)
          toast({ title: copy.chat.errorNetwork, variant: "destructive" })
        }
      })
    return () => {
      cancelled = true
    }
  }, [contextType, contextId, toast, historyReloadKey])

  // Cancel in-flight stream on unmount
  useEffect(() => {
    abortedRef.current = false
    return () => {
      abortedRef.current = true
      readerRef.current?.cancel().catch(() => {})
    }
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (activationKey === 0) return

    setOpen(true)
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [activationKey])

  const retryLoadHistory = useCallback(() => {
    setHistoryReloadKey((value) => value + 1)
  }, [])

  const popLastMessage = useCallback(() => setMessages((prev) => prev.slice(0, -1)), [])

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return

      setMessages((prev) => [...prev, { role: "user", message: text.trim() }])
      setInput("")
      setStreaming(true)
      setMessages((prev) => [...prev, { role: "assistant", message: "" }])

      try {
        const nextHistory = [...messages, { role: "user", message: text.trim() }]
        const chatRequest: ChatRequest = {
          message: text.trim(),
          context_type: contextType,
          context_id: contextId,
          ...(analysisContext !== undefined ? { analysis_context: analysisContext } : {}),
          // Backend ChatRequest (PR #63) expects these at the top level — not
          // inside a property_skill_context wrapper.
          ...buildPropertySkillPayload({
            propertySkillContext,
            advisorMode,
            history: nextHistory,
          }),
        }

        const res = await immoApi.sendChatMessage(chatRequest)

        if (!res) {
          popLastMessage()
          setStreaming(false)
          toast({ title: copy.chat.errorNetwork, variant: "destructive" })
          return
        }

        if (!res.ok || !res.body) {
          popLastMessage()
          setStreaming(false)
          toast({ title: copy.chat.errorGeneric, variant: "destructive" })
          return
        }

        const reader = res.body.getReader()
        readerRef.current = reader
        const decoder = new TextDecoder()
        let buffer = ""
        let fullContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done || abortedRef.current) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const jsonStr = trimmed.slice(5).trim()
            if (jsonStr === "[DONE]") continue
            try {
              const parsed = JSON.parse(jsonStr)
              if (parsed.content) {
                fullContent += parsed.content
                setMessages((prev) => {
                  const msgs = [...prev]
                  msgs[msgs.length - 1] = { role: "assistant", message: fullContent }
                  return msgs
                })
              }
            } catch {
              /* skip invalid JSON */
            }
          }
        }
      } catch {
        if (!abortedRef.current) {
          popLastMessage()
          toast({ title: copy.chat.errorNetwork, variant: "destructive" })
        }
      }

      if (!abortedRef.current) setStreaming(false)
      readerRef.current = null
    },
    [
      streaming,
      messages,
      contextType,
      contextId,
      analysisContext,
      propertySkillContext,
      advisorMode,
      toast,
      popLastMessage,
    ],
  )

  const handleSendInput = useCallback(() => send(input), [send, input])

  const isEmpty = messages.length === 0
  const isTyping =
    streaming && messages.length > 0 && messages[messages.length - 1].message === ""
  const requiresPropertySkillContext = propertySkillContext !== undefined
  const hasContextData = Boolean(propertySkillContext?.property)
  const advisorCopy = copy.chat.advisor[advisorMode]

  return (
    <div
      ref={containerRef}
      data-testid={TEST_IDS.AI_ADVISOR_CHAT}
      className="overflow-hidden rounded-xl border border-border-default bg-bg-surface"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-bg-base"
      >
        <div className="flex items-center gap-3">
          <AiAvatar size={30} />
          <div className="text-left">
            <p className="text-sm font-semibold text-text-primary">Advisor</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] text-text-muted capitalize">{title}</p>
              <span className="rounded-full border border-brand/20 bg-brand/5 px-2 py-0.5 text-[10px] font-medium text-brand">
                {advisorCopy.badge}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-muted">{advisorCopy.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streaming && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: "rgba(59,123,245,0.10)",
                color: "#3B7BF5",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-brand"
                style={{ animation: "pulse 1s ease-in-out infinite" }}
              />
              Thinking…
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* ── Expanded body ──────────────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-border-default">
          {/* Message / empty-state area */}
          <div
            ref={scrollRef}
            className="max-h-80 overflow-y-auto p-4"
            style={{ background: "var(--color-bg-base, #F8FAFC)" }}
          >
            {historyLoading ? (
              <div className="flex min-h-40 items-center justify-center">
                <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-4 py-3 text-sm text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  <span>Loading conversation…</span>
                </div>
              </div>
            ) : historyError ? (
              <div className="flex min-h-40 items-center justify-center">
                <div className="max-w-md rounded-2xl border border-warning/30 bg-warning/10 px-4 py-4 text-sm text-warning">
                  <p className="font-semibold text-text-primary">Couldn&apos;t load this chat yet.</p>
                  <p className="mt-1">{historyError}</p>
                  <button
                    type="button"
                    onClick={retryLoadHistory}
                    className="mt-3 inline-flex rounded-lg border border-warning/30 bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-base"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col gap-4">
                <div
                  className="flex items-start gap-3 rounded-2xl rounded-bl-sm p-4"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,123,245,0.07) 0%, rgba(59,123,245,0.03) 100%)",
                    border: "1px solid rgba(59,123,245,0.14)",
                  }}
                >
                  <AiAvatar size={32} />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{advisorCopy.emptyStateTitle}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      {!requiresPropertySkillContext || hasContextData
                        ? advisorCopy.emptyStateDescription
                        : "Run the property analysis first to load advisor context for this chat."}
                    </p>
                  </div>
                </div>

                {!requiresPropertySkillContext || hasContextData ? (
                  <EmptyState allChips={allChips} onChipClick={send} streaming={streaming} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface px-4 py-5 text-sm text-text-secondary">
                    The advisor is ready, but it does not have property skill context yet.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {/* AI avatar — only for assistant messages */}
                    {msg.role === "assistant" && msg.message && <AiAvatar size={22} />}

                    <div
                      className={
                        msg.role === "user"
                          ? "max-w-[75%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-white"
                          : "max-w-[82%] rounded-2xl rounded-bl-sm border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-primary"
                      }
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      {msg.role === "assistant" && msg.message && (
                        <p className="mt-1 text-[10px] text-text-muted/70">
                          {copy.analysis.aiLabel}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && <TypingIndicator />}
              </div>
            )}
          </div>

          {/* Quick chips above input — shown when there are messages (for follow-ups) */}
          {!isEmpty && promptHints.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border-default bg-bg-surface px-4 py-2.5">
              {promptHints.slice(0, 4).map((hint) => (
                <button
                  key={hint}
                  onClick={() => send(hint)}
                  disabled={streaming}
                  className="rounded-full border border-border-default bg-bg-base px-3 py-1 text-[11px] text-text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-center gap-2 border-t border-border-default bg-bg-surface p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendInput()
                }
              }}
              disabled={streaming || historyLoading || Boolean(historyError)}
              placeholder={advisorCopy.inputPlaceholder}
              className="flex-1 rounded-xl border border-border-default bg-bg-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 disabled:opacity-50"
            />
            <button
              onClick={handleSendInput}
              disabled={streaming || historyLoading || Boolean(historyError) || !input.trim()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
