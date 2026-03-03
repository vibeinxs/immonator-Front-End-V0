"use client"

const TOKEN_KEY = "immo_token"
const USER_ID_KEY = "immo_user_id"
const USER_NAME_KEY = "immo_name"
const NEW_USER_KEY = "immo_new_user"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USER_ID_KEY)
}

export function getUserName(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USER_NAME_KEY)
}

export function isNewUser(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(NEW_USER_KEY) === "true"
}

export function setNewUserSeen(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(NEW_USER_KEY, "false")
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function saveSession(
  token: string,
  userId: string,
  name: string,
  newUser: boolean
): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_ID_KEY, userId)
  localStorage.setItem(USER_NAME_KEY, name)
  localStorage.setItem(NEW_USER_KEY, String(newUser))
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Strict`
}

export function logout(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USER_NAME_KEY)
  localStorage.removeItem(NEW_USER_KEY)
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Strict`
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
