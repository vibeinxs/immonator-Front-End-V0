import { useEffect } from "react"

import { getMe } from "@/lib/immonatorApi"
import { isLoggedIn } from "@/lib/auth"

export function useSessionHeartbeat() {
  useEffect(() => {
    if (!isLoggedIn()) return

    const check = async () => {
      await getMe()
      // 401 → lib/api.ts calls logout() automatically
    }

    check()
    const interval = setInterval(check, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])
}
