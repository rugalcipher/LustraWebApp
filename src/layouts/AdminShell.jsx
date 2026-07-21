import React from "react";
import WorkspaceShell from "@/layouts/WorkspaceShell";
import { navForGroup } from "@/app/routeRegistry";
import { usePrincipal } from "@/auth/PrincipalContext";

/**
 * Admin workspace — desktop-first executive/administration console. Reuses the
 * WorkspaceShell chrome with the admin navigation derived from the route
 * registry and filtered to the permissions this principal holds.
 */
export default function AdminShell() {
  const { hasPermission } = usePrincipal();
  return <WorkspaceShell nav={navForGroup("admin", hasPermission)} workspaceLabel="Administration" />;
}
