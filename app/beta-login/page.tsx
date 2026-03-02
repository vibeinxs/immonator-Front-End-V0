"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setAuth } from "@/lib/auth"
import { api } from "@/lib/api"

export default function BetaLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data, error: apiError } = await api.post<{
      token: string
      user_id: string
      display_name: string
    }>("/api/auth/beta-login", { email, access_code: accessCode })

    if (apiError || !data) {
      setError(apiError || "Login failed. Check your credentials.")
      setLoading(false)
      return
    }

    setAuth(data.token, data.user_id, data.display_name)
    router.push("/properties")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="rounded-[14px] border border-border-default bg-bg-surface p-8">
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[28px] text-text-primary">
                Welcome back
              </h1>
              <span className="rounded bg-brand-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-brand">
                beta
              </span>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Sign in with your beta access credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-[0.08em] text-text-secondary"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="rounded-[10px] border border-border-default bg-bg-elevated px-4 py-[11px] text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="code"
                className="text-xs font-medium uppercase tracking-[0.08em] text-text-secondary"
              >
                Access Code
              </label>
              <input
                id="code"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter your beta code"
                required
                className="rounded-[10px] border border-border-default bg-bg-elevated px-4 py-[11px] font-mono text-sm text-text-primary placeholder:font-sans placeholder:text-text-muted transition-colors focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger animate-fade-up">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 rounded-[10px] bg-brand text-[15px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-brand-hover disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          {"Don't have access? "}
          <Link href="/" className="text-brand hover:text-brand-hover">
            Request an invite
          </Link>
        </p>
      </div>
    </div>
  )
}
