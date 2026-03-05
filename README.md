# Immonator Frontend

## Run locally

```bash
npm install
# create env file (or copy `.env.example` to `.env.local`)
# set NEXT_PUBLIC_API_URL to your backend URL
npm run dev
```

### Environment setup

Create a `.env.local` file in the project root with:

```bash
NEXT_PUBLIC_API_URL=https://web-production-61c120.up.railway.app
```

If your backend runs elsewhere, change the URL accordingly (for example `http://localhost:8080`).

## Production build

```bash
npm run build
npm run start
```

## Manual smoke checks

1. **Properties list loads**
   - Open `/properties`.
   - Confirm cards render and fallback placeholders are shown for missing fields.
2. **Property detail loads**
   - Click "View Details" on any property.
   - Confirm detail header and tabs render without runtime errors.
3. **Analyse returns result + chart renders**
   - On property detail, click **Run Analysis**.
   - Confirm KPI tiles populate and **Cashflow / Month** chart draws from `year_data`.
