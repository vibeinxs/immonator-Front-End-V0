"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AiInsightsPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] py-2">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-text-primary">AI Insights</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Portfolio-aware analysis summaries and negotiation guidance.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto gap-1 rounded-xl border border-border-default bg-bg-surface p-1">
          <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-sm">Overview</TabsTrigger>
          <TabsTrigger value="negotiation" className="rounded-lg px-4 py-2 text-sm">Negotiation Tips</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <section className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary">Market & Property Summary</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Use this area for AI-generated narrative on yield quality, debt resilience, and location momentum.
            </p>
          </section>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
              <h3 className="text-sm font-semibold text-text-primary">Opportunities</h3>
              <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                <li>• Rent upside vs local reference bands</li>
                <li>• Favorable long-hold IRR trend</li>
                <li>• Tax depreciation tailwind</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
              <h3 className="text-sm font-semibold text-text-primary">Risks</h3>
              <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                <li>• Debt service pressure at higher rates</li>
                <li>• Vacancy sensitivity in weak demand zones</li>
                <li>• Exit value dependency at year 10</li>
              </ul>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="negotiation" className="space-y-4">
          <section className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary">Negotiation Tips</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Suggested tactics and talking points backed by the current KPI profile.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• Open with a data-backed anchor based on cash-flow neutrality.</li>
              <li>• Reference comparable yield spread to justify offer range.</li>
              <li>• Use repair/modernisation risk as conditional concession point.</li>
            </ul>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
