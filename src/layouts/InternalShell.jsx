import React from "react";
import { usePrincipal } from "@/auth/PrincipalContext";
import TalentShell from "@/layouts/TalentShell";
import ManagementShell from "@/layouts/ManagementShell";
import AdminShell from "@/layouts/AdminShell";

/**
 * Internal shell dispatcher.
 *
 * Renders the workspace shell that matches the current principal's role, so a
 * route shared by several roles (e.g. /settings, /agency-calendar) always shows
 * the right chrome:
 *   - talent                 → TalentShell (responsive, mobile-capable)
 *   - management             → ManagementShell (desktop-first)
 *   - admin / superadmin     → AdminShell (desktop-first)
 *
 * Access is still gated upstream by <RoleRoute>; this only selects presentation.
 */
export default function InternalShell() {
  const { primaryRole } = usePrincipal();

  if (primaryRole === "talent") return <TalentShell />;
  if (primaryRole === "admin" || primaryRole === "superadmin") return <AdminShell />;
  // management (and any staff fallback)
  return <ManagementShell />;
}
