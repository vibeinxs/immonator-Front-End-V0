"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Briefcase,
  MapPin,
  BarChart3,
  MessageSquare,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FeedbackModal } from "@/components/feedback-modal"
import { getDisplayName, getInitials, logout } from "@/lib/auth"

const NAV_ITEMS = [
  { label: "Properties", href: "/properties", icon: Home },
  { label: "Portfolio", href: "/portfolio", icon: Briefcase },
  { label: "Markets", href: "/market/berlin", icon: MapPin },
  { label: "Strategy", href: "/strategy", icon: BarChart3 },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const displayName = getDisplayName() || "User"
  const initials = getInitials(displayName)

  const isActive = (href: string) => {
    if (href.startsWith("/market")) return pathname.startsWith("/market")
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Desktop Top Nav */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-[58px] items-center border-b border-border-default bg-bg-surface">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 md:px-8">
          {/* Left: Logo */}
          <Link href="/properties" className="flex items-center gap-2">
            <span className="font-serif text-[22px] text-text-primary">
              Immonator
            </span>
            <span className="rounded bg-brand-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-brand">
              beta
            </span>
          </Link>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-4 text-sm font-medium transition-colors duration-150 ${
                  isActive(item.href)
                    ? "text-brand"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-brand" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right: Feedback + Avatar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="hidden items-center gap-1.5 text-sm font-medium text-brand transition-colors duration-150 hover:text-brand-hover md:flex"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Feedback</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-primary-foreground outline-none transition-opacity hover:opacity-90"
                  aria-label="User menu"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 border-border-default bg-bg-elevated"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-text-primary">
                    {displayName}
                  </p>
                </div>
                <DropdownMenuSeparator className="bg-border-default" />
                <DropdownMenuItem
                  onClick={() => setFeedbackOpen(true)}
                  className="text-text-secondary hover:text-text-primary md:hidden"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Feedback
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-[58px] pb-[74px] md:pb-0">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8">
          <div className="animate-fade-in">{children}</div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed bottom-0 right-0 left-0 z-50 flex h-[58px] items-center justify-around border-t border-border-default bg-bg-surface md:hidden"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium transition-colors duration-150 ${
                active ? "text-brand" : "text-text-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  )
}
