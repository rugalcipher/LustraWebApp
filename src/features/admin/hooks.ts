import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as adminService from "@/services/adminService";

/**
 * Admin-console hooks.
 *
 * Queries are gated on the caller actually holding the permission, so someone who reaches
 * an admin route without it fires no request rather than collecting 403s. The server
 * remains the authorization boundary — this only avoids pointless traffic.
 */

const ADMIN_STALE_TIME = 20_000;

function usePermission(permission: string): boolean {
  const { principal } = usePrincipal();
  return principal.isAuthenticated && principal.permissions.includes(permission);
}

// ---- users -----------------------------------------------------------------

export function useAdminUsers(filters: adminService.AdminUserFilters = {}) {
  const enabled = usePermission("Users.View");
  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: ({ signal }) => adminService.listUsers(filters, signal),
    enabled,
    staleTime: ADMIN_STALE_TIME,
  });
}

/**
 * Management staff, for an "assign to" picker.
 *
 * Deliberately a thin wrapper over the same user search: there is no separate staff
 * directory endpoint, and Management holds `Users.View`, so this is the supported way to
 * populate the picker rather than inventing a parallel route.
 */
export function useManagementStaff() {
  const enabled = usePermission("Users.View");
  const filters = { role: "Management", status: "Active", pageSize: 100 };
  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: ({ signal }) => adminService.listUsers(filters, signal),
    enabled,
    // Staff lists change rarely; a longer window avoids refetching on every open.
    staleTime: 5 * 60_000,
  });
}

function useUserInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
}

export function useSuspendUser() {
  const invalidate = useUserInvalidation();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminService.suspendUser(userId, reason),
    retry: false,
    onSuccess: invalidate,
  });
}

export function useReactivateUser() {
  const invalidate = useUserInvalidation();
  return useMutation({
    mutationFn: (userId: string) => adminService.reactivateUser(userId),
    retry: false,
    onSuccess: invalidate,
  });
}

// ---- audit log -------------------------------------------------------------

export function useAuditLogs(
  filters: { action?: string | null; entityType?: string | null; page?: number } = {}
) {
  const enabled = usePermission("AuditLogs.View");
  return useQuery({
    queryKey: queryKeys.admin.auditLogs(filters),
    queryFn: ({ signal }) => adminService.listAuditLogs(filters, signal),
    enabled,
    staleTime: ADMIN_STALE_TIME,
  });
}

// ---- settings and feature flags --------------------------------------------

export function usePlatformSettings() {
  const enabled = usePermission("Settings.Manage");
  return useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: ({ signal }) => adminService.listSettings(signal),
    enabled,
    staleTime: ADMIN_STALE_TIME,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminService.updateSetting(key, value),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings() }),
  });
}

export function useFeatureFlags() {
  const enabled = usePermission("FeatureFlags.Manage");
  return useQuery({
    queryKey: queryKeys.admin.featureFlags(),
    queryFn: ({ signal }) => adminService.listFeatureFlags(signal),
    enabled,
    staleTime: ADMIN_STALE_TIME,
  });
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, isEnabled }: { key: string; isEnabled: boolean }) =>
      adminService.updateFeatureFlag(key, isEnabled),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.featureFlags() }),
  });
}

// ---- taxonomies ------------------------------------------------------------

export function useTaxonomyAdmin(type: adminService.TaxonomyType) {
  const { principal } = usePrincipal();
  // Taxonomy routes require the admin ROLE, not a granular permission.
  const enabled =
    principal.isAuthenticated &&
    principal.roles.some((role) => role === "admin" || role === "superadmin");
  return useQuery({
    queryKey: ["admin", "taxonomies", type],
    queryFn: ({ signal }) => adminService.listTaxonomy(type, signal),
    enabled,
    staleTime: ADMIN_STALE_TIME,
  });
}

export function useTaxonomyMutations(type: adminService.TaxonomyType) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "taxonomies", type] });
    // Public reference data is derived from the same tables.
    queryClient.invalidateQueries({ queryKey: ["reference"] });
  };

  const create = useMutation({
    mutationFn: ({ name, sortOrder }: { name: string; sortOrder: number }) =>
      adminService.createTaxonomyItem(type, name, sortOrder),
    retry: false,
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string; name: string; sortOrder: number; isActive: boolean }) =>
      adminService.updateTaxonomyItem(type, id, input),
    retry: false,
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteTaxonomyItem(type, id),
    retry: false,
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// ---- administrative dashboard ----------------------------------------------

/**
 * The Admin/SuperAdmin dashboard.
 *
 * Distinct from `useManagementDashboard`, which serves Management's narrower
 * operational view. Admins read this one: it is computed from the database and
 * covers populations, queues, appointments and trends that the management
 * dashboard never carried.
 */
export function useAdminDashboard(range: { fromUtc?: string | null; toUtc?: string | null } = {}) {
  const enabled = usePermission("Analytics.View");
  return useQuery({
    queryKey: queryKeys.admin.dashboard(range),
    queryFn: ({ signal }) => adminService.getAdminDashboard(range, signal),
    enabled,
    staleTime: 60_000,
  });
}

/**
 * The activity feed.
 *
 * Gated on `AuditLogs.View` rather than `Analytics.View`: activity names
 * individual staff and what they did, which is a stricter thing to read than an
 * aggregate. An admin without it sees the rest of the dashboard and no feed.
 */
export function useAdminDashboardActivity(take = 20) {
  const enabled = usePermission("AuditLogs.View");
  return useQuery({
    queryKey: queryKeys.admin.dashboardActivity(take),
    queryFn: ({ signal }) => adminService.getAdminDashboardActivity(take, signal),
    enabled,
    staleTime: 30_000,
  });
}

/** The measured state of the platform's dependencies. */
export function useSystemStatus() {
  const enabled = usePermission("Analytics.View");
  return useQuery({
    queryKey: queryKeys.admin.systemStatus(),
    queryFn: ({ signal }) => adminService.getSystemStatus(signal),
    enabled,
    // Short: a status is only worth reading if it is roughly current.
    staleTime: 15_000,
  });
}

// ---- account security -------------------------------------------------------

/**
 * Privileged account operations.
 *
 * Nothing in this section ever reads a password, a hash, a security stamp or a
 * token. A temporary password appears once, in the mutation result, and the
 * caller is responsible for showing it and then forgetting it — it is
 * deliberately never written into the query cache.
 */

export function useUserSecurity(userId: string | undefined) {
  const enabled = usePermission("Users.View") && Boolean(userId);
  return useQuery({
    queryKey: queryKeys.admin.userSecurity(userId ?? ""),
    queryFn: ({ signal }) => adminService.getUserSecurity(userId!, signal),
    enabled,
    staleTime: 15_000,
  });
}

export function useEffectivePermissions(userId: string | undefined) {
  const enabled = usePermission("Users.View") && Boolean(userId);
  return useQuery({
    queryKey: queryKeys.admin.userPermissions(userId ?? ""),
    queryFn: ({ signal }) => adminService.getEffectivePermissions(userId!, signal),
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Any security action invalidates the user's security state, their row in the
 * list and their effective permissions. Locking, revoking and role changes all
 * alter what the next screen should show about them.
 */
function useSecurityInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return () => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.userSecurity(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.userPermissions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.user(userId) });
    }
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  };
}

export type UserSecurityAction =
  | { kind: "lock"; reason: string; lockoutEndUtc?: string | null }
  | { kind: "unlock" }
  | { kind: "confirm-email" }
  | { kind: "resend-verification" }
  | { kind: "force-password-reset" }
  | { kind: "revoke-sessions" };

export function useUserSecurityAction(userId: string | undefined) {
  const invalidate = useSecurityInvalidation(userId);
  return useMutation({
    mutationFn: (action: UserSecurityAction) => {
      switch (action.kind) {
        case "lock":
          return adminService.lockUser(userId!, action.reason, action.lockoutEndUtc);
        case "unlock":
          return adminService.unlockUser(userId!);
        case "confirm-email":
          return adminService.confirmUserEmail(userId!);
        case "resend-verification":
          return adminService.resendUserVerification(userId!);
        case "force-password-reset":
          return adminService.forcePasswordReset(userId!);
        case "revoke-sessions":
          return adminService.revokeUserSessions(userId!);
      }
    },
    retry: false,
    onSuccess: invalidate,
  });
}

/** The result holds the only copy of the value. It is never cached. */
export function useSetUserTemporaryPassword(userId: string | undefined) {
  const invalidate = useSecurityInvalidation(userId);
  return useMutation({
    mutationFn: () => adminService.setUserTemporaryPassword(userId!),
    retry: false,
    onSuccess: invalidate,
  });
}

/** Replaces a user's roles. Refused with `admin.last_superadmin` where it would lock everyone out. */
export function useSetUserRoles(userId: string | undefined) {
  const invalidate = useSecurityInvalidation(userId);
  return useMutation({
    mutationFn: (roles: string[]) => adminService.setUserRoles(userId!, roles),
    retry: false,
    onSuccess: invalidate,
  });
}

export function useProvisionStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: adminService.CreateStaffAccountRequest) =>
      adminService.provisionStaff(request),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ---- roles and permissions ---------------------------------------------------

export function useRoles() {
  const enabled = usePermission("Roles.Manage");
  return useQuery({
    queryKey: queryKeys.admin.roles(),
    queryFn: ({ signal }) => adminService.listRoles(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useRole(roleName: string | undefined) {
  const enabled = usePermission("Roles.Manage") && Boolean(roleName);
  return useQuery({
    queryKey: queryKeys.admin.role(roleName ?? ""),
    queryFn: ({ signal }) => adminService.getRole(roleName!, signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function usePermissionCatalogue() {
  const enabled = usePermission("Roles.Manage");
  return useQuery({
    queryKey: queryKeys.admin.permissionCatalogue(),
    queryFn: ({ signal }) => adminService.listPermissionCatalogue(signal),
    enabled,
    // The catalogue is compiled into the backend and changes only on deploy.
    staleTime: Infinity,
  });
}

export function useSetRolePermissions(roleName: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissions: string[]) =>
      adminService.setRolePermissions(roleName!, permissions),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.role(roleName ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles() });
      // A role's grants changed, so every user's effective permissions may have.
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
