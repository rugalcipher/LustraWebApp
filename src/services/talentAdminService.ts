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
  page?: number;
  pageSize?: number;
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

export function archiveTalent(profileId: string, reason: string): Promise<void> {
  return api.post<void>(`${BASE}/${profileId}/archive`, { reason });
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
