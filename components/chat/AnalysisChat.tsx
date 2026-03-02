"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { ChevronDown, ArrowRight } from "lucide-react"
import { getToken } from "@/lib/auth"
import { immoApi } from "@/lib/immonatorApi"

interface ChatMessage {
  role: "user" | "assistant"
  message: string
}

const SUGGESTION_CHIPS = [
  "Is this a good investment?",
  "What's a fair offer price?",
  "What are the main risks?",
  "How does this fit my strategy?",
  "Explain the numbers to me",
]

export function AnalysisChat({
  contextType,
  contextId,
  title,
}: {
  contextType: string
  contextId?: string
  title: string
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [didLoadHistory, setDidLoadHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load history on mount
  useEffect(() => {
    if (didLoadHistory) return
    setDidLoadHistory(true)
    immoApi.getChatHistory(contextType, contextId)
      .then(({ data }) => {
        if (data?.messages) setMessages(data.messages as ChatMessage[])
      })
      .catch(() => {})
  }, [contextType, contextId, didLoadHistory])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return

      const userMsg: ChatMessage = { role: "user", message: text.trim() }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setStreaming(true)

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", message: "" }])

      try {
        const res = await immoApi.sendChatMessage(text.trim(), contextType, contextId)

        if (!res.ok || !res.body) {
          setMessages((prev) => {
            const copy = [...prev]
            copy[copy.length - 1] = {
              role: "assistant",
              message: "Sorry, something went wrong. Please try again.",
            }
            return copy
          })
          setStreaming(false)
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let fullContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith("data:")) {
              const jsonStr = trimmed.slice(5).trim()
              if (jsonStr === "[DONE]") continue
              try {
                const parsed = JSON.parse(jsonStr)
                if (parsed.content) {
                  fullContent += parsed.content
                  setMessages((prev) => {
                    const copy = [...prev]
                    copy[copy.length - 1] = {
                      role: "assistant",
                      message: fullContent,
                    }
                    return copy
                  })
                }
              } catch {
                /* skip invalid JSON */
              }
            }
          }
        }
      } catch {
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = {
            role: "assistant",
            message: "Connection error. Please try again.",
          }
          return copy
        })
      }

      setStreaming(false)
    },
    [streaming, contextType, contextId]
  )

  return (
    <div className="rounded-xl border border-border bg-white">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-t-xl border-b border-border bg-white p-4 transition-colors hover:bg-bg-hover"
      >
        <span className="text-sm font-semibold text-text-primary">
          {"Chat about "}{title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded */}
      {open && (
        <div>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="max-h-96 space-y-3 overflow-y-auto bg-bg-base/50 p-4"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
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
                    <p className="mt-1 text-[11px] text-text-muted">Immonator AI</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {streaming && messages.length > 0 && messages[messages.length - 1].message === "" && (
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

          {/* Suggestion chips (when empty) */}
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
              placeholder="Ask anything..."
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
