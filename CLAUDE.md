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
