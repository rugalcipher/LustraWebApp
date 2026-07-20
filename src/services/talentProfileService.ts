import { api } from "@/api/client";

/**
 * The talent's own profile — `/api/v1/talent/profile*`.
 *
 * A talent CANNOT publish changes directly. Edits go to a draft, the draft is submitted,
 * and management approves it. Every piece of copy built on this module has to reflect
 * that, or a talent will believe an edit is live when it is still queued for review.
 */

/** Mirrors the backend `TalentProfileDto` — the LIVE profile. */
export interface TalentProfileDto {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  headline: string | null;
  shortBiography: string | null;
  fullBiography: string | null;
  dateOfBirth: string | null;
  isAgePublic: boolean;
  cityId: string | null;
  regionId: string | null;
  availabilityStatus: string;
  travelAvailable: boolean;
  eventAvailable: boolean;
  isFeatured: boolean;
  isPublic: boolean;
  isVerified: boolean;
  profileStatus: string;
  publishedAtUtc: string | null;
  coverMediaId: string | null;
  averageRating: number;
  reviewCount: number;
}

/** Mirrors the backend `TalentProfileDraftDto`. */
export interface TalentProfileDraftDto {
  talentProfileId: string;
  displayName: string;
  headline: string | null;
  shortBiography: string | null;
  fullBiography: string | null;
  dateOfBirth: string | null;
  isAgePublic: boolean;
  cityId: string | null;
  regionId: string | null;
  availabilityStatus: string;
  travelAvailable: boolean;
  eventAvailable: boolean;
  coverMediaId: string | null;
  profileStatus: string;
  submittedAtUtc: string | null;
  reviewNotes: string | null;
}

/**
 * Mirrors the backend `UpdateTalentDraftRequest`.
 *
 * Note what is ABSENT: `isVerified`, `isFeatured`, `isPublic`, `profileStatus` and `slug`.
 * Those are management-owned and the API would ignore them — a talent cannot verify or
 * feature themselves.
 */
export interface UpdateTalentDraftInput {
  displayName: string;
  headline: string | null;
  shortBiography: string | null;
  fullBiography: string | null;
  dateOfBirth: string | null;
  isAgePublic: boolean;
  cityId: string | null;
  regionId: string | null;
  availabilityStatus: string;
  travelAvailable: boolean;
  eventAvailable: boolean;
  coverMediaId: string | null;
}

/** Mirrors the backend `PublicTalentProfileDto` — what the draft would look like live. */
export interface TalentPreviewDto {
  slug: string;
  displayName: string;
  headline: string | null;
  shortBiography: string | null;
  fullBiography: string | null;
  cityName: string | null;
  regionName: string | null;
  availabilityStatus: string;
  travelAvailable: boolean;
  eventAvailable: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  age: number | null;
  coverMediaId: string | null;
  averageRating: number;
  reviewCount: number;
}

/** Mirrors the backend `TalentProfileVersionDto`. */
export interface TalentProfileVersionDto {
  versionNumber: number;
  changeSummary: string | null;
  approvedByUserId: string;
  createdAtUtc: string;
  snapshotJson: string;
}

/** Mirrors the backend `TagRefDto`. */
export interface TagRefDto {
  id: string;
  name: string;
  slug: string;
}

/** Mirrors the backend `TalentTagsDto`. */
export interface TalentTagsDto {
  categories: TagRefDto[];
  engagementCategories: TagRefDto[];
  languages: TagRefDto[];
  skills: TagRefDto[];
  interests: TagRefDto[];
  personalityTags: TagRefDto[];
}

/** Mirrors the backend `TalentRateDto`. */
export interface TalentRateDto {
  id: string;
  label: string;
  unit: string;
  amount: number;
  currencyCode: string;
  notes: string | null;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
}

/** Mirrors the backend `UpsertRateRequest`. */
export interface UpsertRateInput {
  label: string;
  unit: string;
  amount: number;
  currencyCode: string | null;
  notes: string | null;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
}

// ---- profile & draft -------------------------------------------------------

export function getMyProfile(signal?: AbortSignal): Promise<TalentProfileDto> {
  return api.get<TalentProfileDto>("/talent/profile", { signal });
}

export function getMyDraft(signal?: AbortSignal): Promise<TalentProfileDraftDto> {
  return api.get<TalentProfileDraftDto>("/talent/profile/draft", { signal });
}

export function updateMyDraft(input: UpdateTalentDraftInput): Promise<void> {
  return api.put<void>("/talent/profile/draft", input);
}

export function submitMyDraft(): Promise<void> {
  return api.post<void>("/talent/profile/draft/submit", undefined);
}

export function getMyPreview(signal?: AbortSignal): Promise<TalentPreviewDto> {
  return api.get<TalentPreviewDto>("/talent/profile/preview", { signal });
}

export function getMyVersions(signal?: AbortSignal): Promise<TalentProfileVersionDto[]> {
  return api.get<TalentProfileVersionDto[]>("/talent/profile/versions", { signal });
}

// ---- tags ------------------------------------------------------------------

/**
 * The tag-type slugs the API accepts on `PUT /talent/profile/tags/{type}`.
 *
 * These are matched case-insensitively server-side against this exact set; anything else
 * is rejected as `talent_tags.unknown_type`. Kept as a const so a typo is a compile error
 * rather than a runtime 400.
 */
export const TAG_TYPES = {
  categories: "categories",
  engagementCategories: "engagement-categories",
  languages: "languages",
  skills: "skills",
  interests: "interests",
  personalityTags: "personality-tags",
} as const;

export type TagType = (typeof TAG_TYPES)[keyof typeof TAG_TYPES];

/** The `TalentTagsDto` field that each tag-type slug corresponds to. */
export const TAG_TYPE_FIELDS: Record<TagType, keyof TalentTagsDto> = {
  categories: "categories",
  "engagement-categories": "engagementCategories",
  languages: "languages",
  skills: "skills",
  interests: "interests",
  "personality-tags": "personalityTags",
};

export function getMyTags(signal?: AbortSignal): Promise<TalentTagsDto> {
  return api.get<TalentTagsDto>("/talent/profile/tags", { signal });
}

export function setMyTags(type: TagType, tagIds: string[]): Promise<void> {
  return api.put<void>(`/talent/profile/tags/${type}`, tagIds);
}

// ---- rates -----------------------------------------------------------------

export function getMyRates(signal?: AbortSignal): Promise<TalentRateDto[]> {
  return api.get<TalentRateDto[]>("/talent/profile/rates", { signal });
}

export function createRate(input: UpsertRateInput): Promise<{ id: string }> {
  return api.post<{ id: string }>("/talent/profile/rates", input);
}

export function updateRate(rateId: string, input: UpsertRateInput): Promise<void> {
  return api.put<void>(`/talent/profile/rates/${rateId}`, input);
}

export function deleteRate(rateId: string): Promise<void> {
  return api.delete<void>(`/talent/profile/rates/${rateId}`);
}

// ---- presentation ----------------------------------------------------------

/**
 * Backend `TalentProfileStatus` → what it means for the talent.
 *
 * `isLive` is the load-bearing part: only `Approved` means the public can see the
 * profile. `Paused`, `Suspended` and `Archived` are NOT `Approved`, and discovery filters
 * on `ProfileStatus == Approved`, so those profiles are genuinely invisible.
 */
const PROFILE_STATUS: Record<
  string,
  { label: string; detail: string; isLive: boolean; isEditable: boolean }
> = {
  Draft: {
    label: "Draft",
    detail: "Your profile has not been submitted yet. It is not visible to anyone.",
    isLive: false,
    isEditable: true,
  },
  PendingReview: {
    label: "In review",
    detail: "Lustra is reviewing your submission. You'll be notified when it is decided.",
    isLive: false,
    isEditable: false,
  },
  ChangesRequested: {
    label: "Changes requested",
    detail: "Lustra has asked for changes. Update your draft and submit it again.",
    isLive: false,
    isEditable: true,
  },
  Approved: {
    label: "Live",
    detail: "Your profile is approved and discoverable by clients.",
    isLive: true,
    isEditable: true,
  },
  Rejected: {
    label: "Not approved",
    detail: "Your submission was not approved. Speak to Lustra management.",
    isLive: false,
    isEditable: true,
  },
  Paused: {
    label: "Paused",
    detail: "Your profile is paused by Lustra and is not visible in discovery.",
    isLive: false,
    isEditable: false,
  },
  Suspended: {
    label: "Suspended",
    detail: "Your profile is suspended. Contact Lustra management.",
    isLive: false,
    isEditable: false,
  },
  Archived: {
    label: "Archived",
    detail: "Your profile is archived and is not visible.",
    isLive: false,
    isEditable: false,
  },
};

export function presentProfileStatus(status: string): {
  label: string;
  detail: string;
  isLive: boolean;
  isEditable: boolean;
} {
  return (
    PROFILE_STATUS[status] ?? {
      label: status,
      // An unknown status must NOT be assumed live — that would tell a talent their
      // profile is public when it may not be.
      detail: "Your profile status is being updated by Lustra.",
      isLive: false,
      isEditable: false,
    }
  );
}

/** A draft can only be submitted from a state that management is not already reviewing. */
export function canSubmitDraft(profileStatus: string): boolean {
  return profileStatus === "Draft" || profileStatus === "ChangesRequested" || profileStatus === "Approved";
}

/** Backend `AvailabilityStatus` values, in the order the picker should show them. */
export const AVAILABILITY_STATUSES = [
  { value: "Available", label: "Available" },
  { value: "LimitedAvailability", label: "Limited availability" },
  { value: "ByRequest", label: "By request" },
  { value: "Travelling", label: "Travelling" },
  { value: "TemporarilyUnavailable", label: "Temporarily unavailable" },
] as const;

export function presentAvailabilityStatus(status: string): string {
  return AVAILABILITY_STATUSES.find((s) => s.value === status)?.label ?? status;
}

/** Backend `RateUnit` values. */
export const RATE_UNITS = [
  { value: "Hourly", label: "Per hour" },
  { value: "PerEvening", label: "Per evening" },
  { value: "PerEvent", label: "Per event" },
  { value: "PerDay", label: "Per day" },
  { value: "Custom", label: "Custom" },
] as const;

export function presentRateUnit(unit: string): string {
  return RATE_UNITS.find((u) => u.value === unit)?.label ?? unit;
}
