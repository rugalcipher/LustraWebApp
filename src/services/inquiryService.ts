import { api } from "@/api/client";

/**
 * Client inquiries — `/api/v1/client/inquiries`.
 *
 * An inquiry is a REQUEST FOR MANAGEMENT REVIEW. It is not a booking, a price, a
 * contract or a payment, and nothing here should ever imply otherwise.
 */

/** Mirrors the backend `CreateInquiryResultDto`. */
export interface CreateInquiryResultDto {
  inquiryId: string;
  conversationId: string;
}

/** Mirrors the backend `InquiryListItemDto`. */
export interface InquiryListItemDto {
  id: string;
  talentProfileId: string;
  talentDisplayName: string;
  engagementCategory: string;
  status: string;
  priority: string;
  preferredDate: string | null;
  conversationId: string;
  assignedManagementUserId: string | null;
  createdAtUtc: string;
}

/** Mirrors the backend `InquiryStatusHistoryDto`. */
export interface InquiryStatusHistoryDto {
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAtUtc: string;
}

/** Mirrors the backend `ClientInquiryDetailDto`. */
export interface ClientInquiryDetailDto {
  id: string;
  talentProfileId: string;
  talentDisplayName: string;
  engagementCategory: string;
  status: string;
  preferredDate: string | null;
  alternativeDate: string | null;
  preferredStartTime: string | null;
  estimatedDurationMinutes: number | null;
  cityName: string | null;
  venueType: string | null;
  attendeeCount: number | null;
  travelRequired: boolean;
  clientMessage: string | null;
  additionalRequirements: string | null;
  conversationId: string;
  createdAtUtc: string;
  history: InquiryStatusHistoryDto[];
}

/**
 * Mirrors the backend `CreateInquiryRequest`.
 *
 * Note what is ABSENT: no client id (derived from the principal), no timestamps, no
 * price and no idempotency key — the key travels as a header.
 */
export interface CreateInquiryInput {
  talentProfileId: string;
  engagementCategoryId: string;
  preferredDate: string | null;
  alternativeDate: string | null;
  preferredStartTime: string | null;
  estimatedDurationMinutes: number | null;
  cityId: string | null;
  venueTypeId: string | null;
  attendeeCount: number | null;
  travelRequired: boolean;
  clientMessage: string | null;
  additionalRequirements: string | null;
}

/**
 * Submit an inquiry. `idempotencyKey` identifies ONE logical submission and must be
 * reused across every retry of it, so a double-tap or a network retry returns the
 * original inquiry instead of creating a second.
 */
export function createInquiry(
  input: CreateInquiryInput,
  idempotencyKey: string
): Promise<CreateInquiryResultDto> {
  return api.post<CreateInquiryResultDto>("/client/inquiries", input, { idempotencyKey });
}

export function listInquiries(signal?: AbortSignal): Promise<InquiryListItemDto[]> {
  return api.get<InquiryListItemDto[]>("/client/inquiries", { signal });
}

export function getInquiry(inquiryId: string, signal?: AbortSignal): Promise<ClientInquiryDetailDto> {
  return api.get<ClientInquiryDetailDto>(`/client/inquiries/${inquiryId}`, { signal });
}

export function cancelInquiry(inquiryId: string, reason?: string | null): Promise<void> {
  return api.post<void>(`/client/inquiries/${inquiryId}/cancel`, { reason: reason ?? null });
}

/** Backend `InquiryStatus` → the label and tone the client-facing UI shows. */
const STATUS_PRESENTATION: Record<string, { label: string; tone: "pending" | "active" | "closed" }> = {
  New: { label: "Submitted", tone: "pending" },
  ManagementReviewing: { label: "Under review", tone: "active" },
  AwaitingClientDetails: { label: "Awaiting your details", tone: "active" },
  CheckingAvailability: { label: "Checking availability", tone: "active" },
  ProposalSent: { label: "Proposal sent", tone: "active" },
  AwaitingClientConfirmation: { label: "Awaiting your confirmation", tone: "active" },
  AcceptedByClient: { label: "Accepted", tone: "active" },
  ConvertedToBooking: { label: "Booked", tone: "closed" },
  Declined: { label: "Declined", tone: "closed" },
  Cancelled: { label: "Cancelled", tone: "closed" },
  Closed: { label: "Closed", tone: "closed" },
};

export function presentStatus(status: string): { label: string; tone: "pending" | "active" | "closed" } {
  return STATUS_PRESENTATION[status] ?? { label: status, tone: "pending" };
}

/** Statuses a client may still cancel from — mirrors `InquiryStatusTransitions.ClientCancellable`. */
const CLIENT_CANCELLABLE = new Set([
  "New",
  "ManagementReviewing",
  "AwaitingClientDetails",
  "CheckingAvailability",
  "ProposalSent",
  "AwaitingClientConfirmation",
]);

export function isCancellable(status: string): boolean {
  return CLIENT_CANCELLABLE.has(status);
}
