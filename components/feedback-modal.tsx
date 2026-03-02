"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useLocale } from "@/lib/i18n/locale-context"

type FeedbackType = "bug" | "suggestion" | "general" | "rating"

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { t } = useLocale()
  const [type, setType] = useState<FeedbackType>("general")
  const [message, setMessage] = useState("")
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    await api.post("/api/feedback", {
      type,
      message,
      ...(type === "rating" ? { rating } : {}),
    })
    setSubmitting(false)
    setSubmitted(true)
    setTimeout(() => {
      onOpenChange(false)
      setSubmitted(false)
      setType("general")
      setMessage("")
      setRating(0)
    }, 2000)
  }

  const typeOptions: { value: FeedbackType; key: string }[] = [
    { value: "bug", key: "feedback.bug" },
    { value: "suggestion", key: "feedback.suggestion" },
    { value: "general", key: "feedback.general" },
    { value: "rating", key: "feedback.rating" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border-default bg-bg-surface sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-8 animate-fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
              <Star className="h-6 w-6 text-success" />
            </div>
            <p className="text-center font-serif text-lg text-text-primary">
              {t("feedback.thanks")}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl text-text-primary">
                {t("feedback.title")}
              </DialogTitle>
              <DialogDescription className="text-text-secondary">
                {t("feedback.subtitle")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-5">
              <RadioGroup
                value={type}
                onValueChange={(v) => setType(v as FeedbackType)}
                className="grid grid-cols-2 gap-3"
              >
                {typeOptions.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-4 py-3 transition-colors duration-150 ${
                      type === option.value
                        ? "border-brand bg-brand-subtle text-text-primary"
                        : "border-border-default bg-bg-elevated text-text-secondary hover:border-border-strong"
                    }`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{t(option.key)}</span>
                  </Label>
                ))}
              </RadioGroup>

              {type === "rating" && (
                <div className="flex items-center gap-1 animate-fade-up">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="rounded-md p-1 transition-colors hover:bg-bg-hover"
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors duration-150 ${
                          star <= (hoveredStar || rating)
                            ? "fill-warning text-warning"
                            : "text-text-muted"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}

              <Textarea
                placeholder={t("feedback.placeholder")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px] resize-none border-border-default bg-bg-elevated text-text-primary placeholder:text-text-muted focus-visible:border-brand focus-visible:ring-brand/15"
                rows={4}
              />

              <Button
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
                className="h-11 rounded-[10px] bg-brand px-6 font-semibold text-primary-foreground transition-colors duration-150 hover:bg-brand-hover disabled:opacity-50"
              >
                {submitting ? t("feedback.sending") : t("feedback.send")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
