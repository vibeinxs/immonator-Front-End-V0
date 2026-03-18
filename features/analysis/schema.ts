import type { AnalyseRequest } from "@/types/api"

/** Unified schema for both single-property and compare analysis inputs. */
export interface PropertyAnalysisInput extends AnalyseRequest {}

/** Shared field set used by both Property A and Property B forms. */
export const PROPERTY_ANALYSIS_FIELDS: Array<keyof PropertyAnalysisInput> = [
  "address",
  "sqm",
  "year_built",
  "condition",
  "energy_class",
  "purchase_price",
  "equity",
  "interest_rate",
  "repayment_rate",
  "transfer_tax_pct",
  "notary_pct",
  "agent_pct",
  "land_share_pct",
  "rent_monthly",
  "hausgeld_monthly",
  "maintenance_nd",
  "management_nd",
  "grundsteuer_annual",
  "rent_growth",
  "appreciation",
  "tax_rate",
  "holding_years",
  "afa_method",
  "afa_rate_input",
  "vacancy_rate",
  "special_afa_enabled",
  "special_afa_rate_input",
  "special_afa_years",
]
