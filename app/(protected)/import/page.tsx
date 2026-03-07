"use client"

import { useState } from "react"

export default function ImportListingsPage() {
  const [urls, setUrls] = useState("")

  return (
    <div className="mx-auto w-full max-w-[960px] py-2">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-text-primary">Import Listings</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Paste online listing links, review parsed fields, then send to Analyze or Portfolio.
        </p>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step 1</p>
          <h2 className="mt-1 text-sm font-semibold text-text-primary">Paste listing links</h2>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://example.com/listing/123\nhttps://example.com/listing/456"
            className="mt-3 min-h-32 w-full rounded-xl border border-border-default bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30"
          />
        </section>

        <section className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step 2</p>
          <h2 className="mt-1 text-sm font-semibold text-text-primary">Preview extracted details</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Parsed fields (address, price, rent, sqm) will appear here for quick verification.
          </p>
        </section>

        <section className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step 3</p>
          <h2 className="mt-1 text-sm font-semibold text-text-primary">Choose destination</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover">
              Analyze now
            </button>
            <button className="rounded-lg border border-border-default px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary">
              Save to Portfolio
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
