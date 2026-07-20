import { api } from "@/api/client";

/**
 * Client proposals — `/api/v1/client/proposals`.
 *
 * A proposal is management's formal OFFER against an inquiry. Accepting it does NOT
 * create a booking: management confirms bookings separately, and nothing on this
 * platform takes payment. The copy in this module must never imply otherwise.
 */

/** Mirrors the backend `ProposalListItemDto`. */
export interface ProposalListItemDto {
  id: string;
  inquiryId: string;
  talentProfileId: string;
  talentDisplayName: string;
  status: string;
  proposedDate: string | null;
  agreedAmount: number | null;
  currencyCode: string;
  expiresAtUtc: string | null;
  createdAtUtc: string;
}

/** Mirrors the backend `ClientProposalDto`. Deliberately has no `internalNotes`. */
export interface ClientProposalDto {
  id: string;
  inquiryId: string;
  talentProfileId: string;
  talentDisplayName: string;
  engagementCategory: string;
  status: string;
  proposedDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  cityName: string | null;
  venueType: string | null;
  venueName: string | null;
  generalLocation: string | null;
  startingAmount: number | null;
  agreedAmount: number | null;
  additionalCosts: number | null;
  currencyCode: string;
  cancellationTerms: string | null;
  clientVisibleNotes: string | null;
  expiresAtUtc: string | null;
  sentAtUtc: string | null;
  createdAtUtc: string;
}

export function listProposals(signal?: AbortSignal): Promise<ProposalListItemDto[]> {
  return api.get<ProposalListItemDto[]>("/client/proposals", { signal });
}

export function getProposal(proposalId: string, signal?: AbortSignal): Promise<ClientProposalDto> {
  return api.get<ClientProposalDto>(`/client/proposals/${proposalId}`, { signal });
}

export function acceptProposal(proposalId: string): Promise<void> {
  return api.post<void>(`/client/proposals/${proposalId}/accept`, undefined);
}

export function declineProposal(proposalId: string, reason?: string | null): Promise<void> {
  return api.post<void>(`/client/proposals/${proposalId}/decline`, { reason: reason ?? null });
}

export function requestProposalChange(proposalId: string, message: string): Promise<void> {
  return api.post<void>(`/client/proposals/${proposalId}/request-change`, { message });
}

/**
 * Backend `BookingProposalStatus` → client-facing label and tone.
 *
 * `Draft` is absent on purpose: the API never returns drafts to a client, so a draft
 * label here would be dead code that implies clients can see unsent offers.
 */
const STATUS_PRESENTATION: Record<string, { label: string; tone: "action" | "active" | "closed" }> = {
  Sent: { label: "Awaiting your response", tone: "action" },
  ChangeRequested: { label: "Changes requested", tone: "active" },
  Accepted: { label: "Accepted", tone: "active" },
  ConvertedToBooking: { label: "Booked", tone: "closed" },
  Declined: { label: "Declined", tone: "closed" },
  Expired: { label: "Expired", tone: "closed" },
  Withdrawn: { label: "Withdrawn", tone: "closed" },
};

export function presentProposalStatus(status: string): {
  label: string;
  tone: "action" | "active" | "closed";
} {
  return STATUS_PRESENTATION[status] ?? { label: status, tone: "active" };
}

/**
 * Whether the client may still act on this proposal.
 *
 * Mirrors `BookingProposalStatusTransitions`: only a `Sent` proposal accepts a client
 * response. This is a UI affordance, never a security control — the server re-checks.
 */
export function isAwaitingResponse(status: string): boolean {
  return status === "Sent";
}

/** True when a `Sent` proposal has passed its expiry but the expiry job has not run yet. */
export function hasLapsed(proposal: {
  status: string;
  expiresAtUtc: string | null;
}): boolean {
  if (proposal.status !== "Sent" || !proposal.expiresAtUtc) return false;
  return new Date(proposal.expiresAtUtc).getTime() <= Date.now();
}

/**
 * The amount the client should read as the offer.
 *
 * `agreedAmount` is the negotiated figure; `startingAmount` is the opening one. Returns
 * null when neither is set — the UI then says "On request" rather than inventing a zero.
 */
export function proposalAmount(proposal: {
  agreedAmount: number | null;
  startingAmount?: number | null;
}): number | null {
  return proposal.agreedAmount ?? proposal.startingAmount ?? null;
}
