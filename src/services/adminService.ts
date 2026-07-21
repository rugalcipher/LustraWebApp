import { api } from "@/api/client";
import type { PagedResult } from "@/services/discoveryService";

/**
 * The admin console — `/api/v1/admin/*`.
 *
 * Everything here is permission-gated server-side (`Users.View`, `Users.Manage`,
 * `Settings.Manage`, `FeatureFlags.Manage`, `AuditLogs.View`). The frontend mirrors those
 * permissions only to decide what to render; it is never the authorization boundary.
 */

// ---- users -----------------------------------------------------------------

/** Mirrors `AdminUserListItemDto`. No password hash, security stamp or token. */
export interface AdminUserListItemDto {
  id: string;
  email: string;
  displayName: string;
  accountStatus: string;
  roles: string[];
  lastLoginAtUtc: string | null;
  createdAtUtc: string;
}

export interface AdminUserFilters {
  search?: string | null;
  role?: string | null;
  status?: string | null;
  page?: number;
  pageSize?: number;
}

export function listUsers(
  filters: AdminUserFilters = {},
  signal?: AbortSignal
): Promise<PagedResult<AdminUserListItemDto>> {
  return api.get<PagedResult<AdminUserListItemDto>>("/admin/users", {
    query: {
      search: filters.search?.trim() || undefined,
      role: filters.role || undefined,
      status: filters.status || undefined,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    },
    signal,
  });
}

export function suspendUser(userId: string, reason: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/suspend`, { reason });
}

export function reactivateUser(userId: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/reactivate`, undefined);
}

// ---- audit log -------------------------------------------------------------

/** Mirrors `AuditLogEntryDto`. */
export interface AuditLogEntryDto {
  id: string;
  actorUserId: string | null;
  actorDisplay: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  ipAddress: string | null;
  createdAtUtc: string;
}

export function listAuditLogs(
  filters: { action?: string | null; entityType?: string | null; page?: number } = {},
  signal?: AbortSignal
): Promise<PagedResult<AuditLogEntryDto>> {
  return api.get<PagedResult<AuditLogEntryDto>>("/admin/audit-logs", {
    query: {
      action: filters.action?.trim() || undefined,
      entityType: filters.entityType?.trim() || undefined,
      page: filters.page ?? 1,
      pageSize: 50,
    },
    signal,
  });
}

// ---- platform settings and feature flags -----------------------------------

/** Mirrors `PlatformSettingDto`. */
export interface PlatformSettingDto {
  id: string;
  key: string;
  value: string;
  description: string | null;
  dataType: string;
  isPublic: boolean;
}

/** Mirrors `FeatureFlagDto`. */
export interface FeatureFlagDto {
  id: string;
  key: string;
  isEnabled: boolean;
  description: string | null;
}

export function listSettings(signal?: AbortSignal): Promise<PlatformSettingDto[]> {
  return api.get<PlatformSettingDto[]>("/admin/settings", { signal });
}

export function updateSetting(key: string, value: string): Promise<void> {
  return api.put<void>(`/admin/settings/${encodeURIComponent(key)}`, { value });
}

export function listFeatureFlags(signal?: AbortSignal): Promise<FeatureFlagDto[]> {
  return api.get<FeatureFlagDto[]>("/admin/feature-flags", { signal });
}

export function updateFeatureFlag(key: string, isEnabled: boolean): Promise<void> {
  return api.put<void>(`/admin/feature-flags/${encodeURIComponent(key)}`, { isEnabled });
}

// ---- presentation ----------------------------------------------------------

/** Backend `AccountStatus` → tone for the status pill. */
export function accountStatusTone(status: string): "active" | "warning" | "muted" {
  if (status === "Active") return "active";
  if (status === "Suspended" || status === "Locked") return "warning";
  return "muted";
}

// ---- taxonomies ------------------------------------------------------------

/**
 * The taxonomy types the admin API accepts. These are the exact `{type}` segment values
 * `AdminTaxonomiesController` dispatches on — a value not in this list 404s.
 *
 * Cities and venue types are deliberately absent from the location group here: cities
 * live under `/admin/locations`, which is a different shape (country → region → city).
 */
export const TAXONOMY_TYPES = [
  { type: "talent-categories", label: "Talent categories" },
  { type: "engagement-categories", label: "Engagement types" },
  { type: "skills", label: "Skills" },
  { type: "interests", label: "Interests" },
  { type: "personality-tags", label: "Personality tags" },
  { type: "languages", label: "Languages" },
  { type: "venue-types", label: "Venue types" },
] as const;

export type TaxonomyType = (typeof TAXONOMY_TYPES)[number]["type"];

/** Mirrors the lookup DTO returned by the taxonomy endpoints. */
export interface TaxonomyItemDto {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function listTaxonomy(type: TaxonomyType, signal?: AbortSignal): Promise<TaxonomyItemDto[]> {
  return api.get<TaxonomyItemDto[]>(`/admin/taxonomies/${type}`, { signal });
}

export function createTaxonomyItem(type: TaxonomyType, name: string, sortOrder: number) {
  return api.post<{ id: string }>(`/admin/taxonomies/${type}`, {
    name,
    slug: null,
    description: null,
    sortOrder,
    isActive: true,
  });
}

export function updateTaxonomyItem(
  type: TaxonomyType,
  id: string,
  input: { name: string; sortOrder: number; isActive: boolean }
): Promise<void> {
  return api.put<void>(`/admin/taxonomies/${type}/${id}`, {
    name: input.name,
    slug: null,
    description: null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  });
}

/** Soft-deletes a taxonomy value — existing references keep resolving. */
export function deleteTaxonomyItem(type: TaxonomyType, id: string): Promise<void> {
  return api.delete<void>(`/admin/taxonomies/${type}/${id}`);
}

// ---- administrative dashboard ----------------------------------------------

/**
 * The administrative dashboard.
 *
 * Every figure is computed from the database on request. The screen this
 * replaced showed 412 users, 86 active talent, 23 open inquiries and $184k
 * revenue — none of which existed anywhere. A zero from this endpoint means
 * zero, and it is displayed as zero.
 */

/** Mirrors `DashboardTrendPointDto`. `period` is `yyyy-MM`. */
export interface DashboardTrendPointDto {
  period: string;
  count: number;
}

/**
 * Mirrors `RecordedAppointmentValueDto`.
 *
 * **This is not revenue and must never be labelled as such.** Lustra processes
 * no payments: the amount is a figure a member of staff typed onto a booking,
 * settlement happens outside the system, and nothing here has been invoiced,
 * collected or reconciled. It is reported per currency because adding amounts in
 * different currencies produces a number that is wrong in all of them.
 */
export interface RecordedAppointmentValueDto {
  currencyCode: string;
  amount: number;
  appointmentCount: number;
}

/** Mirrors `AdminDashboardDto`. */
export interface AdminDashboardDto {
  totalClients: number;
  totalTalent: number;
  publishedTalent: number;
  approvedUnpublishedTalent: number;
  activeManagementStaff: number;
  suspendedAccounts: number;

  pendingTalentApplications: number;
  pendingProfileReviews: number;
  pendingMediaReviews: number;
  openInquiries: number;
  unreadConversations: number;
  unassignedConversations: number;
  pendingReviewModeration: number;
  openSafetyCases: number;

  upcomingAppointments: number;
  appointmentsToday: number;
  cancelledAppointmentsInPeriod: number;

  registrationTrend: DashboardTrendPointDto[];
  applicationTrend: DashboardTrendPointDto[];
  appointmentTrend: DashboardTrendPointDto[];

  recordedAppointmentValue: RecordedAppointmentValueDto[];
  fromUtc: string;
  toUtc: string;
  generatedAtUtc: string;
}

/** Mirrors `DashboardActivityDto` — a real audit-log row. */
export interface DashboardActivityDto {
  id: string;
  actorUserId: string | null;
  actorDisplay: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAtUtc: string;
}

/**
 * Mirrors `SystemComponentStatusDto`.
 *
 * A component appears here only because something actually checked it. There is
 * no "Operational" placeholder: a status nobody measured is worse than none,
 * because it is believed.
 */
export interface SystemComponentStatusDto {
  name: string;
  status: string;
  detail: string | null;
  latencyMs: number | null;
}

/** Mirrors `SystemStatusDto`. */
export interface SystemStatusDto {
  status: string;
  components: SystemComponentStatusDto[];
  checkedAtUtc: string;
}

/**
 * The dashboard over a window.
 *
 * `fromUtc`/`toUtc` bound the trends, the cancelled count and the recorded
 * value. Queue depths and population counts are current by nature and ignore
 * them — a queue that was deep last month is not a queue.
 */
export function getAdminDashboard(
  range: { fromUtc?: string | null; toUtc?: string | null } = {},
  signal?: AbortSignal
): Promise<AdminDashboardDto> {
  return api.get<AdminDashboardDto>("/admin/dashboard", {
    query: { fromUtc: range.fromUtc || undefined, toUtc: range.toUtc || undefined },
    signal,
  });
}

/** Real audit-log entries. Behind `AuditLogs.View`, not `Analytics.View`. */
export function getAdminDashboardActivity(
  take = 20,
  signal?: AbortSignal
): Promise<DashboardActivityDto[]> {
  return api.get<DashboardActivityDto[]>("/admin/dashboard/activity", {
    query: { take },
    signal,
  });
}

/** The measured state of the platform's dependencies. */
export function getSystemStatus(signal?: AbortSignal): Promise<SystemStatusDto> {
  return api.get<SystemStatusDto>("/admin/dashboard/system-status", { signal });
}
