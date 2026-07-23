import { api } from "@/api/client";

/**
 * A talent's commercial terms — STAFF ONLY (client rate, talent payout, gross margin). Never
 * surfaced to the talent or the client. Money is minor units.
 */
export interface CommercialTerms {
  pricingMode: "Unconfigured" | "GradeLinked" | "Custom";
  isConfigured: boolean;
  gradeId: string | null;
  gradeName: string | null;
  clientHourlyRateMinor: number | null;
  talentHourlyPayoutMinor: number | null;
  grossMarginMinor: number | null;
  gradeDefaultPayoutMinor: number | null;
  payoutIsGradeDefault: boolean;
  currency: string;
  updatedAtUtc: string | null;
  updatedByUserId: string | null;
}

export interface SetCommercialTermsInput {
  pricingMode: "GradeLinked" | "Custom";
  gradeId?: string | null;
  usePayoutGradeDefault: boolean;
  talentHourlyPayoutMinor?: number | null;
  customClientHourlyRateMinor?: number | null;
  currencyCode?: string | null;
}

export function getCommercialTerms(profileId: string, signal?: AbortSignal): Promise<CommercialTerms> {
  return api.get<CommercialTerms>(`/management/talents/${profileId}/commercial-terms`, { signal });
}

export function setCommercialTerms(profileId: string, input: SetCommercialTermsInput): Promise<CommercialTerms> {
  return api.put<CommercialTerms>(`/management/talents/${profileId}/commercial-terms`, input);
}

export function resetPayoutToGradeDefault(profileId: string): Promise<CommercialTerms> {
  return api.post<CommercialTerms>(`/management/talents/${profileId}/commercial-terms/reset-payout`, {});
}
