import { api } from "@/api/client";
import { putToStorage } from "@/services/directUpload";
import type { PagedResult } from "@/services/discoveryService";

/**
 * Public talent applications and management review.
 *
 * Mirrors `docs/integration/FULL_SYSTEM_EXPANSION_CONTRACT.md` §1–§2 and the
 * DTO records in `Lustra.Application/TalentApplications/Models.cs`. Paths omit
 * `/api/v1` because `VITE_API_BASE_URL` already carries it.
 *
 * The applicant has no account. Their key is an opaque token sent in the
 * `X-Application-Token` header and NEVER in a URL: a query-string token reaches
 * access logs, proxy logs, browser history and the `Referer` header sent to
 * third parties. `applicationId` alone is not authentication.
 */

/** The header the API reads the applicant's token from. */
export const APPLICATION_TOKEN_HEADER = "X-Application-Token";

const PUBLIC = "/public/talent-applications";
const MANAGEMENT = "/management/talent-applications";

const tokenHeader = (token: string) => ({ [APPLICATION_TOKEN_HEADER]: token });

// ---- applicant-facing DTOs -------------------------------------------------

/** Mirrors `TalentApplicationDetails` / `CreateTalentApplicationRequest`. */
export interface TalentApplicationDetails {
  legalFirstName: string;
  legalMiddleNames?: string | null;
  legalSurname: string;
  requestedDisplayName: string;
  email: string;
  cellphoneNumber: string;
  whatsAppNumber?: string | null;
  instagram?: string | null;
  additionalSocialUrl?: string | null;
  cityId?: string | null;
  cityFreeText?: string | null;
  /** ISO date (yyyy-MM-dd) — the API binds a DateOnly. */
  dateOfBirth: string;
  isAdultDeclared: boolean;
  shortBiography: string;
  requestedHourlyRate?: number | null;
  currencyCode?: string | null;
  publishOnApproval: boolean;
  consentToContact: boolean;
}

/** Mirrors `CreatedTalentApplicationDto`. `accessToken` is returned ONCE. */
export interface CreatedTalentApplicationDto {
  applicationId: string;
  reference: string;
  status: string;
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  minimumPhotographs: number;
  maximumPhotographs: number;
}

/** Mirrors `TalentApplicationMediaDto`. Carries no URL — application photos are private. */
export interface TalentApplicationMediaDto {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isCover: boolean;
  uploadStatus: string;
  createdAtUtc: string;
}

/** Mirrors `TalentApplicationStatusDto` — the applicant-safe view. No internal notes. */
export interface TalentApplicationStatusDto {
  applicationId: string;
  reference: string;
  status: string;
  requestedDisplayName: string;
  createdAtUtc: string;
  submittedAtUtc: string | null;
  decisionReason: string | null;
  isEditable: boolean;
  minimumPhotographs: number;
  maximumPhotographs: number;
  media: TalentApplicationMediaDto[];
}

/** Mirrors the existing `UploadTicketDto`. */
export interface UploadTicketDto {
  mediaId: string;
  uploadUrl: string;
  httpMethod: string;
  storageKey: string;
  /** The exact content type the URL was signed with. Send this, never `file.type`. */
  contentType: string;
  /**
   * Every header the PUT must carry — and, by omission, every header it must
   * not. Supplied by the server so the contract lives in one place.
   */
  requiredHeaders?: Record<string, string> | null;
  expiresAtUtc: string;
}

/** Mirrors `SubmittedTalentApplicationDto`. */
export interface SubmittedTalentApplicationDto {
  applicationId: string;
  reference: string;
  status: string;
  submittedAtUtc: string;
  statusToken: string;
  statusTokenExpiresAtUtc: string;
}

/** Mirrors `TalentApplicationMediaOrderItem`. */
export interface TalentApplicationMediaOrderItem {
  mediaId: string;
  sortOrder: number;
  isCover: boolean;
}

// ---- applicant-facing calls ------------------------------------------------

/** Starts an application. Anonymous — this is the only call without a token. */
export function createApplication(
  details: TalentApplicationDetails
): Promise<CreatedTalentApplicationDto> {
  return api.post<CreatedTalentApplicationDto>(PUBLIC, details, { anonymous: true });
}

export function updateApplication(
  id: string,
  token: string,
  details: TalentApplicationDetails
): Promise<TalentApplicationStatusDto> {
  return api.put<TalentApplicationStatusDto>(`${PUBLIC}/${id}`, details, {
    anonymous: true,
    headers: tokenHeader(token),
  });
}

export function getApplicationStatus(
  id: string,
  token: string,
  signal?: AbortSignal
): Promise<TalentApplicationStatusDto> {
  return api.get<TalentApplicationStatusDto>(`${PUBLIC}/${id}/status`, {
    anonymous: true,
    headers: tokenHeader(token),
    signal,
  });
}

/**
 * Mirrors `TalentApplicationDetailsDto` — everything the applicant typed.
 *
 * Hand-built server-side rather than projected from the entity, so adding a
 * management field cannot silently start disclosing it. Carries no internal
 * note, no reviewer identity, no review timestamp and no audit field; the only
 * management text is `decisionReason`, written knowing they would read it.
 */
export interface TalentApplicationDetailsDto {
  applicationId: string;
  reference: string;
  status: string;
  isEditable: boolean;
  legalFirstName: string;
  legalMiddleNames: string | null;
  legalSurname: string;
  requestedDisplayName: string;
  email: string;
  cellphoneNumber: string;
  whatsAppNumber: string | null;
  instagramUrl: string | null;
  additionalSocialUrl: string | null;
  cityId: string | null;
  cityFreeText: string | null;
  dateOfBirth: string;
  shortBiography: string;
  requestedHourlyRate: number | null;
  currencyCode: string | null;
  publishOnApproval: boolean;
  decisionReason: string | null;
  minimumPhotographs: number;
  maximumPhotographs: number;
  media: TalentApplicationMediaDto[];
  createdAtUtc: string;
  submittedAtUtc: string | null;
}

/**
 * The applicant's own details, for resuming after changes were requested.
 *
 * Read-only, so any token scope is accepted. This is what removes the
 * "retype your legal name and date of birth to fix one photograph" problem —
 * the form is repopulated from what they already sent.
 */
export function getApplicationDetails(
  id: string,
  token: string,
  signal?: AbortSignal
): Promise<TalentApplicationDetailsDto> {
  return api.get<TalentApplicationDetailsDto>(`${PUBLIC}/${id}/details`, {
    anonymous: true,
    headers: tokenHeader(token),
    signal,
  });
}

export function requestUpload(
  id: string,
  token: string,
  request: { contentType: string; expectedSizeBytes: number; fileName: string }
): Promise<UploadTicketDto> {
  return api.post<UploadTicketDto>(`${PUBLIC}/${id}/media/request-upload`, request, {
    anonymous: true,
    headers: tokenHeader(token),
  });
}

/**
 * Uploads the bytes straight to the presigned R2 URL.
 *
 * Delegates to the shared direct-upload helper. This surface is anonymous and
 * carries `X-Application-Token` on its API calls, which makes it the one most
 * likely to leak a credential onto the object store by accident — so it goes
 * through the same single path as every other upload rather than its own.
 */
export function uploadToStorage(
  ticket: UploadTicketDto,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<void> {
  return putToStorage(ticket, file, onProgress);
}

/** Confirms the object landed. Until this succeeds the photograph does not exist. */
export function finalizeUpload(
  id: string,
  token: string,
  mediaId: string
): Promise<TalentApplicationMediaDto> {
  return api.post<TalentApplicationMediaDto>(
    `${PUBLIC}/${id}/media/${mediaId}/finalize`,
    {},
    { anonymous: true, headers: tokenHeader(token) }
  );
}

export function deleteMedia(id: string, token: string, mediaId: string): Promise<void> {
  return api.delete<void>(`${PUBLIC}/${id}/media/${mediaId}`, {
    anonymous: true,
    headers: tokenHeader(token),
  });
}

export function reorderMedia(
  id: string,
  token: string,
  items: TalentApplicationMediaOrderItem[]
): Promise<TalentApplicationStatusDto> {
  return api.post<TalentApplicationStatusDto>(
    `${PUBLIC}/${id}/media/reorder`,
    { items },
    { anonymous: true, headers: tokenHeader(token) }
  );
}

/** Final submission. Revokes the editing token and returns a status-only one. */
export function submitApplication(
  id: string,
  token: string
): Promise<SubmittedTalentApplicationDto> {
  return api.post<SubmittedTalentApplicationDto>(
    `${PUBLIC}/${id}/submit`,
    {},
    { anonymous: true, headers: tokenHeader(token) }
  );
}

export function withdrawApplication(id: string, token: string): Promise<TalentApplicationStatusDto> {
  return api.post<TalentApplicationStatusDto>(
    `${PUBLIC}/${id}/withdraw`,
    {},
    { anonymous: true, headers: tokenHeader(token) }
  );
}

// ---- management-facing DTOs ------------------------------------------------

/** Mirrors `TalentApplicationListItemDto`. */
export interface TalentApplicationListItemDto {
  id: string;
  reference: string;
  requestedDisplayName: string;
  legalFullName: string;
  email: string;
  cityName: string | null;
  cityFreeText: string | null;
  age: number;
  status: string;
  publishOnApproval: boolean;
  photographCount: number;
  submittedAtUtc: string | null;
  createdAtUtc: string;
  reviewedByUserId: string | null;
  reviewedAtUtc: string | null;
}

/** Mirrors `TalentApplicationNoteDto`. Management-only — never shown to an applicant. */
export interface TalentApplicationNoteDto {
  id: string;
  authorUserId: string;
  authorDisplayName: string | null;
  note: string;
  createdAtUtc: string;
}

/** Mirrors `TalentApplicationDetailDto`. */
export interface TalentApplicationDetailDto {
  id: string;
  reference: string;
  status: string;
  legalFirstName: string;
  legalMiddleNames: string | null;
  legalSurname: string;
  requestedDisplayName: string;
  email: string;
  cellphoneNumber: string;
  whatsAppNumber: string | null;
  instagramUrl: string | null;
  additionalSocialUrl: string | null;
  cityId: string | null;
  cityName: string | null;
  cityFreeText: string | null;
  dateOfBirth: string;
  age: number;
  shortBiography: string;
  requestedHourlyRate: number | null;
  currencyCode: string | null;
  publishOnApproval: boolean;
  isAdultDeclared: boolean;
  consentToContact: boolean;
  submittedAtUtc: string | null;
  createdAtUtc: string;
  reviewedByUserId: string | null;
  reviewedAtUtc: string | null;
  decisionReason: string | null;
  convertedTalentProfileId: string | null;
  convertedUserId: string | null;
  convertedAtUtc: string | null;
  media: TalentApplicationMediaDto[];
  notes: TalentApplicationNoteDto[];
}

/** Mirrors `TalentApplicationMediaUrlDto`. */
export interface TalentApplicationMediaUrlDto {
  url: string;
  expiresAtUtc: string;
}

/** Mirrors `ApproveTalentApplicationRequest`. */
export interface ApproveTalentApplicationRequest {
  createLogin: boolean;
  sendActivationEmail: boolean;
  publishImmediately: boolean;
  /** Omit/null copies every photograph; an explicit empty list copies none. */
  mediaIdsToCopy?: string[] | null;
  changeSummary?: string | null;
}

/** Mirrors `TalentApplicationApprovalDto`. */
export interface TalentApplicationApprovalDto {
  applicationId: string;
  talentProfileId: string;
  userId: string | null;
  invitationId: string | null;
  loginCreated: boolean;
  activationEmailSent: boolean;
  published: boolean;
  mediaCopied: number;
  status: string;
}

export interface TalentApplicationSearch {
  status?: string | null;
  search?: string | null;
  cityId?: string | null;
  publishOnApproval?: boolean | null;
  fromUtc?: string | null;
  toUtc?: string | null;
  page?: number;
  pageSize?: number;
}

// ---- management-facing calls -----------------------------------------------

export function listApplications(
  filters: TalentApplicationSearch = {},
  signal?: AbortSignal
): Promise<PagedResult<TalentApplicationListItemDto>> {
  return api.get<PagedResult<TalentApplicationListItemDto>>(MANAGEMENT, {
    query: {
      status: filters.status?.trim() || undefined,
      search: filters.search?.trim() || undefined,
      cityId: filters.cityId || undefined,
      publishOnApproval: filters.publishOnApproval ?? undefined,
      fromUtc: filters.fromUtc || undefined,
      toUtc: filters.toUtc || undefined,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    },
    signal,
  });
}

export function getApplication(id: string, signal?: AbortSignal): Promise<TalentApplicationDetailDto> {
  return api.get<TalentApplicationDetailDto>(`${MANAGEMENT}/${id}`, { signal });
}

/** A short-lived authorised URL for ONE photograph, minted for this reviewer. */
export function getMediaUrl(
  id: string,
  mediaId: string,
  signal?: AbortSignal
): Promise<TalentApplicationMediaUrlDto> {
  return api.get<TalentApplicationMediaUrlDto>(`${MANAGEMENT}/${id}/media/${mediaId}/url`, { signal });
}

export function addNote(id: string, note: string): Promise<TalentApplicationNoteDto> {
  return api.post<TalentApplicationNoteDto>(`${MANAGEMENT}/${id}/notes`, { note });
}

export function markUnderReview(id: string): Promise<TalentApplicationDetailDto> {
  return api.post<TalentApplicationDetailDto>(`${MANAGEMENT}/${id}/under-review`, {});
}

export function requestChanges(id: string, reason: string): Promise<TalentApplicationDetailDto> {
  return api.post<TalentApplicationDetailDto>(`${MANAGEMENT}/${id}/request-changes`, { reason });
}

export function rejectApplication(id: string, reason: string): Promise<TalentApplicationDetailDto> {
  return api.post<TalentApplicationDetailDto>(`${MANAGEMENT}/${id}/reject`, { reason });
}

/** Approval is transactional and idempotent — the key makes a retry safe. */
export function approveApplication(
  id: string,
  request: ApproveTalentApplicationRequest,
  idempotencyKey: string
): Promise<TalentApplicationApprovalDto> {
  return api.post<TalentApplicationApprovalDto>(`${MANAGEMENT}/${id}/approve`, request, {
    idempotencyKey,
  });
}

/** Application statuses, in lifecycle order. */
export const APPLICATION_STATUSES = [
  "Draft",
  "Submitted",
  "UnderReview",
  "ChangesRequested",
  "Approved",
  "ConvertedToTalent",
  "Rejected",
  "Withdrawn",
] as const;

/** Refusal codes the UI branches on. The API sends these as `errorCode`. */
export const APPLICATION_ERROR_CODES = {
  adultDeclarationRequired: "talent_application.adult_declaration_required",
  underAge: "talent_application.under_age",
  consentRequired: "talent_application.consent_required",
  duplicateActive: "talent_application.duplicate_active",
  alreadyTalent: "talent_application.already_talent",
  tooFewPhotographs: "talent_application.too_few_photographs",
  tokenReadOnly: "talent_application.token_read_only",
  mediaSelectionInvalid: "talent_application.media_selection_invalid",
  notPublishable: "talent_application.not_publishable",
} as const;
