import { api } from "@/api/client";

/**
 * Safety reports — `/api/v1/reports`.
 *
 * Filing a report is a SAFETY action. It must always be reachable, must never fail
 * silently, and the reporter is never told who handled it or what came of the moderation
 * decision beyond their own report's status.
 */

/** Mirrors the backend `FileReportRequest`. */
export interface FileReportInput {
  targetType: string;
  targetId: string | null;
  category: string;
  description: string;
}

/** Mirrors the backend report DTO for the reporter's own list. */
export interface MyReportDto {
  id: string;
  targetType: string;
  targetId: string | null;
  category: string;
  description: string;
  status: string;
  createdAtUtc: string;
}

export function fileReport(input: FileReportInput): Promise<{ reportId: string }> {
  return api.post<{ reportId: string }>("/reports", input);
}

export function listMyReports(signal?: AbortSignal): Promise<MyReportDto[]> {
  return api.get<MyReportDto[]>("/reports/mine", { signal });
}

/** Backend `ReportCategory`, in the order the form should offer them. */
export const REPORT_CATEGORIES = [
  { value: "SafetyConcern", label: "A safety concern" },
  { value: "Harassment", label: "Harassment or abuse" },
  { value: "InappropriateContent", label: "Inappropriate content" },
  { value: "Impersonation", label: "Impersonation" },
  { value: "Fraud", label: "Fraud or a scam" },
  { value: "Spam", label: "Spam" },
  { value: "Other", label: "Something else" },
] as const;

/** Backend `ReportTargetType`. */
export const REPORT_TARGET_TYPES = [
  "User", "Booking", "Message", "Review", "Profile", "Conversation", "Other",
] as const;

/** Backend `ReportStatus` → what the reporter is told. */
const STATUS_LABELS: Record<string, string> = {
  Submitted: "Received",
  UnderReview: "Under review",
  ActionTaken: "Resolved",
  Dismissed: "Reviewed and closed",
  Escalated: "Escalated",
};

export function presentReportStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
