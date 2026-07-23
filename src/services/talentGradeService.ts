import { api } from "@/api/client";

/**
 * Admin talent-grade configuration. Money is MINOR units (cents) end to end — the UI converts to
 * major only for display and input, never storing a floating-point rand value.
 */

/** Mirrors `TalentGradeDto`. */
export interface TalentGrade {
  id: string;
  name: string;
  rank: number;
  currencyCode: string;
  clientHourlyRateMinor: number;
  defaultTalentSharePercent: number;
  defaultTalentPayoutMinor: number;
  isActive: boolean;
  assignedTalentCount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateGradeInput {
  name: string;
  rank: number;
  currencyCode: string;
  clientHourlyRateMinor: number;
  defaultTalentSharePercent: number;
}

export interface UpdateGradeInput {
  name: string;
  rank: number;
  clientHourlyRateMinor: number;
  defaultTalentSharePercent: number;
}

export function listGrades(includeArchived = true, signal?: AbortSignal): Promise<TalentGrade[]> {
  return api.get<TalentGrade[]>("/admin/talent-grades", { query: { includeArchived }, signal });
}

export function createGrade(input: CreateGradeInput): Promise<TalentGrade> {
  return api.post<TalentGrade>("/admin/talent-grades", input);
}

export function updateGrade(id: string, input: UpdateGradeInput): Promise<TalentGrade> {
  return api.put<TalentGrade>(`/admin/talent-grades/${id}`, input);
}

export function archiveGrade(id: string): Promise<void> {
  return api.post<void>(`/admin/talent-grades/${id}/archive`, {});
}

export function restoreGrade(id: string): Promise<void> {
  return api.post<void>(`/admin/talent-grades/${id}/restore`, {});
}

/** Formats a minor-unit amount as a currency string (e.g. 100000, "ZAR" → "R 1,000"). */
export function formatMinor(minor: number | null | undefined, currency = "ZAR"): string {
  if (minor == null) return "—";
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toLocaleString()}`;
  }
}
