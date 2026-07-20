import { api } from "@/api/client";

/**
 * The talent's own media — `/api/v1/talent/media*`.
 *
 * Nothing a talent uploads is public until MANAGEMENT approves it. Upload puts an item in
 * `Draft`; submitting moves it to `PendingReview`; only management can reach `Approved`.
 * The UI must never present an unapproved item as if clients can see it.
 */

/** Mirrors the backend `MediaDto`. */
export interface MediaDto {
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

/** Mirrors the backend `MediaReorderItem`. */
export interface MediaReorderItem {
  id: string;
  sortOrder: number;
}

export function listMyMedia(signal?: AbortSignal): Promise<MediaDto[]> {
  return api.get<MediaDto[]>("/talent/media", { signal });
}

/**
 * Upload a file through the API (multipart).
 *
 * The presigned direct-to-bucket route (`request-upload` → PUT → `finalize`) also exists
 * and is better for very large videos, but it requires CORS on the storage bucket. This
 * path works in every deployment, so it is the default.
 */
export function uploadMedia(
  file: File,
  mediaType: string,
  caption?: string | null
): Promise<MediaDto> {
  const form = new FormData();
  form.append("file", file);
  form.append("mediaType", mediaType);
  if (caption) form.append("caption", caption);
  return api.postForm<MediaDto>("/talent/media/upload", form);
}

export function updateCaption(mediaId: string, caption: string | null): Promise<void> {
  return api.put<void>(`/talent/media/${mediaId}`, { caption });
}

export function deleteMedia(mediaId: string): Promise<void> {
  return api.delete<void>(`/talent/media/${mediaId}`);
}

export function submitMedia(mediaId: string): Promise<void> {
  return api.post<void>(`/talent/media/${mediaId}/submit`, undefined);
}

export function reorderMedia(items: MediaReorderItem[]): Promise<void> {
  return api.post<void>("/talent/media/reorder", items);
}

export function setCover(mediaId: string): Promise<void> {
  return api.post<void>(`/talent/media/${mediaId}/set-cover`, undefined);
}

// ---- presentation ----------------------------------------------------------

/** Backend `MediaType` — only these two exist. */
export const MEDIA_TYPES = [
  { value: "Image", label: "Photograph" },
  { value: "IntroductionVideo", label: "Introduction video" },
] as const;

/**
 * Backend `MediaModerationStatus` → what it means for the talent.
 *
 * `isPublic` is deliberately false for everything except `Approved`. An item that is
 * merely uploaded is visible to nobody but the owner and management.
 */
const MODERATION_STATUS: Record<
  string,
  { label: string; detail: string; isPublic: boolean; canSubmit: boolean }
> = {
  Draft: {
    label: "Not submitted",
    detail: "Only you and Lustra can see this. Submit it for review to have it published.",
    isPublic: false,
    canSubmit: true,
  },
  Uploading: {
    label: "Uploading",
    detail: "This upload has not completed yet.",
    isPublic: false,
    canSubmit: false,
  },
  Processing: {
    label: "Processing",
    detail: "Lustra is processing this file.",
    isPublic: false,
    canSubmit: false,
  },
  PendingReview: {
    label: "In review",
    detail: "Lustra is reviewing this item. It is not visible to clients yet.",
    isPublic: false,
    canSubmit: false,
  },
  Approved: {
    label: "Published",
    detail: "This item is approved and visible according to its visibility setting.",
    isPublic: true,
    canSubmit: false,
  },
  Rejected: {
    label: "Not approved",
    detail: "Lustra did not approve this item.",
    isPublic: false,
    canSubmit: true,
  },
  Archived: {
    label: "Removed",
    detail: "This item has been removed.",
    isPublic: false,
    canSubmit: false,
  },
};

export function presentModerationStatus(status: string): {
  label: string;
  detail: string;
  isPublic: boolean;
  canSubmit: boolean;
} {
  return (
    MODERATION_STATUS[status] ?? {
      label: status,
      detail: "Lustra is updating this item.",
      // Unknown must never be treated as published — that would tell a talent an item is
      // live to clients when it may not be.
      isPublic: false,
      canSubmit: false,
    }
  );
}

/**
 * Backend `MediaVisibility` → label.
 *
 * Visibility is set by MANAGEMENT, not the talent, so this is read-only presentation.
 * `VipOnly` is a media-access policy; it is not a property of a talent profile.
 */
const VISIBILITY: Record<string, { label: string; isVip: boolean }> = {
  Public: { label: "Public", isVip: false },
  VipOnly: { label: "VIP only", isVip: true },
  Private: { label: "Private", isVip: false },
  ManagementOnly: { label: "Management only", isVip: false },
  Archived: { label: "Archived", isVip: false },
};

export function presentVisibility(visibility: string): { label: string; isVip: boolean } {
  return VISIBILITY[visibility] ?? { label: visibility, isVip: false };
}

/** Human-readable file size for the upload list. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
