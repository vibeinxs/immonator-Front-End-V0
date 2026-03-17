# Immonator Front-End V0 — Claude Code Context

Immonator is a **German Real Estate Intelligence Platform** helping property investors analyse deals, track portfolios, and understand city-level market trends.

---

## Two Front-End Repos

| Repo | GitHub | Stack | Env var |
|------|--------|-------|---------|
| **immonator-Front-End-V0** ← *you are here* | [`vibeinxs/immonator-Front-End-V0`](https://github.com/vibeinxs/immonator-Front-End-V0) | Next.js 16 · React 19 · Tailwind v4 · shadcn/ui | `NEXT_PUBLIC_API_URL` |
| **Immonator** (V2) | [`vibeinxs/Immonator`](https://github.com/vibeinxs/Immonator) | React 18 · Vite · CSS custom properties | `VITE_API_URL` |

Both repos share the same FastAPI back-end.

---

## Back-end API

| | Value |
|-|-------|
| **Base URL** | `https://web-production-61c120.up.railway.app` (Railway origin) |
| **Custom domain** | `https://api.immonator.de` (used by V2) |
| **Env var (V0)** | `NEXT_PUBLIC_API_URL` |

All authenticated requests require:
```
Authorization: Bearer <token>   # localStorage key: immo_token
X-User-ID:     <user_id>        # localStorage key: immo_user_id
```
A `401` triggers `logout()` → redirect to `/beta-login`.
Error shape: `{ message?: string; error?: string }`.

### Auth
| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/auth/beta-login` | `{ beta_code, display_name? }` | `{ token, user_id, display_name }` |
| `POST` | `/api/auth/refresh` | — | `{ token }` |
| `GET`  | `/api/auth/me` | — | `{ user_id, display_name }` |

### Properties
| Method | Path | Notes |
|--------|------|-------|
| `GET`  | `/api/properties` | `?city, min_price, max_price, min_rooms, property_type, page, limit, sort_by` |
| `GET`  | `/api/properties/:id` | — |
| `GET`  | `/api/properties/stats` | — |
| `POST` | `/api/properties/trigger-scrape` | V0 path (V2 uses `/api/properties/scrape`) |

### Portfolio
| Method | Path |
|--------|------|
| `POST`  | `/api/portfolio/watch/:id` |
| `GET`   | `/api/portfolio` |
| `PATCH` | `/api/portfolio/:id/status` |
| `DELETE`| `/api/portfolio/:id` |

### Analysis
| Method | Path |
|--------|------|
| `GET`  | `/api/analysis/compact/:id` |
| `POST` | `/api/analysis/deep/:id` |
| `GET`  | `/api/analysis/deep/:id` |
| `GET`  | `/api/analysis/market/:city/stats` |
| `GET`  | `/api/analysis/market/:city` |
| `POST` | `/api/analysis/portfolio` |
| `GET`  | `/api/analysis/portfolio` |
| `POST` | `/api/analysis/scenario/:id` |
| `POST` | `/api/analysis/scenario/:id/save` |
| `GET`  | `/api/analysis/scenario/:id/saved` |

### Strategy
| Method | Path |
|--------|------|
| `POST` | `/api/strategy/generate` |
| `GET`  | `/api/strategy` |
| `GET`  | `/api/strategy/matches` |

### Negotiation *(V0 path)*
| Method | Path |
|--------|------|
| `POST` | `/api/negotiate/:id` |
| `GET`  | `/api/negotiate/:id` |

### User Profile *(V0 uses POST for upsert)*
| Method | Path |
|--------|------|
| `GET`  | `/api/users/profile` |
| `POST` | `/api/users/profile` |

### Chat *(V0 path)*
| Method | Path |
|--------|------|
| `POST`   | `/api/chat` |
| `GET`    | `/api/chat/history` |
| `DELETE` | `/api/chat/history` |

### Misc
| Method | Path |
|--------|------|
| `POST` | `/api/feedback` |
| `POST` | `/api/waitlist` |

---

## Project Structure

```
/
├── CLAUDE.md               # This file
├── .env.local              # NEXT_PUBLIC_API_URL (gitignored)
├── openapi.json            # FastAPI OpenAPI schema (source of truth for API types)
├── app/
│   ├── layout.tsx          # Root layout (fonts, theme provider)
│   ├── page.tsx            # Landing / home page
│   ├── globals.css         # Tailwind base styles
│   ├── beta-login/         # Public login page
│   ├── api/                # Next.js route handlers (thin proxies)
│   └── (protected)/        # Auth-gated pages
│       ├── layout.tsx      # Shared nav shell
│       ├── properties/     # Property listing + detail
│       ├── analyse/        # Property analysis view
│       ├── market/         # City market pages
│       ├── portfolio/      # Portfolio tracker
│       └── strategy/       # Investment strategy
├── components/             # shadcn/ui + custom components
├── hooks/                  # Custom React hooks
├── lib/
│   ├── api.ts              # Fetch wrapper (NEXT_PUBLIC_API_URL + auth headers)
│   ├── auth.ts             # localStorage token helpers
│   ├── immonatorApi.ts     # All API types + call functions
│   ├── localCompute.ts     # Client-side financial calculations
│   ├── copy.ts             # UI copy / text strings
│   └── i18n/              # Internationalisation helpers
├── types/                  # Shared TypeScript types
└── styles/                 # Additional global styles
```

---

## Running the App

```bash
pnpm install          # or: npm install
cp .env.local.example .env.local
# .env.local:
# NEXT_PUBLIC_API_URL=https://web-production-61c120.up.railway.app
pnpm dev
```

---

## Key Differences from V2 (Immonator)

| Aspect | V0 (this repo) | V2 |
|--------|---------------|----|
| Framework | Next.js 16 App Router | React 18 + Vite (SPA) |
| Styling | Tailwind v4 + shadcn/ui | CSS custom properties |
| Env var | `NEXT_PUBLIC_API_URL` | `VITE_API_URL` |
| Scrape path | `/api/properties/trigger-scrape` | `/api/properties/scrape` |
| Chat path | `/api/chat` | `/api/chat/stream` |
| Negotiation path | `/api/negotiate/:id` | `/api/negotiation/:id` |
| Profile method | `POST` (upsert) | `PUT` |
| Extra libs | `localCompute.ts`, `i18n/` | — |
| Codespaces | `.devcontainer` included | Not configured |

---

## Coding Conventions

- All API calls go through `lib/api.ts` (`api.get`, `api.post`, etc.)
- Auth tokens: `immo_token`, `immo_user_id`, `immo_display_name` in localStorage
- Component files: PascalCase (`PropertyDetail.tsx`)
- Use `NEXT_PUBLIC_API_URL` env var — never hard-code the base URL

---

## Change Log

### Session: 2026-03-05

#### Completed
- [x] Set `NEXT_PUBLIC_API_URL=https://web-production-61c120.up.railway.app` in `.env.local`
- [x] Created `CLAUDE.md` with full project context and change tracking

### Session: 2026-03-06

#### Completed
- [x] Extended `types/api.ts`: added `special_afa_rate_input`, `special_afa_years`, `energy_class` to `AnalyseRequest`; `afa_sonder` to `AnalyseYearData`
- [x] Created `lib/localComputeBridge.ts`: bridge between `AnalyseRequest`↔`FormParams` and `ComputeResult`→`AnalyseResponse`
- [x] Created `lib/manualPortfolio.ts`: localStorage CRUD for manually saved analysis entries
- [x] Created `components/analysis/ExitHorizonsTable.tsx`: flat table for 10/15/20yr IRR + equity multiple + net gain
- [x] Created `components/analysis/YearByYearTable.tsx`: full 8-column year-by-year table matching reference
- [x] Created `components/analysis/LandShareBlock.tsx`: land share % hint with AfA advantage label
- [x] Created `components/analysis/SaveToPortfolioButton.tsx`: save-to-portfolio dialog with name + status
- [x] Created `features/analysis/AnalysisInputPanel.tsx`: 7-section sidebar input form matching reference layout
- [x] Rewrote `app/(protected)/analyse/page.tsx`: two-pane layout (sidebar + main), two tabs (Analysis / AI Analysis), live localCompute preview, backend API call, collapsible Property B comparison, save-to-portfolio
- [x] Updated `app/(protected)/portfolio/page.tsx`: added `ManualPortfolioSection` showing localStorage-saved analyses with KPIs, status, Open Analysis, and Delete actions

### Session: 2026-03-17 — AI Features Contract (cross-repo, no code changes)

#### Purpose
Define the shared frontend ↔ backend data contract for four AI features:
AI Insight, AI Analysis, Negotiation Strategy, Ask AI chat.
No endpoints implemented yet. This is the authoritative contract definition.

---

## AI Features — Data Contract

### Endpoint List

| # | Feature | Method | Path | Status |
|---|---------|--------|------|--------|
| 1 | AI Insight | `POST` | `/api/ai/insight` | **net-new** |
| 2 | AI Analysis | `POST` | `/api/ai/analysis` | **net-new** |
| 3 | Negotiation (manual/inline) | `POST` | `/api/ai/negotiation` | **net-new** (existing `/api/negotiate/:id` requires DB property) |
| 4 | Ask AI — send | `POST` | `/api/chat` | **extend** (new `context_type` values + `context_data` field) |
| 4b | Ask AI — history | `GET` | `/api/chat/history` | no change |

---

### Shared Base Types

#### `PropertySnapshot`
```typescript
interface PropertySnapshot {
  address: string           // required
  purchase_price: number    // required
  sqm: number
  year_built: number
  condition: "existing" | "newbuild"
  energy_class?: string
}
```

#### `MetricsSnapshot`
```typescript
interface MetricsSnapshot {
  score: number             // required
  verdict: string           // required
  net_yield_pct: number     // required
  gross_yield_pct?: number
  kpf: number               // required
  cash_flow_monthly_yr1: number  // required
  annuity_monthly?: number
  irr_10: number            // required
  irr_15?: number
  irr_20?: number
  equity_multiple_10: number
  equity_multiple_15?: number
  equity_multiple_20?: number
  ltv_pct?: number
  closing_costs?: number
  annual_afa?: number
  afa_tax_saving_yr1?: number
  // market enrichment — null in local-compute mode, populated after /analyse backend call
  market_rent_m2?: number | null
  bodenrichtwert_m2?: number | null
  current_mortgage_rate?: number | null
  location_score?: number | null
  population_trend?: string | null
}
```

#### `ComparisonSummary`
Pre-computed on the frontend from `CompareTable.tsx` logic (lines 124–152).
```typescript
interface ComparisonSummary {
  winner_net_yield: "a" | "b" | "tie"
  winner_irr_10:    "a" | "b" | "tie"
  winner_score:     "a" | "b" | "tie"
  winner_cash_flow: "a" | "b" | "tie"
  delta_net_yield_pct: number
  delta_irr_10: number
  delta_cash_flow_monthly: number
  auto_summary: string   // e.g. "A has higher net yield · B scores lower overall"
}
```

---

### AI Insight — `POST /api/ai/insight`

**Purpose**: Concise executive summary, ≤ 5 bullets. NOT a duplicate of AI Analysis.
**Model**: `claude-haiku-4-5` (fast, stateless, no DB persistence).
**Source in frontend**: `store/analysisStore.tsx` → `resultA` / `resultB`, `inputA` / `inputB`.

**Request (single)**:
```json
{
  "mode": "single",
  "property": PropertySnapshot,
  "metrics": MetricsSnapshot
}
```
**Request (comparison)**:
```json
{
  "mode": "comparison",
  "property_a": PropertySnapshot, "metrics_a": MetricsSnapshot,
  "property_b": PropertySnapshot, "metrics_b": MetricsSnapshot,
  "comparison_summary": ComparisonSummary
}
```
**Response**:
```json
{
  "mode": "single|comparison",
  "headline": "string",
  "bullets": ["string"],          // single mode
  "bullets_a": ["string"],        // comparison mode
  "bullets_b": ["string"],        // comparison mode
  "sentiment": "positive|neutral|negative",
  "recommendation": "a|b|null",
  "recommendation_reason": "string|null",
  "confidence": "high|medium|low",
  "generated_at": "ISO datetime"
}
```

---

### AI Analysis — `POST /api/ai/analysis`

**Purpose**: Deep narrative (investment thesis, risks, tax efficiency, exit). Supports single + comparison.
**Model**: `claude-sonnet-4-6` (stateless, no DB persistence for inline mode).
**Source in frontend**: full `inputA` + `resultA` from `store/analysisStore.tsx`; `year_data` trimmed to rows [1,5,10,15,20].

**Request (single)**:
```json
{
  "mode": "single",
  "property": PropertySnapshot,
  "financing": { "equity": 0, "loan": 0, "interest_rate": 0, "repayment_rate": 0, "ltv_pct": 0, "closing_costs": 0 },
  "income": { "rent_monthly": 0, "hausgeld_monthly": 0, "maintenance_nd": 0, "management_nd": 0, "vacancy_rate": 0 },
  "assumptions": { "rent_growth": 0, "appreciation": 0, "tax_rate": 0, "holding_years": 10 },
  "afa": { "afa_method": "linear", "afa_rate_pct": 0, "annual_afa": 0, "afa_basis": 0, "special_afa_enabled": false },
  "metrics": MetricsSnapshot,
  "year_data": [/* max 5 rows: years 1,5,10,15,20 */]
}
```
**Request (comparison)**: same but `property_a/b`, `financing_a/b`, `metrics_a/b`, `year_data_a/b`, `comparison_summary`.

**Response**:
```json
{
  "mode": "single|comparison",
  "verdict": "string",
  "headline": "string",
  "summary": "string",
  "sections": {
    "investment_thesis": "string",
    "risks": "string",
    "market_context": "string",
    "tax_efficiency": "string",
    "exit_strategy": "string"
  },
  "top_3_positives": ["string"],
  "top_3_risks": ["string"],
  "recommendation": "a|b|null",         // comparison only
  "recommendation_reason": "string|null",
  "head_to_head": {                      // comparison only
    "irr_10": { "winner": "a|b", "margin": "slight|significant" }
  },
  "confidence_score": 0.0,
  "data_quality": "high|medium|low",
  "generated_at": "ISO datetime"
}
```

**`sections.*`** are passed as context to Ask AI chat on follow-up questions.

---

### Negotiation Strategy — `POST /api/ai/negotiation`

**Purpose**: German RE negotiation brief (inline, no DB property_id required).
**Model**: `claude-sonnet-4-6`.
**Reuses existing `NegotiationBrief` response shape** from `types/api.ts`.

**Request**:
```json
{
  "property": PropertySnapshot,   // asking_price = purchase_price
  "metrics": MetricsSnapshot,
  "user_profile": {               // optional — fetched from GET /api/users/profile
    "available_equity": 0,
    "risk_tolerance": "moderate",
    "target_yield_percent": 3.5
  }
}
```
**Response** (unchanged `NegotiationBrief` shape):
```json
{
  "recommended_offer": 0,
  "walk_away_price": 0,
  "strategy": "string",
  "leverage_points": ["string"],
  "talking_points_de": ["string"],
  "talking_points_en": ["string"],
  "offer_letter_draft": "string"
}
```

---

### Ask AI Chat — `POST /api/chat` (extended)

**New `context_type` values**: `"analysis_single"`, `"analysis_compare"` (add to `_VALID_CONTEXT_TYPES`).
**New field**: `context_data` — assembled from live store state before each send, never persisted.

**Request (single analysis)**:
```json
{
  "message": "string",
  "context_type": "analysis_single",
  "context_id": null,
  "context_data": {
    "address": "string",
    "purchase_price": 0,
    "net_yield_pct": 0,
    "irr_10": 0,
    "cash_flow_monthly_yr1": 0,
    "score": 0,
    "verdict": "string",
    "market_rent_m2": null
  }
}
```
**Request (comparison)**:
```json
{
  "message": "string",
  "context_type": "analysis_compare",
  "context_id": null,
  "context_data": {
    "property_a": { "address": "string", "net_yield_pct": 0, "irr_10": 0 },
    "property_b": { "address": "string", "net_yield_pct": 0, "irr_10": 0 },
    "comparison_summary": "A has higher net yield · A scores higher overall"
  }
}
```
**Response**: existing SSE stream — no change.

---

### Frontend Source Mapping

| Feature | Store fields consumed | Transformation needed |
|---------|-----------------------|-----------------------|
| AI Insight | `resultA.score/verdict/net_yield_pct/kpf/irr_10/cash_flow_monthly_yr1/equity_multiple_10/ltv_pct/closing_costs/annual_afa/afa_tax_saving_yr1` | `comparison_summary` — extract `CompareTable` lines 124–152 to `lib/compareUtils.ts` |
| AI Analysis | all of `inputA` + `resultA` | `financing.*` computed from input; `year_data` trimmed to 5 rows; `energy_class` (Step 1 type extension) |
| Negotiation (manual) | `inputA.purchase_price/sqm/year_built/condition/energy_class`, all `resultA` metrics | merge `user_profile` from `GET /api/users/profile` before sending |
| Ask AI Chat | `resultA` / `resultB` live state | `context_data` assembled per message in `AnalysisChat.tsx` before `sendChatMessage()` call |

**Missing fields in current types**:
- `energy_class` on `AnalyseRequest` → already added (Session 2026-03-06)
- `context_data` on chat request → new field, needs `AnalysisChat.tsx` update when implementing

---

### Backend Location Guide

| Feature | New route | New agent | Reuse |
|---------|-----------|-----------|-------|
| AI Insight | `api/ai_router.py` | `agents/insight_agent.py` | `_fmt` helpers from `negotiation_agent.py` |
| AI Analysis | `api/ai_router.py` | `agents/inline_analysis_agent.py` | `_build_prompt` structure from `deep_analysis_agent.py` |
| Negotiation (inline) | `api/ai_router.py` | extend `agents/negotiation_agent.py` | `NegotiationBrief` response model |
| Ask AI Chat | `api/chat_router.py` (extend) | extend `agents/chat_agent.py` | `_VALID_CONTEXT_TYPES` frozenset |

New shared schema file: `immonator/schemas/ai_schemas.py` — Pydantic models for `PropertySnapshot`, `MetricsSnapshot`, `ComparisonSummary`.

---

### Open Questions

| # | Question |
|---|----------|
| 1 | Can `CompactAnalysisAgent` be reused for AI Insight (it already produces `verdict + top_3_*`) or is a new `insight_agent.py` cleaner? |
| 2 | Should `ai_analysis: string` in `AnalyseResponse` be replaced by structured `InlineAnalysisResponse` or stay a plain string? |
| 3 | Where does inline negotiation live in the frontend routing — new `/analyse/negotiate` route or modal on the analysis page? |
| 4 | Confirm trimming `year_data` to 5 rows `[1,5,10,15,20]` is acceptable for AI quality. |
| 5 | Do `/api/ai/*` routes require `Depends(get_current_user)` auth (assume yes, confirm)? |
| 6 | Rate limiting / per-user daily quota for `claude-sonnet-4-6` endpoints? |

