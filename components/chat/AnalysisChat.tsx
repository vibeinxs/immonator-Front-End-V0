"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { ChevronDown, ArrowRight } from "lucide-react"
import { immoApi } from "@/lib/immonatorApi"
import { copy } from "@/lib/copy"
import { useToast } from "@/hooks/use-toast"

interface ChatMessage {
  role: "user" | "assistant"
  message: string
}

const SUGGESTION_CHIPS = copy.chat.suggestions

export function AnalysisChat({
  contextType,
  contextId,
  title,
}: {
  contextType: string
  contextId?: string
  title: string
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [didLoadHistory, setDidLoadHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const abortedRef = useRef(false)

  // Load history on mount
  useEffect(() => {
    if (didLoadHistory) return
    setDidLoadHistory(true)
    immoApi
      .getChatHistory(contextType, contextId)
      .then(({ data }) => {
        if (data?.messages) setMessages(data.messages as ChatMessage[])
      })
      .catch(() => {})
  }, [contextType, contextId, didLoadHistory])

  // Cancel any in-flight stream on unmount
  useEffect(() => {
    abortedRef.current = false
    return () => {
      abortedRef.current = true
      readerRef.current?.cancel().catch(() => {})
    }
  }, [])

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return

      setMessages((prev) => [...prev, { role: "user", message: text.trim() }])
      setInput("")
      setStreaming(true)
      setMessages((prev) => [...prev, { role: "assistant", message: "" }])

      try {
        const res = await immoApi.sendChatMessage({
          message: text.trim(),
          context_type: contextType,
          context_id: contextId,
        })

        if (!res) {
          setStreaming(false)
          toast({ title: copy.chat.errorNetwork, variant: "destructive" })
          return
        }

        if (!res.ok || !res.body) {
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
          toast({ title: copy.chat.errorNetwork, variant: "destructive" })
        }
      }

      if (!abortedRef.current) setStreaming(false)
      readerRef.current = null
    },
    [streaming, contextType, contextId, toast]
  )

  return (
    <div className="rounded-xl border border-border bg-white">
      {/* Header — click to toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-t-xl border-b border-border bg-white p-4 transition-colors hover:bg-bg-hover"
      >
        <span className="text-sm font-semibold text-text-primary">
          {copy.chat.headerPrefix} {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded panel */}
      {open && (
        <div>
          {/* Message area */}
          <div
            ref={scrollRef}
            className="max-h-96 space-y-3 overflow-y-auto bg-bg-base/50 p-4"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex animate-fade-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: "0ms" }}
              >
                <div
                  className={
                    msg.role === "user"
                      ? "max-w-[75%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-white"
                      : "max-w-[82%] rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-2.5 text-sm text-text-primary"
                  }
                >
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  {msg.role === "assistant" && msg.message && (
                    <p className="mt-1 text-[11px] text-text-muted">{copy.analysis.aiLabel}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator — 3 animated dots while empty assistant message is streaming */}
            {streaming &&
              messages.length > 0 &&
              messages[messages.length - 1].message === "" && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Suggestion chips — empty state only */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border bg-white p-4">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="rounded-full border border-border bg-bg-elevated px-3.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-strong"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 border-t border-border bg-white p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              disabled={streaming}
              placeholder={copy.chat.inputPlaceholder}
              className="flex-1 rounded-xl border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              className="rounded-xl bg-brand px-4 text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
