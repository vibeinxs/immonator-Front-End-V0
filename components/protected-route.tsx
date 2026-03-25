"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { isLoggedIn, setRedirectAfterLogin } from "@/lib/auth"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) {
      const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : ""
      setRedirectAfterLogin(query ? `${pathname}?${query}` : pathname)
      router.replace("/login")
    } else {
      setAuthorized(true)
    }
  }, [pathname, router])

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
