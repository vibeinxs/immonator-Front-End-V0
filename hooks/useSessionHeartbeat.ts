import { useEffect } from "react"

import { isLoggedIn } from "@/lib/auth"
import { getMe } from "@/lib/immonatorApi"

export function useSessionHeartbeat() {
  useEffect(() => {
    if (!isLoggedIn()) return

    const check = async () => {
      await getMe()
      // 401 → lib/api.ts calls logout() automatically
    }

    void check()
    const interval = setInterval(check, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])
}
