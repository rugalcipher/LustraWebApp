import React from "react";
import WorkspaceShell from "@/layouts/WorkspaceShell";
import { navForGroup } from "@/app/routeRegistry";

/**
 * Management workspace — desktop-first operational console (concierge staff).
 * Chrome comes from WorkspaceShell; navigation is derived from the route
 * registry (single source of truth).
 */
export default function ManagementShell() {
  return <WorkspaceShell nav={navForGroup("management")} workspaceLabel="Concierge Console" />;
}
