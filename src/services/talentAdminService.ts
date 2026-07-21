import { api } from "@/api/client";
import type { PagedResult } from "@/services/discoveryService";

/**
 * Direct creation and full administration of talent.
 *
 * Mirrors `ManagementTalentAdminController` and
 * `Lustra.Application/Talent/Administration/Models.cs` exactly. Complements the
 * existing invitation/notes/lifecycle and profile-review routes rather than
 * replacing them — approving and publishing a profile still happen there.
 *
 * Two facts the UI must not soften:
 *
 *  - **The account is always created.** `TalentProfiles.UserId` is non-nullable
 *    and unique, so an ownerless profile cannot exist. `loginMode` decides only
 *    whether the person is handed a way in.
 *  - **Passwords are write-only.** Staff can replace one, require it changed, or
 *    invite someone to set their own. A temporary password is returned exactly
 *    once, in the response that created it, and is obtainable from no other
 *    route. Nothing here ever reads an existing password, a hash or a token.
 */

const BASE = "/management/talents";

/** How a directly-created talent gets (or does not get) a way to sign in. */
export const TALENT_LOGIN_MODES = {
  /** Account exists, cannot sign in, nobody contacted. "Profile exists, login not active yet." */
  none: "None",
  /** An activation invitation is issued and emailed. The preferred route. */
  invitation: "Invitation",
  /** A temporary password is set and returned once, for onboarding in person. */
  temporaryPassword: "TemporaryPassword",
} as const;

export type TalentLoginMode = (typeof TALENT_LOGIN_MODES)[keyof typeof TALENT_LOGIN_MODES];

/** Mirrors `TalentRateInput`. */
export interface TalentRateInput {
  label: string;
  unit: string;
  amount: number;
  currencyCode: string;
  isPublic: boolean;
  notes?: string | null;
}

/** Mirrors `TalentProfileFields` — the body of both create and update. */
export interface TalentProfileFields {
  displayName: string;
  legalFirstName?: string | null;
  legalSurname?: string | null;
  headline?: string | null;
  shortBiography?: string | null;
  fullBiography?: string | null;
  /** ISO date (yyyy-MM-dd) — the API binds a DateOnly. */
  dateOfBirth?: string | null;
  isAgePublic: boolean;
  cityId?: string | null;
  regionId?: string | null;
  cellphoneNumber?: string | null;
  whatsAppNumber?: string | null;
  instagramUrl?: string | null;
  additionalSocialUrl?: string | null;
  availabilityStatus?: string | null;
  travelAvailable: boolean;
  eventAvailable: boolean;
  categoryIds?: string[] | null;
  rates?: TalentRateInput[] | null;
}

/** Mirrors `CreateTalentRequest`. */
export interface CreateTalentRequest {
  email: string;
  profile: TalentProfileFields;
  loginMode: TalentLoginMode;
  publishImmediately: boolean;
  isFeatured: boolean;
  internalNote?: string | null;
}

/**
 * Mirrors `CreatedTalentDto`.
 *
 * `temporaryPassword` is populated ONLY on the creating response and only when
 * that login mode was chosen. It is never stored in plaintext, never logged,
 * never audited and never returned again — re-reading the talent will not
 * produce it.
 */
export interface CreatedTalentDto {
  talentProfileId: string;
  userId: string;
  slug: string;
  accountStatus: string;
  loginMode: string;
  invitationId: string | null;
  activationUrl: string | null;
  temporaryPassword: string | null;
  published: boolean;
  activationEmailSent: boolean;
}

/** Mirrors `TalentAdminSearchRequest`. */
export interface TalentAdminSearch {
  query?: string | null;
  status?: string | null;
  isPublic?: boolean | null;
  isFeatured?: boolean | null;
  cityId?: string | null;
  categoryId?: string | null;
  accountStatus?: string | null;
  hasActiveLogin?: boolean | null;
  hasPendingInvitation?: boolean | null;
  pendingProfileReview?: boolean | null;
  /**
   * Profiles that are public or featured while failing the current publication
   * rules. Evaluated server-side before paging, so it audits the whole roster
   * rather than the page in hand.
   */
  hasPublicationIssue?: boolean | null;
  page?: number;
  pageSize?: number;
}

/**
 * The machine-readable reasons the backend gives for a profile not being
 * publishable, and the human sentences we show for them.
 *
 * This is the complete catalogue as of the backend's publication-integrity work.
 * A code that arrives without an entry here is rendered verbatim rather than
 * swallowed — a blocker nobody can read is still better than one nobody sees.
 */
export const PUBLICATION_BLOCKERS: Record<string, string> = {
  "publication.profile_not_approved": "The profile has not been approved.",
  "publication.talent_archived": "The talent is archived.",
  "publication.talent_suspended": "The talent is suspended.",
  "publication.talent_paused": "The talent is paused.",
  "publication.account_suspended": "The talent's account is suspended.",
  "publication.no_public_photograph": "There is no approved, public photograph.",
  "publication.cover_not_public": "The cover is not an approved, public photograph.",
  "publication.display_name_missing": "The profile has no display name.",
  "publication.not_adult": "The recorded date of birth is under 18.",
};

/** The sentence for a blocker code, falling back to the code itself. */
export function describePublicationBlocker(code: string): string {
  return PUBLICATION_BLOCKERS[code] ?? code;
}

/**
 * The publication-health fields the server computes.
 *
 * <b>Never re-derive these locally.</b> The frontend sees a partial media list at
 * best, and a locally-guessed verdict would disagree with the API that actually
 * refuses the action — which is how an operator ends up staring at a green badge
 * and a 422.
 */
export interface PublicationHealth {
  isPublicationEligible: boolean;
  publicationEligibilityBlockers: string[];
  hasValidPublicCover: boolean;
  hasPublicationIssue: boolean;
}

/** Mirrors `TalentAdminListItemDto`. */
export interface TalentAdminListItemDto {
  talentProfileId: string;
  userId: string;
  displayName: string;
  slug: string;
  email: string | null;
  profileStatus: string;
  accountStatus: string;
  isPublic: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  cityName: string | null;
  hasActiveLogin: boolean;
  hasPendingInvitation: boolean;
  /**
   * How many approved, public photographs exist. A profile with none cannot be
   * published — the server refuses rather than silently downgrading.
   */
  approvedPublicMediaCount: number;
  createdAtUtc: string;
  publishedAtUtc: string | null;
  isPublicationEligible: boolean;
  publicationEligibilityBlockers: string[];
  hasValidPublicCover: boolean;
  hasPublicationIssue: boolean;
}

/** Mirrors `TalentInvitationStateDto`. Never carries the token. */
export interface TalentInvitationStateDto {
  id: string;
  status: string;
  expiresAtUtc: string;
  usedAtUtc: string | null;
  createdAtUtc: string;
  isActivatable: boolean;
}

/** Mirrors `TalentAdminRateDto`. */
export interface TalentAdminRateDto {
  id: string;
  label: string;
  unit: string;
  amount: number;
  currencyCode: string;
  isPublic: boolean;
  isActive: boolean;
}

/** Mirrors `TalentAdminDetailDto`. */
export interface TalentAdminDetailDto {
  talentProfileId: string;
  userId: string;
  displayName: string;
  slug: string;
  legalFirstName: string | null;
  legalSurname: string | null;
  headline: string | null;
  shortBiography: string | null;
  fullBiography: string | null;
  dateOfBirth: string | null;
  isAgePublic: boolean;
  cityId: string | null;
  cityName: string | null;
  regionId: string | null;
  email: string | null;
  cellphoneNumber: string | null;
  whatsAppNumber: string | null;
  instagramUrl: string | null;
  additionalSocialUrl: string | null;
  availabilityStatus: string;
  travelAvailable: boolean;
  eventAvailable: boolean;
  profileStatus: string;
  isPublic: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  publishedAtUtc: string | null;
  pausedAtUtc: string | null;
  suspensionReason: string | null;
  accountStatus: string;
  emailConfirmed: boolean;
  /** Whether a password is SET. Never the password, and never its hash. */
  hasPassword: boolean;
  hasActiveLogin: boolean;
  lastLoginAtUtc: string | null;
  activeSessionCount: number;
  invitation: TalentInvitationStateDto | null;
  categoryIds: string[];
  rates: TalentAdminRateDto[];
  upcomingAppointmentCount: number;
  conversationCount: number;
  createdAtUtc: string;
  isPublicationEligible: boolean;
  publicationEligibilityBlockers: string[];
  approvedPublicMediaCount: number;
  hasValidPublicCover: boolean;
  /** The photograph the server would fall back to as cover, in gallery order. */
  suggestedFallbackCoverMediaId: string | null;
  hasPublicationIssue: boolean;
}

// ---- roster ----------------------------------------------------------------

export function searchTalent(
  filters: TalentAdminSearch = {},
  signal?: AbortSignal
): Promise<PagedResult<TalentAdminListItemDto>> {
  return api.get<PagedResult<TalentAdminListItemDto>>(BASE, {
    query: {
      query: filters.query?.trim() || undefined,
      status: filters.status || undefined,
      isPublic: filters.isPublic ?? undefined,
      isFeatured: filters.isFeatured ?? undefined,
      cityId: filters.cityId || undefined,
      categoryId: filters.categoryId || undefined,
      accountStatus: filters.accountStatus || undefined,
      hasActiveLogin: filters.hasActiveLogin ?? undefined,
      hasPendingInvitation: filters.hasPendingInvitation ?? undefined,
      pendingProfileReview: filters.pendingProfileReview ?? undefined,
      hasPublicationIssue: filters.hasPublicationIssue ?? undefined,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    },
    signal,
  });
}

export function getTalentRecord(
  profileId: string,
  signal?: AbortSignal
): Promise<TalentAdminDetailDto> {
  return api.get<TalentAdminDetailDto>(`${BASE}/${profileId}/record`, { signal });
}

/**
 * Creates a talent directly.
 *
 * Refused, not silently downgraded, when it would publish or feature a profile
 * with no approved photograph — the server returns `talent_admin.not_publishable`
 * so an operator who asked for publication finds out it did not happen.
 */
export function createTalent(request: CreateTalentRequest): Promise<CreatedTalentDto> {
  return api.post<CreatedTalentDto>(BASE, request);
}

export function updateTalent(profileId: string, fields: TalentProfileFields): Promise<void> {
  return api.put<void>(`${BASE}/${profileId}`, fields);
}

/** Archives, returning the same impact shape so the consequences are stated. */
export function archiveTalent(
  profileId: string,
  reason: string
): Promise<TalentArchiveImpactDto> {
  return api.post<TalentArchiveImpactDto>(`${BASE}/${profileId}/archive`, { reason });
}

/**
 * Publishes an approved profile into public discovery.
 *
 * Needs `Talent.ApproveProfiles`. The older `/management/profile-reviews/{id}/publish`
 * route remains valid and is what the review queue uses; the talent roster and record use
 * this one so they do not have to reach into a surface shaped around review.
 *
 * Refused unless the profile is Approved AND has at least one approved public photograph.
 * Map the failure through `PUBLICATION_ERROR_GUIDANCE` — never by reading `detail`.
 */
export function publishTalent(profileId: string): Promise<void> {
  return api.post<void>(`${BASE}/${profileId}/publish`, undefined);
}

/**
 * Withdraws a profile from discovery immediately, keeping the approval so it can be
 * republished without a second review. Also clears featured.
 *
 * The reason is INTERNAL and staff-facing; it is not shown to the talent.
 */
export function unpublishTalent(profileId: string, reason?: string | null): Promise<void> {
  return api.post<void>(`${BASE}/${profileId}/unpublish`, { reason: reason ?? null });
}

/**
 * Promotes a published profile in discovery. Needs `Talent.Manage`.
 *
 * **Never publishes implicitly** — the backend refuses to feature a profile that is not
 * already approved and public, and the UI must not offer it as a shortcut either.
 */
export function featureTalent(profileId: string): Promise<void> {
  return api.post<void>(`${BASE}/${profileId}/feature`, undefined);
}

/** Removes a featured placement. Does NOT unpublish. */
export function unfeatureTalent(profileId: string): Promise<void> {
  return api.post<void>(`${BASE}/${profileId}/unfeature`, undefined);
}

export function restoreTalent(profileId: string): Promise<void> {
  return api.post<void>(`${BASE}/${profileId}/restore`, {});
}

// ---- login -----------------------------------------------------------------

/** Issues (or replaces) an activation invitation, revoking any earlier one. */
export function issueTalentInvitation(profileId: string): Promise<CreatedTalentDto> {
  return api.post<CreatedTalentDto>(`${BASE}/${profileId}/invitation`, {});
}

/**
 * Sets a temporary password.
 *
 * The value comes back ONCE in this response and never again. Every session is
 * revoked and the talent must choose a new password. The caller is responsible
 * for showing it to the operator immediately and not persisting it anywhere.
 */
export function setTalentTemporaryPassword(profileId: string): Promise<CreatedTalentDto> {
  return api.post<CreatedTalentDto>(`${BASE}/${profileId}/temporary-password`, {});
}

// ---- media -----------------------------------------------------------------

/** Mirrors `MediaDto`. `readUrl` is minted per request and is short-lived. */
export interface TalentMediaDto {
  id: string;
  talentProfileId: string;
  mediaType: string;
  caption: string | null;
  sortOrder: number;
  isCover: boolean;
  visibility: string;
  moderationStatus: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  rejectionReason: string | null;
  createdAtUtc: string;
  readUrl: string | null;
}

/** Every photograph for a talent, whatever its moderation state. */
export function listTalentMedia(
  profileId: string,
  signal?: AbortSignal
): Promise<TalentMediaDto[]> {
  return api.get<TalentMediaDto[]>(`${BASE}/${profileId}/media`, { signal });
}

export function reorderTalentMedia(
  profileId: string,
  items: { mediaId: string; sortOrder: number }[]
): Promise<void> {
  return api.post<void>(`${BASE}/${profileId}/media/reorder`, { items });
}

// ---- staff media upload -----------------------------------------------------

/**
 * Mirrors the shared `UploadTicketDto`.
 *
 * Same presigned architecture as the talent's own upload: **no bytes pass
 * through the API** and no storage credential leaves the server. The storage
 * key is generated server-side inside the talent's namespace, so the request
 * carries no key at all and there is nothing to aim at another talent's folder.
 */
export interface UploadTicketDto {
  mediaId: string;
  uploadUrl: string;
  httpMethod: string;
  storageKey: string;
  contentType: string;
  expiresAtUtc: string;
}

/** Mirrors `ManagementUploadRequest`. */
export interface ManagementUploadRequest {
  contentType: string;
  expectedSizeBytes: number;
  fileName: string;
  caption?: string | null;
  sortOrder?: number | null;
}

/**
 * Asks for an upload slot.
 *
 * The idempotency key must be minted once per file and reused on retry, so a
 * resubmitted request replays rather than creating a second row. The declared
 * size is a claim — the server reads the true size and dimensions from the
 * stored object at finalize.
 */
export function requestTalentMediaUpload(
  profileId: string,
  request: ManagementUploadRequest,
  idempotencyKey: string
): Promise<UploadTicketDto> {
  return api.post<UploadTicketDto>(`${BASE}/${profileId}/media/request-upload`, request, {
    idempotencyKey,
  });
}

/**
 * Uploads the bytes straight to the presigned URL.
 *
 * Deliberately NOT routed through `api`: this request must carry no Lustra
 * header at all. An `Authorization` header on a presigned PUT breaks the
 * signature, and the object store has no business seeing a Lustra credential.
 */
export async function uploadTalentMediaToStorage(
  ticket: UploadTicketDto,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.httpMethod || "PUT", ticket.uploadUrl, true);
    xhr.setRequestHeader("Content-Type", ticket.contentType);
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      };
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(file);
  });
}

/**
 * Confirms the object landed.
 *
 * The item becomes `PendingReview` and stays PRIVATE: staff uploading a
 * photograph is not staff moderating it, and the two are separate acts on
 * purpose. Naturally idempotent — a second call returns the same item.
 */
export function finalizeTalentMediaUpload(
  profileId: string,
  mediaId: string
): Promise<TalentMediaDto> {
  return api.post<TalentMediaDto>(`${BASE}/${profileId}/media/${mediaId}/finalize`, {});
}

/** Abandons an upload slot that was never completed. */
export function cancelTalentMediaUpload(profileId: string, mediaId: string): Promise<void> {
  return api.delete<void>(`${BASE}/${profileId}/media/${mediaId}/upload`);
}

// ---- archive impact ----------------------------------------------------------

/**
 * Mirrors `TalentArchiveImpactDto`.
 *
 * Archiving is **withdrawal, not deletion**: it unpublishes, clears featured,
 * removes from discovery and stops new appointments — and cancels nothing,
 * reassigns nobody, deletes no media or conversation and closes no account.
 *
 * `futureAppointmentCount` is therefore the number that matters. Those
 * appointments stand, and dealing with them is work somebody now has to do by
 * hand. It is reported rather than silently handled.
 */
export interface TalentArchiveImpactDto {
  talentProfileId: string;
  displayName: string;
  wasPublished: boolean;
  wasFeatured: boolean;
  futureAppointmentCount: number;
  nextAppointmentDate: string | null;
  totalAppointmentCount: number;
  conversationCount: number;
  mediaCount: number;
}

/** Reports what archiving would affect, without changing anything. */
export function getTalentArchiveImpact(
  profileId: string,
  signal?: AbortSignal
): Promise<TalentArchiveImpactDto> {
  return api.get<TalentArchiveImpactDto>(`${BASE}/${profileId}/archive-impact`, { signal });
}

/** Refusal codes the UI branches on. The API sends these as `errorCode`. */
export const TALENT_ADMIN_ERROR_CODES = {
  notFound: "talent_admin.not_found",
  emailInUse: "talent_admin.email_in_use",
  displayNameRequired: "talent_admin.display_name_required",
  emailRequired: "talent_admin.email_required",
  invalidLoginMode: "talent_admin.invalid_login_mode",
  creationFailed: "talent_admin.creation_failed",
  underAge: "talent_admin.under_age",
  notPublishable: "talent_admin.not_publishable",
  noStateChange: "talent_admin.no_state_change",
  unknownReference: "talent_admin.unknown_reference",
  noInvitation: "talent_admin.no_invitation",
  alreadyActivated: "talent_admin.already_activated",
} as const;
