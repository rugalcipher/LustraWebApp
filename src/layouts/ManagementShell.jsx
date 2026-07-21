import React from "react";
import WorkspaceShell from "@/layouts/WorkspaceShell";
import { navForGroup } from "@/app/routeRegistry";
import { usePrincipal } from "@/auth/PrincipalContext";

/**
 * Management workspace — desktop-first operational console (concierge staff).
 * Chrome comes from WorkspaceShell; navigation is derived from the route
 * registry (single source of truth) and filtered to what this principal may
 * actually open, so the menu never advertises a page that will refuse them.
 */
export default function ManagementShell() {
  const { hasPermission } = usePrincipal();
  return (
    <WorkspaceShell
      nav={navForGroup("management", hasPermission)}
      workspaceLabel="Concierge Console"
    />
  );
}
