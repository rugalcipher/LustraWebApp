import { api } from "@/api/client";
import type { PagedResult } from "@/services/discoveryService";
import type { MediaDto } from "@/services/talentMediaService";

/**
 * The management console — `/api/v1/management/*`.
 *
 * Everything here is permission-gated server-side. The frontend mirrors those permissions
 * only to decide what to RENDER; it is never the authorization boundary, and a hidden
 * button is not a control.
 */

// ---- dashboard -------------------------------------------------------------

/** Mirrors the backend `ManagementDashboardDto`. */
export interface ManagementDashboardDto {
  openInquiries: number;
  proposalsAwaitingResponse: number;
  upcomingBookings: number;
  pendingProfileReviews: number;
  pendingReviewModeration: number;
  submittedReports: number;
  openSafetyCases: number;
  pendingOutboxMessages: number;
  activeTalent: number;
  totalClients: number;
}

export function getDashboard(signal?: AbortSignal): Promise<ManagementDashboardDto> {
  return api.get<ManagementDashboardDto>("/management/dashboard", { signal });
}

// ---- inquiries -------------------------------------------------------------

/** Mirrors the backend `InquiryListItemDto`. */
export interface ManagementInquiryListItemDto {
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

/** Mirrors the backend `ManagementInquiryDetailDto`. */
export interface ManagementInquiryDetailDto extends ManagementInquiryListItemDto {
  clientUserId: string;
  alternativeDate: string | null;
  preferredStartTime: string | null;
  estimatedDurationMinutes: number | null;
  cityName: string | null;
  venueType: string | null;
  attendeeCount: number | null;
  travelRequired: boolean;
  clientMessage: string | null;
  additionalRequirements: string | null;
  history: { fromStatus: string | null; toStatus: string; reason: string | null; createdAtUtc: string }[];
  internalNotes: { id: string; authorUserId: string; note: string; createdAtUtc: string }[];
}

export function listInquiries(
  filters: { status?: string | null; assignedTo?: string | null; page?: number; pageSize?: number } = {},
  signal?: AbortSignal
): Promise<PagedResult<ManagementInquiryListItemDto>> {
  return api.get<PagedResult<ManagementInquiryListItemDto>>("/management/inquiries", {
    query: {
      status: filters.status ?? undefined,
      assignedTo: filters.assignedTo ?? undefined,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
    },
    signal,
  });
}

export function getInquiry(inquiryId: string, signal?: AbortSignal): Promise<ManagementInquiryDetailDto> {
  return api.get<ManagementInquiryDetailDto>(`/management/inquiries/${inquiryId}`, { signal });
}

export function changeInquiryStatus(inquiryId: string, status: string, reason?: string | null): Promise<void> {
  return api.post<void>(`/management/inquiries/${inquiryId}/status`, { status, reason: reason ?? null });
}

export function assignInquiry(inquiryId: string, assignToUserId: string): Promise<void> {
  return api.post<void>(`/management/inquiries/${inquiryId}/assign`, { assignToUserId });
}

export function addInquiryNote(inquiryId: string, note: string): Promise<{ noteId: string }> {
  return api.post<{ noteId: string }>(`/management/inquiries/${inquiryId}/notes`, { note });
}

export function closeInquiry(inquiryId: string, reason?: string | null): Promise<void> {
  return api.post<void>(`/management/inquiries/${inquiryId}/close`, { reason: reason ?? null });
}

export function reopenInquiry(inquiryId: string): Promise<void> {
  return api.post<void>(`/management/inquiries/${inquiryId}/reopen`, undefined);
}

// ---- conversations ---------------------------------------------------------

/** Mirrors the backend `ConversationDetailDto` as management receives it. */
export interface ManagementConversationDto {
  id: string;
  type: string;
  subject: string | null;
  inquiryId: string | null;
  bookingId: string | null;
  lastMessageAtUtc: string | null;
  unreadCount: number;
  /** The talent the thread is ABOUT. Context only — never a participant. */
  talentProfileId?: string | null;
  talentDisplayName?: string | null;
  talentSlug?: string | null;
}

/** Mirrors `ManagementConversationListItemDto` — the inbox row. */
export interface ManagementConversationRowDto {
  id: string;
  type: string;
  subject: string | null;
  clientUserId: string | null;
  clientDisplayName: string | null;
  talentProfileId: string | null;
  talentDisplayName: string | null;
  assignedToUserId: string | null;
  assignedToDisplayName: string | null;
  bookingId: string | null;
  lastMessageAtUtc: string | null;
  unreadCount: number;
}

export interface ManagementConversationFilters {
  type?: string | null;
  assignedTo?: string | null;
  unassignedOnly?: boolean;
  unreadOnly?: boolean;
  search?: string | null;
  page?: number;
}

export function listConversations(
  filters: ManagementConversationFilters = {},
  signal?: AbortSignal
): Promise<PagedResult<ManagementConversationRowDto>> {
  return api.get<PagedResult<ManagementConversationRowDto>>("/management/conversations", {
    query: {
      type: filters.type ?? undefined,
      assignedTo: filters.assignedTo ?? undefined,
      // Only send the booleans when true — an explicit `false` in the query string is
      // noise that changes the cache key for no behavioural difference.
      unassignedOnly: filters.unassignedOnly ? true : undefined,
      unreadOnly: filters.unreadOnly ? true : undefined,
      search: filters.search?.trim() || undefined,
      page: filters.page ?? 1,
      pageSize: 50,
    },
    signal,
  });
}

export function getConversation(conversationId: string, signal?: AbortSignal) {
  return api.get<ManagementConversationDto>(`/management/conversations/${conversationId}`, { signal });
}

/**
 * Mirrors `ManagementClientSummaryDto`.
 *
 * Everything here is information management is authorised to hold. None of it may be
 * forwarded to a talent — management is always the intermediary.
 */
export interface ManagementClientSummaryDto {
  userId: string;
  displayName: string;
  preferredName: string | null;
  email: string | null;
  phoneNumber: string | null;
  contactPreference: string;
  preferredCityName: string | null;
  engagementPreferences: string | null;
  isVerified: boolean;
  hasActiveVip: boolean;
  memberSinceUtc: string;
}

export function getConversationClientSummary(conversationId: string, signal?: AbortSignal) {
  return api.get<ManagementClientSummaryDto>(
    `/management/conversations/${conversationId}/client-summary`,
    { signal }
  );
}

/** Mirrors `ConversationAppointmentSummaryDto`; null when no appointment exists yet. */
export interface ConversationAppointmentSummaryDto {
  bookingId: string;
  bookingReference: string;
  status: string;
  talentProfileId: string;
  talentDisplayName: string;
  confirmedDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
}

export function getConversationAppointment(conversationId: string, signal?: AbortSignal) {
  return api.get<ConversationAppointmentSummaryDto | null>(
    `/management/conversations/${conversationId}/appointment`,
    { signal }
  );
}

export function assignConversation(conversationId: string, assignToUserId: string): Promise<void> {
  return api.post<void>(`/management/conversations/${conversationId}/assign`, { assignToUserId });
}

/** A staff-only note on a conversation. Never rendered in the message thread. */
export interface ConversationNoteDto {
  id: string;
  authorUserId: string;
  note: string;
  createdAtUtc: string;
}

export function listConversationNotes(conversationId: string, signal?: AbortSignal) {
  return api.get<ConversationNoteDto[]>(`/management/conversations/${conversationId}/notes`, { signal });
}

export function addConversationNote(conversationId: string, note: string) {
  return api.post<{ noteId: string }>(`/management/conversations/${conversationId}/notes`, { note });
}

/**
 * Post a message as management.
 *
 * Multipart, matching the client and talent endpoints — the controller binds `body` and
 * an optional `file`, so a JSON body would not bind at all.
 */
export function postMessage(
  conversationId: string,
  input: { body?: string | null; file?: File | null }
) {
  const form = new FormData();
  if (input.body) form.append("body", input.body);
  if (input.file) form.append("file", input.file);
  return api.postForm(`/management/conversations/${conversationId}/messages`, form);
}

export function markConversationRead(conversationId: string): Promise<void> {
  return api.post<void>(`/management/conversations/${conversationId}/read`, undefined);
}

// ---- talent lifecycle ------------------------------------------------------

/**
 * Talent lifecycle — distinct from profile CONTENT, which goes through draft/review.
 * These change whether an already-approved profile is visible or promoted.
 */
export function pauseTalent(profileId: string, reason: string): Promise<void> {
  return api.post<void>(`/management/talents/${profileId}/pause`, { reason });
}

export function resumeTalent(profileId: string): Promise<void> {
  return api.post<void>(`/management/talents/${profileId}/resume`, undefined);
}

export function suspendTalent(profileId: string, reason: string): Promise<void> {
  return api.post<void>(`/management/talents/${profileId}/suspend`, { reason });
}

export function setTalentFeatured(profileId: string, isFeatured: boolean): Promise<void> {
  return api.post<void>(`/management/talents/${profileId}/featured`, { isFeatured });
}

// ---- moderation: profiles --------------------------------------------------

/** Mirrors the backend `ProfileReviewListItemDto`. */
export interface ProfileReviewListItemDto {
  talentProfileId: string;
  userId: string;
  displayName: string;
  profileStatus: string;
  submittedAtUtc: string | null;
}

export function listProfileReviews(
  status?: string | null,
  signal?: AbortSignal
): Promise<ProfileReviewListItemDto[]> {
  return api.get<ProfileReviewListItemDto[]>("/management/profile-reviews", {
    query: { status: status ?? undefined },
    signal,
  });
}

/**
 * Approve a submitted profile.
 *
 * APPROVING IS NOT PUBLISHING. Approval records that the content passed review;
 * `publishImmediately` is what puts a real person on the public site. Default false, so
 * a reviewer who just wants to clear the queue never publishes by accident.
 */
export function approveProfile(
  profileId: string,
  changeSummary?: string | null,
  publishImmediately = false
): Promise<void> {
  return api.post<void>(`/management/profile-reviews/${profileId}/approve`, {
    changeSummary: changeSummary ?? null,
    publishImmediately,
  });
}

/** Publish an already-approved profile into public discovery. */
export function publishProfile(profileId: string): Promise<void> {
  return api.post<void>(`/management/profile-reviews/${profileId}/publish`, undefined);
}

/**
 * Withdraw a profile from public discovery, leaving it approved so it can be republished
 * without a second review.
 */
export function unpublishProfile(profileId: string, reason?: string | null): Promise<void> {
  return api.post<void>(`/management/profile-reviews/${profileId}/unpublish`, {
    reason: reason ?? null,
  });
}

export function rejectProfile(profileId: string, reason: string): Promise<void> {
  return api.post<void>(`/management/profile-reviews/${profileId}/reject`, { reason });
}

export function requestProfileChanges(profileId: string, reason: string): Promise<void> {
  return api.post<void>(`/management/profile-reviews/${profileId}/request-changes`, { reason });
}

// ---- moderation: media -----------------------------------------------------

export function listMediaReviews(status?: string | null, signal?: AbortSignal): Promise<MediaDto[]> {
  return api.get<MediaDto[]>("/management/media-reviews", {
    query: { status: status ?? undefined },
    signal,
  });
}

/**
 * Approve a media item, optionally setting its visibility.
 *
 * Visibility is the consequential part: `VipOnly` restricts the item to clients holding a
 * VIP entitlement, `Public` publishes it to everyone. It is management's decision alone —
 * a talent cannot set it.
 */
export function approveMedia(mediaId: string, visibility?: string | null): Promise<void> {
  return api.post<void>(`/management/media-reviews/${mediaId}/approve`, {
    visibility: visibility ?? null,
  });
}

export function rejectMedia(mediaId: string, reason: string): Promise<void> {
  return api.post<void>(`/management/media-reviews/${mediaId}/reject`, { reason });
}

export function revokeMediaPublication(mediaId: string): Promise<void> {
  return api.post<void>(`/management/media-reviews/${mediaId}/revoke-publication`, undefined);
}

/** The visibilities management may assign on approval. */
export const APPROVAL_VISIBILITIES = [
  { value: "Public", label: "Public", detail: "Visible to everyone, including guests." },
  { value: "VipOnly", label: "VIP only", detail: "Visible only to clients holding VIP access." },
  { value: "Private", label: "Private", detail: "Visible to the talent and Lustra only." },
  { value: "ManagementOnly", label: "Management only", detail: "Visible to Lustra staff only." },
] as const;

// ---- moderation: reviews ---------------------------------------------------

/** Mirrors the backend `ManagementReviewDto`. */
export interface ManagementReviewDto {
  id: string;
  bookingId: string;
  clientUserId: string;
  talentProfileId: string;
  talentDisplayName: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  moderationReason: string | null;
  moderatedByUserId: string | null;
  moderatedAtUtc: string | null;
  talentResponse: string | null;
  createdAtUtc: string;
}

export function listReviewModeration(
  status?: string | null,
  page = 1,
  pageSize = 20,
  signal?: AbortSignal
): Promise<PagedResult<ManagementReviewDto>> {
  return api.get<PagedResult<ManagementReviewDto>>("/management/reviews", {
    query: { status: status ?? undefined, page, pageSize },
    signal,
  });
}

export function approveReview(reviewId: string): Promise<void> {
  return api.post<void>(`/management/reviews/${reviewId}/approve`, undefined);
}

export function rejectReview(reviewId: string, reason?: string | null): Promise<void> {
  return api.post<void>(`/management/reviews/${reviewId}/reject`, { reason: reason ?? null });
}

export function hideReview(reviewId: string, reason?: string | null): Promise<void> {
  return api.post<void>(`/management/reviews/${reviewId}/hide`, { reason: reason ?? null });
}

// ---- VIP entitlements ------------------------------------------------------

/** Mirrors the backend `ManagementVipRequestDto`. */
export interface ManagementVipRequestDto {
  id: string;
  clientUserId: string;
  clientEmail: string;
  clientPreferredName: string | null;
  status: string;
  message: string | null;
  decidedByUserId: string | null;
  decidedAtUtc: string | null;
  decisionNote: string | null;
  grantedEntitlementId: string | null;
  createdAtUtc: string;
}

/** Mirrors the backend `ManagementEntitlementDto`. */
export interface ManagementEntitlementDto {
  id: string;
  clientUserId: string;
  clientEmail: string;
  type: string;
  status: string;
  isActive: boolean;
  grantedAtUtc: string;
  grantedByUserId: string;
  expiresAtUtc: string | null;
  revokedAtUtc: string | null;
  revokedByUserId: string | null;
  internalNote: string | null;
}

export function listVipRequests(
  status?: string | null,
  page = 1,
  pageSize = 20,
  signal?: AbortSignal
): Promise<PagedResult<ManagementVipRequestDto>> {
  return api.get<PagedResult<ManagementVipRequestDto>>("/management/vip-requests", {
    query: { status: status ?? undefined, page, pageSize },
    signal,
  });
}

export function approveVipRequest(
  requestId: string,
  expiresAtUtc: string | null,
  internalNote: string | null
): Promise<{ entitlementId: string }> {
  return api.post<{ entitlementId: string }>(`/management/vip-requests/${requestId}/approve`, {
    expiresAtUtc,
    internalNote,
  });
}

export function declineVipRequest(requestId: string, reason: string): Promise<void> {
  return api.post<void>(`/management/vip-requests/${requestId}/decline`, { reason });
}

export function listClientEntitlements(
  clientUserId: string,
  signal?: AbortSignal
): Promise<ManagementEntitlementDto[]> {
  return api.get<ManagementEntitlementDto[]>(`/management/clients/${clientUserId}/entitlements`, { signal });
}

export function grantEntitlement(
  clientUserId: string,
  expiresAtUtc: string | null,
  internalNote: string | null
): Promise<{ entitlementId: string }> {
  return api.post<{ entitlementId: string }>(`/management/clients/${clientUserId}/entitlements`, {
    expiresAtUtc,
    internalNote,
  });
}

export function revokeEntitlement(entitlementId: string, reason: string): Promise<void> {
  return api.post<void>(`/management/entitlements/${entitlementId}/revoke`, { reason });
}

// ---- presentation ----------------------------------------------------------

/**
 * Backend `InquiryStatus` → the pipeline column it belongs in.
 *
 * The pipeline is a view over real statuses, not a parallel state machine. A status with
 * no column would make an inquiry invisible to the team working the queue, so the
 * fallback is "New" rather than dropping it.
 */
export const PIPELINE_COLUMNS = [
  { id: "New", label: "New" },
  { id: "Reviewing", label: "Reviewing" },
  { id: "Proposal", label: "Proposal" },
  { id: "Closed", label: "Closed" },
] as const;

export type PipelineColumn = (typeof PIPELINE_COLUMNS)[number]["id"];

const STATUS_COLUMN: Record<string, PipelineColumn> = {
  New: "New",
  ManagementReviewing: "Reviewing",
  AwaitingClientDetails: "Reviewing",
  CheckingAvailability: "Reviewing",
  ProposalSent: "Proposal",
  AwaitingClientConfirmation: "Proposal",
  AcceptedByClient: "Proposal",
  ConvertedToBooking: "Closed",
  Declined: "Closed",
  Cancelled: "Closed",
  Closed: "Closed",
};

export function columnFor(status: string): PipelineColumn {
  return STATUS_COLUMN[status] ?? "New";
}

/** Every backend `InquiryStatus`, for the status picker. */
export const INQUIRY_STATUSES = Object.keys(STATUS_COLUMN);

/** Backend `InquiryPriority` → tone. */
export function priorityTone(priority: string): "high" | "normal" | "low" {
  if (priority === "High" || priority === "Urgent") return "high";
  if (priority === "Low") return "low";
  return "normal";
}

// ---- client directory ------------------------------------------------------

/**
 * The client directory — a management OPERATIONAL TOOL for finding the person you are
 * talking to and opening their conversation.
 *
 * It is not a booking system and must never become one. There is no create, no confirm
 * and no schedule here.
 */
export interface ManagementClientListItemDto {
  userId: string;
  displayName: string;
  preferredName: string | null;
  email: string | null;
  phoneNumber: string | null;
  preferredCityName: string | null;
  isVerified: boolean;
  hasActiveVip: boolean;
  conversationCount: number;
  memberSinceUtc: string;
}

export interface ManagementClientConversationDto {
  conversationId: string;
  subject: string | null;
  talentProfileId: string | null;
  talentDisplayName: string | null;
  bookingId: string | null;
  lastMessageAtUtc: string | null;
}

export function listClients(
  filters: { search?: string | null; page?: number } = {},
  signal?: AbortSignal
): Promise<PagedResult<ManagementClientListItemDto>> {
  return api.get<PagedResult<ManagementClientListItemDto>>("/management/clients", {
    query: {
      search: filters.search?.trim() || undefined,
      page: filters.page ?? 1,
      pageSize: 25,
    },
    signal,
  });
}

export function listClientConversations(clientUserId: string, signal?: AbortSignal) {
  return api.get<ManagementClientConversationDto[]>(
    `/management/clients/${clientUserId}/conversations`,
    { signal }
  );
}

// ---- analytics -------------------------------------------------------------

/** Mirrors `ExecutiveAnalyticsDto`. */
export interface ExecutiveAnalyticsDto {
  totalClients: number;
  totalTalent: number;
  approvedTalent: number;
  totalInquiries: number;
  totalBookings: number;
  completedBookings: number;
  inquiryToBookingConversionRate: number;
  totalConfirmedValue: number;
  currencyCode: string;
  averageTalentRating: number;
  totalReviews: number;
}

/** Mirrors `ClientAnalyticsDto`. */
export interface ClientAnalyticsDto {
  totalClients: number;
  newClientsLast30Days: number;
  clientsWithBookings: number;
  registrationsByMonth: { period: string; count: number }[];
}

/** Mirrors `TalentAnalyticsDto`. */
export interface TalentAnalyticsDto {
  totalTalent: number;
  approvedTalent: number;
  averageRating: number;
  totalReviews: number;
  byStatus: { label: string; count: number }[];
  topByBookings: { talentProfileId: string; displayName: string; value: number }[];
  topByRating: { talentProfileId: string; displayName: string; value: number }[];
}

export function getExecutiveAnalytics(signal?: AbortSignal) {
  return api.get<ExecutiveAnalyticsDto>("/management/analytics/executive", { signal });
}

export function getClientAnalytics(signal?: AbortSignal) {
  return api.get<ClientAnalyticsDto>("/management/analytics/clients", { signal });
}

export function getTalentAnalytics(signal?: AbortSignal) {
  return api.get<TalentAnalyticsDto>("/management/analytics/talent", { signal });
}
