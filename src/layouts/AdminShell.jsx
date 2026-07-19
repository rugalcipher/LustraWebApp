import React from "react";
import WorkspaceShell from "@/layouts/WorkspaceShell";
import { navForGroup } from "@/app/routeRegistry";

/**
 * Admin workspace — desktop-first executive/administration console. Reuses the
 * WorkspaceShell chrome with the admin navigation derived from the route
 * registry.
 */
export default function AdminShell() {
  return <WorkspaceShell nav={navForGroup("admin")} workspaceLabel="Administration" />;
}
