import React from "react";
import type { Role } from "@/domain/roles";

// Pages (default exports from the existing .jsx pages)
import Landing from "@/pages/Landing";
import BrowseTalent from "@/pages/BrowseTalent";
import TalentProfile from "@/pages/TalentProfile";
import RequestAccess from "@/pages/RequestAccess";
import InfoPage from "@/pages/InfoPage";
import Unauthorized from "@/pages/Unauthorized";
import DevRoles from "@/pages/DevRoles";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Discover from "@/pages/Discover";
import Inquiry from "@/pages/Inquiry";
import Saved from "@/pages/Saved";
import Inquiries from "@/pages/Inquiries";
import Messages from "@/pages/Messages";
import Bookings from "@/pages/Bookings";
import Profile from "@/pages/Profile";

// Internal-shell pages are lazy-loaded (route-level code splitting): they are
// not needed for the initial public/client load, and this moves recharts (only
// used by AgencyAnalytics) and the rest of the internal area into split chunks.
const TalentPortal = React.lazy(() => import("@/pages/TalentPortal"));
const TalentAvailability = React.lazy(() => import("@/pages/TalentAvailability"));
const ManagementDashboard = React.lazy(() => import("@/pages/ManagementDashboard"));
const InquiryPipeline = React.lazy(() => import("@/pages/InquiryPipeline"));
const ProposalBuilder = React.lazy(() => import("@/pages/ProposalBuilder"));
const ClientDirectory = React.lazy(() => import("@/pages/ClientDirectory"));
const ModerationQueue = React.lazy(() => import("@/pages/ModerationQueue"));
const TalentMediaLibrary = React.lazy(() => import("@/pages/TalentMediaLibrary"));
const AgencyAnalytics = React.lazy(() => import("@/pages/AgencyAnalytics"));
const AgencyCalendar = React.lazy(() => import("@/pages/AgencyCalendar"));
const AccountSettings = React.lazy(() => import("@/pages/AccountSettings"));
const TalentOnboarding = React.lazy(() => import("@/pages/TalentOnboarding"));
const AdminDashboard = React.lazy(() => import("@/pages/AdminDashboard"));
const AdminUsers = React.lazy(() => import("@/pages/AdminUsers"));
const AdminPlatform = React.lazy(() => import("@/pages/AdminPlatform"));
const AdminAudit = React.lazy(() => import("@/pages/AdminAudit"));

/**
 * Typed route registry — the SINGLE source of truth for route → access, shell,
 * and navigation metadata. App.tsx generates `<Routes>` from it, permissions.ts
 * derives access/nav from it, and route guards resolve allowed roles from it.
 * No route-role logic is duplicated in App, sidebars, bottom nav, or guards.
 *
 * Shells:
 *  - "public"      → rendered bare (public pages own their chrome)
 *  - "client"      → AppShell (mobile-first immersive), nested under /app
 *  - "internal"    → RoleRoute → InternalShell dispatcher, which selects
 *                    Talent/Management/Admin shell by the authenticated principal
 *
 * The `nav` field drives which links appear in each workspace's navigation. The
 * `entitlement` field exists for completeness but is intentionally unused for
 * routes — VIP is a media-access policy, never a route requirement.
 */

export type ShellId = "public" | "client" | "internal";

/** Which workspace navigation group a route belongs to (for shell sidebars). */
export type NavGroup = "client" | "talent" | "management" | "admin";

export interface NavMeta {
  group: NavGroup;
  label: string;
  icon: string;
  order: number;
}

export interface RouteDef {
  /** Full path (client routes use the absolute /app/... path). */
  path: string;
  element: React.ReactElement;
  access: "public" | "protected";
  /** Allowed roles (protected routes). Omitted/undefined = any authenticated. */
  roles?: Role[];
  /** Fine-grained permissions required (all must be held). */
  permissions?: string[];
  /** Entitlement gate — reserved; NOT used for routes (VIP is media-access). */
  entitlement?: "vip";
  shell: ShellId;
  /** If present, the route appears in that workspace's navigation. */
  nav?: NavMeta;
  /** Client index route (renders at /app). */
  index?: boolean;
  /** Only registered when the dev role preview is enabled. */
  devOnly?: boolean;
}

const STAFF: Role[] = ["management", "admin", "superadmin"];
const ADMINS: Role[] = ["admin", "superadmin"];
const CLIENT_AND_UP: Role[] = ["client", "talent", "management", "admin", "superadmin"];

export const ROUTES: RouteDef[] = [
  // ---- Public ----
  { path: "/", element: <Landing />, access: "public", shell: "public" },
  { path: "/talent", element: <BrowseTalent />, access: "public", shell: "public" },
  { path: "/talent/:id", element: <TalentProfile />, access: "public", shell: "public" },
  { path: "/request-access", element: <RequestAccess />, access: "public", shell: "public" },
  { path: "/about", element: <InfoPage page="about" />, access: "public", shell: "public" },
  { path: "/how-it-works", element: <InfoPage page="how-it-works" />, access: "public", shell: "public" },
  { path: "/privacy", element: <InfoPage page="privacy" />, access: "public", shell: "public" },
  { path: "/terms", element: <InfoPage page="terms" />, access: "public", shell: "public" },
  { path: "/safety", element: <InfoPage page="safety" />, access: "public", shell: "public" },
  { path: "/unauthorized", element: <Unauthorized />, access: "public", shell: "public" },
  { path: "/login", element: <Login />, access: "public", shell: "public" },
  { path: "/register", element: <Register />, access: "public", shell: "public" },
  { path: "/forgot-password", element: <ForgotPassword />, access: "public", shell: "public" },
  { path: "/reset-password", element: <ResetPassword />, access: "public", shell: "public" },
  { path: "/dev/roles", element: <DevRoles />, access: "public", shell: "public", devOnly: true },

  // ---- Client app (mobile-first immersive) ----
  { path: "/app/discover", element: <Discover />, access: "protected", roles: CLIENT_AND_UP, shell: "client", index: true, nav: { group: "client", label: "Discover", icon: "Compass", order: 1 } },
  { path: "/app/talent/:id", element: <TalentProfile />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },
  { path: "/app/inquire/:id", element: <Inquiry />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },
  { path: "/app/saved", element: <Saved />, access: "protected", roles: CLIENT_AND_UP, shell: "client", nav: { group: "client", label: "Saved", icon: "Heart", order: 2 } },
  { path: "/app/inquiries", element: <Inquiries />, access: "protected", roles: CLIENT_AND_UP, shell: "client", nav: { group: "client", label: "Inquiries", icon: "MessageSquare", order: 3 } },
  { path: "/app/messages", element: <Messages />, access: "protected", roles: CLIENT_AND_UP, shell: "client", nav: { group: "client", label: "Messages", icon: "MessageSquare", order: 4 } },
  { path: "/app/bookings", element: <Bookings />, access: "protected", roles: CLIENT_AND_UP, shell: "client", nav: { group: "client", label: "Bookings", icon: "Calendar", order: 5 } },
  { path: "/app/profile", element: <Profile />, access: "protected", roles: CLIENT_AND_UP, shell: "client", nav: { group: "client", label: "Profile", icon: "User", order: 6 } },

  // ---- Talent portal ----
  { path: "/talent-portal", element: <TalentPortal />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Dashboard", icon: "LayoutDashboard", order: 1 } },
  { path: "/talent-availability", element: <TalentAvailability />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Availability", icon: "CalendarClock", order: 2 } },

  // ---- Management console ----
  { path: "/management-dashboard", element: <ManagementDashboard />, access: "protected", roles: STAFF, shell: "internal", nav: { group: "management", label: "Dashboard", icon: "LayoutDashboard", order: 1 } },
  { path: "/inquiry-pipeline", element: <InquiryPipeline />, access: "protected", roles: STAFF, permissions: ["Inquiries.View"], shell: "internal", nav: { group: "management", label: "Inquiries", icon: "Inbox", order: 2 } },
  { path: "/proposal-builder", element: <ProposalBuilder />, access: "protected", roles: STAFF, shell: "internal", nav: { group: "management", label: "Proposals", icon: "FileText", order: 3 } },
  { path: "/management-clients", element: <ClientDirectory />, access: "protected", roles: STAFF, shell: "internal", nav: { group: "management", label: "Clients", icon: "Users", order: 5 } },
  { path: "/moderation", element: <ModerationQueue />, access: "protected", roles: STAFF, permissions: ["Talent.ModerateMedia"], shell: "internal", nav: { group: "management", label: "Moderation", icon: "ShieldCheck", order: 6 } },
  { path: "/media-library", element: <TalentMediaLibrary />, access: "protected", roles: STAFF, shell: "internal", nav: { group: "management", label: "Media", icon: "Image", order: 7 } },
  { path: "/analytics", element: <AgencyAnalytics />, access: "protected", roles: STAFF, shell: "internal", nav: { group: "management", label: "Analytics", icon: "BarChart3", order: 8 } },

  // ---- Admin ----
  { path: "/admin", element: <AdminDashboard />, access: "protected", roles: ADMINS, shell: "internal", nav: { group: "admin", label: "Overview", icon: "LayoutDashboard", order: 1 } },
  { path: "/admin/users", element: <AdminUsers />, access: "protected", roles: ADMINS, shell: "internal", nav: { group: "admin", label: "Users", icon: "Users", order: 2 } },
  { path: "/admin/platform", element: <AdminPlatform />, access: "protected", roles: ADMINS, shell: "internal", nav: { group: "admin", label: "Platform", icon: "Database", order: 3 } },
  { path: "/admin/audit", element: <AdminAudit />, access: "protected", roles: ADMINS, shell: "internal", nav: { group: "admin", label: "Audit Log", icon: "ScrollText", order: 4 } },

  // ---- Shared internal (shell selected by principal) ----
  { path: "/agency-calendar", element: <AgencyCalendar />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "management", label: "Calendar", icon: "Calendar", order: 4 } },
  { path: "/onboarding-form", element: <TalentOnboarding />, access: "protected", roles: STAFF, shell: "internal" },
  { path: "/settings", element: <AccountSettings />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Settings", icon: "Settings", order: 9 } },
];

// ---- Derived selectors (single source of truth for the rest of the app) ----

export const publicRoutes = ROUTES.filter((r) => r.shell === "public");
export const clientRoutes = ROUTES.filter((r) => r.shell === "client");
export const internalRoutes = ROUTES.filter((r) => r.shell === "internal");

/** Resolve allowed roles for a path (longest-prefix match). null = public/any. */
export function allowedRolesFor(pathname: string): Role[] | null {
  const sorted = [...ROUTES].sort((a, b) => b.path.length - a.path.length);
  for (const r of sorted) {
    const base = r.path.replace(/\/:.*$/, ""); // strip trailing param segment
    if (pathname === r.path || pathname === base || pathname.startsWith(base + "/")) {
      return r.access === "public" ? null : r.roles ?? [];
    }
  }
  return null;
}

/** Required permissions for a path, if any. */
export function requiredPermissionsFor(pathname: string): string[] | undefined {
  const match = ROUTES.find((r) => r.path === pathname);
  return match?.permissions;
}

/** Navigation items for a workspace group, ordered. */
export function navForGroup(group: NavGroup): { to: string; label: string; icon: string }[] {
  return ROUTES.filter((r) => r.nav?.group === group)
    .sort((a, b) => (a.nav!.order ?? 0) - (b.nav!.order ?? 0))
    .map((r) => ({ to: r.path, label: r.nav!.label, icon: r.nav!.icon }));
}
