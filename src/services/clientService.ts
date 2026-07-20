import { api } from "@/api/client";

/**
 * Mirrors the backend `ClientEntitlementsDto`.
 *
 * Deliberately narrow: whether VIP access is in force and until when. Management's
 * internal note, the granting staff member and the decision reasoning are NOT here and
 * must not be added — they are management's record of their own judgement.
 */
export interface ClientEntitlementsDto {
  hasVip: boolean;
  vipExpiresAtUtc: string | null;
  pendingRequestStatus: string | null;
  pendingRequestSubmittedAtUtc: string | null;
}

export function getEntitlements(signal?: AbortSignal): Promise<ClientEntitlementsDto> {
  return api.get<ClientEntitlementsDto>("/client/entitlements", { signal });
}

/**
 * Ask to be considered for VIP access.
 *
 * Submitting grants nothing — Lustra reviews every request by hand. There is no payment
 * step and no automatic approval, and the UI must never imply either.
 */
export function requestVipAccess(message: string | null): Promise<{ requestId: string }> {
  return api.post<{ requestId: string }>("/client/vip-requests", { message });
}

export function withdrawVipRequest(requestId: string): Promise<void> {
  return api.post<void>(`/client/vip-requests/${requestId}/withdraw`, undefined);
}

/**
 * Client-owned data — `/api/v1/client/*`.
 *
 * Every endpoint here is scoped to the authenticated principal server-side: there is no
 * client id in any path or body, so one client can never address another's data.
 */

// --- Profile -----------------------------------------------------------------

/** Mirrors the backend `ClientProfileDto`. */
export interface ClientProfileDto {
  preferredName: string | null;
  phoneNumber: string | null;
  preferredCityId: string | null;
  preferredCityName: string | null;
  contactPreference: "InApp" | "Email" | "Phone";
  engagementPreferences: string | null;
  updatedAtUtc: string | null;
}

/** Mirrors the backend `UpdateClientProfileBody`. */
export interface UpdateClientProfileInput {
  preferredName: string | null;
  phoneNumber: string | null;
  preferredCityId: string | null;
  contactPreference: "InApp" | "Email" | "Phone";
  engagementPreferences: string | null;
}

export function getProfile(signal?: AbortSignal): Promise<ClientProfileDto> {
  return api.get<ClientProfileDto>("/client/profile", { signal });
}

export function updateProfile(input: UpdateClientProfileInput): Promise<ClientProfileDto> {
  return api.put<ClientProfileDto>("/client/profile", input);
}

// --- Saved talent ------------------------------------------------------------

/** Mirrors the backend `SavedTalentDto`. */
export interface SavedTalentDto {
  talentProfileId: string;
  slug: string;
  displayName: string;
  headline: string | null;
  coverImageUrl: string | null;
  note: string | null;
  savedAtUtc: string;
}

export function listSaved(signal?: AbortSignal): Promise<SavedTalentDto[]> {
  return api.get<SavedTalentDto[]>("/client/saved-talents", { signal });
}

/**
 * The talent ids this client has saved.
 *
 * Deliberately a SEPARATE, small request: it lets the UI merge saved state into the
 * PUBLIC discovery cache without making those responses user-specific, and without one
 * request per card.
 */
export function listSavedIds(signal?: AbortSignal): Promise<string[]> {
  return api.get<string[]>("/client/saved-talents/ids", { signal });
}

/** Idempotent — saving an already-saved talent is not an error. */
export function saveTalent(talentProfileId: string, note?: string | null): Promise<void> {
  return api.put<void>(`/client/saved-talents/${talentProfileId}`, { note: note ?? null });
}

/** Idempotent — removing an absent save is not an error. */
export function unsaveTalent(talentProfileId: string): Promise<void> {
  return api.delete<void>(`/client/saved-talents/${talentProfileId}`);
}

// --- Collections -------------------------------------------------------------

/** Mirrors the backend `SavedCollectionDto`. */
export interface CollectionDto {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  itemCount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

/** Mirrors the backend `SavedCollectionDetailDto`. */
export interface CollectionDetailDto {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAtUtc: string;
  items: SavedTalentDto[];
}

export interface UpsertCollectionInput {
  name: string;
  description: string | null;
  sortOrder: number;
}

export function listCollections(signal?: AbortSignal): Promise<CollectionDto[]> {
  return api.get<CollectionDto[]>("/client/collections", { signal });
}

export function getCollection(collectionId: string, signal?: AbortSignal): Promise<CollectionDetailDto> {
  return api.get<CollectionDetailDto>(`/client/collections/${collectionId}`, { signal });
}

export function createCollection(input: UpsertCollectionInput): Promise<{ id: string }> {
  return api.post<{ id: string }>("/client/collections", input);
}

export function updateCollection(collectionId: string, input: UpsertCollectionInput): Promise<void> {
  return api.put<void>(`/client/collections/${collectionId}`, input);
}

/** Removes only the grouping — the client's global saved list is unaffected. */
export function deleteCollection(collectionId: string): Promise<void> {
  return api.delete<void>(`/client/collections/${collectionId}`);
}

export function addTalentToCollection(collectionId: string, talentProfileId: string): Promise<void> {
  return api.put<void>(`/client/collections/${collectionId}/talents/${talentProfileId}`);
}

export function removeTalentFromCollection(collectionId: string, talentProfileId: string): Promise<void> {
  return api.delete<void>(`/client/collections/${collectionId}/talents/${talentProfileId}`);
}
