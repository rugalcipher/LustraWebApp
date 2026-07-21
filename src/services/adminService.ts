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

// ---- account security ------------------------------------------------------

/**
 * Privileged account operations: lock, unlock, verification, password resets,
 * session revocation and role assignment.
 *
 * **Nothing here reads, returns or logs a password, a hash, a security stamp or
 * a token.** Staff can replace a password, require it to be changed, or invite
 * someone to set their own — never read one. A temporary password is returned
 * exactly once, in the response that created it.
 *
 * Every operation that could remove the platform's last route back in is
 * refused server-side with `admin.last_superadmin`. That is a Conflict, not a
 * validation failure: the request is well-formed and the actor is authorised —
 * it is the resulting state that is refused.
 */

/** Mirrors `AccountSecurityStateDto`. Carries no token, hash or stamp. */
export interface AccountSecurityStateDto {
  userId: string;
  accountStatus: string;
  emailConfirmed: boolean;
  /** Whether a password is SET. Never the password itself. */
  hasPassword: boolean;
  mustChangePassword: boolean;
  mustChangePasswordSetAtUtc: string | null;
  isLockedOut: boolean;
  lockoutEndUtc: string | null;
  accessFailedCount: number;
  activeSessionCount: number;
  lastLoginAtUtc: string | null;
  talentProfileId: string | null;
}

/** Mirrors `RolePermissionSourceDto` — which role granted which permissions. */
export interface RolePermissionSourceDto {
  role: string;
  permissions: string[];
}

/**
 * Mirrors `EffectivePermissionsDto`.
 *
 * Rendered as returned. The UI must not assume any role — including SuperAdmin —
 * grants anything: the grant lives in the database and the server is the
 * authority, so a hardcoded assumption here would eventually be a lie.
 */
export interface EffectivePermissionsDto {
  userId: string;
  roles: string[];
  permissions: string[];
  sources: RolePermissionSourceDto[];
}

/** Mirrors `TemporaryPasswordDto`. The value is returned once only. */
export interface TemporaryPasswordDto {
  userId: string;
  temporaryPassword: string;
  sessionsRevoked: boolean;
}

/** How a provisioned staff account gets (or does not get) a way to sign in. */
export const STAFF_LOGIN_MODES = {
  /** Emails a set-your-password link. */
  passwordReset: "PasswordReset",
  /** A temporary password, returned once. */
  temporaryPassword: "TemporaryPassword",
  /** No way in yet. */
  none: "None",
} as const;

export type StaffLoginMode = (typeof STAFF_LOGIN_MODES)[keyof typeof STAFF_LOGIN_MODES];

/** Mirrors `CreateStaffAccountRequest`. */
export interface CreateStaffAccountRequest {
  email: string;
  displayName: string;
  phoneNumber?: string | null;
  roles: string[];
  loginMode: StaffLoginMode;
}

/** Mirrors `CreatedStaffDto`. `temporaryPassword` appears once, here, or never. */
export interface CreatedStaffDto {
  userId: string;
  email: string;
  accountStatus: string;
  roles: string[];
  loginMode: string;
  temporaryPassword: string | null;
}

export function getUserSecurity(
  userId: string,
  signal?: AbortSignal
): Promise<AccountSecurityStateDto> {
  return api.get<AccountSecurityStateDto>(`/admin/users/${userId}/security`, { signal });
}

export function getEffectivePermissions(
  userId: string,
  signal?: AbortSignal
): Promise<EffectivePermissionsDto> {
  return api.get<EffectivePermissionsDto>(`/admin/users/${userId}/effective-permissions`, { signal });
}

/** Locks a user out, revoking their sessions. Omit the end for an indefinite lock. */
export function lockUser(
  userId: string,
  reason: string,
  lockoutEndUtc?: string | null
): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/lock`, {
    reason,
    lockoutEndUtc: lockoutEndUtc || null,
  });
}

export function unlockUser(userId: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/unlock`, {});
}

/** Marks an email address as confirmed on the authority of staff. */
export function confirmUserEmail(userId: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/confirm-email`, {});
}

export function resendUserVerification(userId: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/resend-verification`, {});
}

/**
 * Requires the user to choose a new password: revokes every session and emails a
 * reset link. Their current password is never read and never revealed.
 */
export function forcePasswordReset(userId: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/force-password-reset`, {});
}

/**
 * Sets a temporary password and revokes every session.
 *
 * The value comes back once. The caller must show it to the operator at that
 * moment and must not persist it — there is no route that will produce it again.
 */
export function setUserTemporaryPassword(userId: string): Promise<TemporaryPasswordDto> {
  return api.post<TemporaryPasswordDto>(`/admin/users/${userId}/temporary-password`, {});
}

export function revokeUserSessions(userId: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/revoke-sessions`, {});
}

/** Replaces a user's roles. Refused if it would remove the last usable SuperAdmin. */
export function setUserRoles(userId: string, roles: string[]): Promise<void> {
  return api.put<void>(`/admin/users/${userId}/roles`, { roles });
}

/** Creates a staff account without the caller choosing a password. */
export function provisionStaff(request: CreateStaffAccountRequest): Promise<CreatedStaffDto> {
  return api.post<CreatedStaffDto>("/admin/users/staff/provision", request);
}

// ---- roles and the permission catalogue ------------------------------------

/** Mirrors `AdminRoleDto`. */
export interface AdminRoleDto {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissionCount: number;
}

/** Mirrors `AdminRoleDetailDto`. */
export interface AdminRoleDetailDto {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissions: string[];
}

/** Mirrors `PermissionCatalogItemDto`. */
export interface PermissionCatalogItemDto {
  name: string;
  category: string;
}

/** Mirrors `PermissionCatalogGroupDto`. */
export interface PermissionCatalogGroupDto {
  category: string;
  permissions: PermissionCatalogItemDto[];
}

export function listRoles(signal?: AbortSignal): Promise<AdminRoleDto[]> {
  return api.get<AdminRoleDto[]>("/admin/roles", { signal });
}

export function getRole(roleName: string, signal?: AbortSignal): Promise<AdminRoleDetailDto> {
  return api.get<AdminRoleDetailDto>(`/admin/roles/${encodeURIComponent(roleName)}`, { signal });
}

export function setRolePermissions(roleName: string, permissions: string[]): Promise<void> {
  return api.put<void>(`/admin/roles/${encodeURIComponent(roleName)}/permissions`, { permissions });
}

export function listPermissionCatalogue(
  signal?: AbortSignal
): Promise<PermissionCatalogGroupDto[]> {
  return api.get<PermissionCatalogGroupDto[]>("/admin/permissions", { signal });
}

/** Refusal codes the account-administration UI branches on. */
export const ACCOUNT_ADMIN_ERROR_CODES = {
  /** Would leave the platform with no usable SuperAdmin. A Conflict, not a validation error. */
  lastSuperAdmin: "admin.last_superadmin",
  invalidLoginMode: "admin.invalid_login_mode",
  noEmail: "admin.no_email",
  emailAlreadyConfirmed: "admin.email_already_confirmed",
  identityFailure: "admin.identity_failure",
} as const;
