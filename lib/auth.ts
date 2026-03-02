"use client"

const TOKEN_KEY = "immo_token"
const USER_ID_KEY = "immo_user_id"
const USER_NAME_KEY = "immo_display_name"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USER_ID_KEY)
}

export function getDisplayName(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USER_NAME_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function setAuth(token: string, userId: string, displayName?: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_ID_KEY, userId)
  if (displayName) {
    localStorage.setItem(USER_NAME_KEY, displayName)
  }
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USER_NAME_KEY)
  window.location.href = "/beta-login"
}

export function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
