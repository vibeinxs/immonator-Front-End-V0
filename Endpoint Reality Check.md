tmp/backend-spec/Endpoint Reality Check.md

# Endpoint Reality Check

## App + OpenAPI status
- FastAPI app is created in `main.py` as `app = FastAPI(...)`.
- `/openapi.json` is enabled (no `openapi_url=None` override).
- Local Uvicorn startup succeeded, but loopback `curl` to `127.0.0.1:8000` is blocked in this execution sandbox; `openapi.json` was generated from the app object (`app.openapi()`) and saved at repo root.

## /api GET/POST endpoints from OpenAPI

| Endpoint + method | Purpose | Frontend feature |
|---|---|---|
| `GET /api/analysis/compact/{property_id}` | Get Compact Analysis | unused |
| `GET /api/analysis/deep/{property_id}` | Get Deep Analysis | unused |
| `POST /api/analysis/deep/{property_id}` | Create Deep Analysis | unused |
| `GET /api/analysis/market/{city}` | Get Market Analysis | unused |
| `GET /api/analysis/market/{city}/stats` | Get Market Stats | unused |
| `GET /api/analysis/portfolio` | Get Portfolio Analysis | unused |
| `POST /api/analysis/portfolio` | Create Portfolio Analysis | unused |
| `GET /api/analysis/scenario/{property_id}` | Get Saved Scenarios | unused |
| `POST /api/analysis/scenario/{property_id}` | Run Scenario | unused |
| `POST /api/analysis/scenario/{property_id}/save` | Save Scenario | unused |
| `POST /api/auth/beta-login` | Beta Login | unused |
| `GET /api/auth/me` | Me | unused |
| `POST /api/auth/refresh` | Refresh | unused |
| `POST /api/chat` | Stream Chat | unused |
| `GET /api/chat/history` | Get Chat History | unused |
| `POST /api/feedback` | Submit Feedback | unused |
| `GET /api/negotiate/{property_id}` | Get Negotiation Brief | unused |
| `POST /api/negotiate/{property_id}` | Create Negotiation Brief | unused |
| `GET /api/portfolio` | Get Portfolio | unused |
| `POST /api/portfolio/watch/{property_id}` | Watch Property | unused |
| `GET /api/properties` | List Properties | unused |
| `GET /api/properties/stats` | Get Stats | unused |
| `POST /api/properties/trigger-scrape` | Trigger Scrape | unused |
| `GET /api/properties/{property_id}` | Get Property | unused |
| `GET /api/strategy` | Get Strategy | unused |
| `POST /api/strategy/generate` | Generate Strategy | unused |
| `GET /api/strategy/matches` | Get Strategy Matches | unused |
| `GET /api/users/profile` | Get Profile | unused |
| `POST /api/users/profile` | Upsert Profile | unused |
| `POST /api/waitlist` | Join Waitlist | unused |

## M3/M4/M5 gap check
- No M3/M4/M5 planning/spec files were found in this repository, so there are no concrete M3/M4/M5 endpoint references to diff against OpenAPI in-repo.
- `Not implemented` endpoints from M3/M4/M5: none identified from repository artifacts.
