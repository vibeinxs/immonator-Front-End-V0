# Immonator Frontend

## Run locally

```bash
npm install
npm run dev
```

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
