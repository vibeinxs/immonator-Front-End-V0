import Link from "next/link"
import { ArrowRight, BarChart3, Shield, TrendingUp } from "lucide-react"

const features = [
  {
    icon: TrendingUp,
    title: "Yield Analysis",
    description:
      "Instant gross and net yield calculations with detailed cost breakdowns for any German property.",
  },
  {
    icon: BarChart3,
    title: "Market Intelligence",
    description:
      "Real-time price trends, demographic data, and growth projections across German cities.",
  },
  {
    icon: Shield,
    title: "Portfolio Tracking",
    description:
      "Monitor your entire portfolio performance with unified dashboards and alerts.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Nav */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-[58px] items-center border-b border-border-default bg-bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[22px] text-text-primary">
              Immonator
            </span>
            <span className="rounded bg-brand-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-brand">
              beta
            </span>
          </div>
          <Link
            href="/beta-login"
            className="rounded-[10px] bg-brand px-6 py-[11px] text-[15px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-brand-hover"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-4 pt-[58px] text-center">
        <div className="mx-auto max-w-3xl animate-fade-in">
          <h1 className="text-balance font-serif text-[48px] leading-tight text-text-primary md:text-[56px]">
            Smarter German Real Estate Investing
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
            Data-driven analysis for residential property investments.
            Crystal-clear yields, market insights, and portfolio tracking.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/beta-login"
              className="flex items-center gap-2 rounded-[10px] bg-brand px-8 py-[11px] text-[15px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-brand-hover"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="rounded-[10px] border border-border-strong px-8 py-[11px] text-[15px] font-semibold text-text-secondary transition-colors duration-150 hover:bg-bg-hover"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-24">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="text-center font-serif text-[28px] text-text-primary">
            Built for serious investors
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-text-secondary">
            Every feature designed to help you make better decisions on
            properties worth hundreds of thousands of euros.
          </p>

          <div className="stagger-children mt-16 grid gap-6 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-[14px] border border-border-default bg-bg-surface p-6 transition-colors duration-150 hover:border-border-strong"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-[1280px] rounded-[14px] border border-border-default bg-bg-surface p-12 text-center md:p-16">
          <h2 className="font-serif text-[28px] text-text-primary">
            Ready to analyze your first property?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-text-secondary">
            Join the beta and start making data-driven investment decisions
            today.
          </p>
          <Link
            href="/beta-login"
            className="mt-8 inline-flex items-center gap-2 rounded-[10px] bg-brand px-8 py-[11px] text-[15px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-brand-hover"
          >
            Join the Beta
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-default px-4 py-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between">
          <span className="font-serif text-sm text-text-secondary">
            Immonator
          </span>
          <span className="text-xs text-text-muted">Made in Germany</span>
        </div>
      </footer>
    </div>
  )
}
