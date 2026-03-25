"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { isLoggedIn, setRedirectAfterLogin } from "@/lib/auth"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) {
      const query = searchParams.toString()
      setRedirectAfterLogin(query ? `${pathname}?${query}` : pathname)
      router.replace("/login")
    } else {
      setAuthorized(true)
    }
  }, [pathname, router, searchParams])

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
