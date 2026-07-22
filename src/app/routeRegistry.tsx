import React from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "@/domain/roles";

// Pages (default exports from the existing .jsx pages)
import Landing from "@/pages/Landing";
import BrowseTalent from "@/pages/BrowseTalent";
import TalentProfile from "@/pages/TalentProfile";
import RequestAccess from "@/pages/RequestAccess";
import TalentApplication from "@/pages/TalentApplication";
import ApplicationContinue from "@/pages/ApplicationContinue";
import InfoPage from "@/pages/InfoPage";
import Unauthorized from "@/pages/Unauthorized";
import DevRoles from "@/pages/DevRoles";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import ChangePasswordRequired from "@/pages/ChangePasswordRequired";
import TalentActivate from "@/pages/TalentActivate";
import Discover from "@/pages/Discover";
import Saved from "@/pages/Saved";
import CollectionDetail from "@/pages/CollectionDetail";
import Messages from "@/pages/Messages";
import Conversation from "@/pages/Conversation";
import StartConversation from "@/pages/StartConversation";
import Notifications from "@/pages/Notifications";
import Report from "@/pages/Report";
import Profile from "@/pages/Profile";
import ClientAddresses from "@/pages/ClientAddresses";
import ClientAppointments from "@/pages/ClientAppointments";
import ClientAppointmentDetail from "@/pages/ClientAppointmentDetail";

// Internal-shell pages are lazy-loaded (route-level code splitting): they are
// not needed for the initial public/client load, and this moves recharts (only
// used by AgencyAnalytics) and the rest of the internal area into split chunks.
const TalentPortal = React.lazy(() => import("@/pages/TalentPortal"));
const TalentProfileEditor = React.lazy(() => import("@/pages/TalentProfileEditor"));
const TalentMedia = React.lazy(() => import("@/pages/TalentMedia"));
const TalentReviews = React.lazy(() => import("@/pages/TalentReviews"));
const TalentBookingDetail = React.lazy(() => import("@/pages/TalentBookingDetail"));
const TalentAppointments = React.lazy(() => import("@/pages/TalentAppointments"));
const TalentAvailability = React.lazy(() => import("@/pages/TalentAvailability"));
const TalentMessages = React.lazy(() => import("@/pages/TalentMessages"));
const TalentConversation = React.lazy(() => import("@/pages/TalentConversation"));
const TalentPreview = React.lazy(() => import("@/pages/TalentPreview"));
const ManagementDashboard = React.lazy(() => import("@/pages/ManagementDashboard"));
const InquiryPipeline = React.lazy(() => import("@/pages/InquiryPipeline"));
const ManagementInquiryDetail = React.lazy(() => import("@/pages/ManagementInquiryDetail"));
const ManagementConversation = React.lazy(() => import("@/pages/ManagementConversation"));
const ManagementConversations = React.lazy(() => import("@/pages/ManagementConversations"));
const CreateAppointment = React.lazy(() => import("@/pages/CreateAppointment"));
const ClientDirectory = React.lazy(() => import("@/pages/ClientDirectory"));
const ModerationQueue = React.lazy(() => import("@/pages/ModerationQueue"));
const AgencyAnalytics = React.lazy(() => import("@/pages/AgencyAnalytics"));
const AgencyCalendar = React.lazy(() => import("@/pages/AgencyCalendar"));
const AccountSettings = React.lazy(() => import("@/pages/AccountSettings"));
const AdminDashboard = React.lazy(() => import("@/pages/AdminDashboard"));
const AdminUsers = React.lazy(() => import("@/pages/AdminUsers"));
const AdminPlatform = React.lazy(() => import("@/pages/AdminPlatform"));
const AdminAudit = React.lazy(() => import("@/pages/AdminAudit"));
const ManagementAppointments = React.lazy(() => import("@/pages/ManagementAppointments"));
const ManagementAppointmentDetail = React.lazy(() => import("@/pages/ManagementAppointmentDetail"));
const TalentRoster = React.lazy(() => import("@/pages/TalentRoster"));
const TalentCreate = React.lazy(() => import("@/pages/TalentCreate"));
const TalentRecord = React.lazy(() => import("@/pages/TalentRecord"));
const AdminUserDetail = React.lazy(() => import("@/pages/AdminUserDetail"));
const AdminRoles = React.lazy(() => import("@/pages/AdminRoles"));
const AdminStaffProvision = React.lazy(() => import("@/pages/AdminStaffProvision"));
const TalentApplicationsQueue = React.lazy(() => import("@/pages/TalentApplicationsQueue"));
const TalentApplicationReview = React.lazy(() => import("@/pages/TalentApplicationReview"));

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
  /** Optional heading the item is grouped under in the sidebar (e.g. "People"). */
  section?: string;
  /**
   * Marks a primary destination. The talent mobile bottom bar shows only the (four) primary
   * items; everything else moves to the side drawer. Shells that don't split primary/secondary
   * ignore this.
   */
  primary?: boolean;
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
  /**
   * If present, the route appears in that workspace's navigation. An array puts
   * one route in more than one workspace — a Management reviewer and an admin
   * reach the same page from different shells.
   */
  nav?: NavMeta | NavMeta[];
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
  // MUST precede "/talent/:id": otherwise React Router matches "activate" as a
  // talent id and every invitation link renders a broken profile page.
  { path: "/talent/activate", element: <TalentActivate />, access: "public", shell: "public" },
  { path: "/talent/:id", element: <TalentProfile />, access: "public", shell: "public" },
  { path: "/request-access", element: <RequestAccess />, access: "public", shell: "public" },
  { path: "/for-talent", element: <TalentApplication />, access: "public", shell: "public" },
  // Target of the backend's changes-requested email. Public and deliberately
  // ABOVE "/apply": the applicant arrives here holding a token, not an account,
  // and the alias below would otherwise redirect them away from it.
  { path: "/apply/continue", element: <ApplicationContinue />, access: "public", shell: "public" },
  // Friendly aliases for the talent application (shared in campaigns / QR codes).
  { path: "/apply", element: <Navigate to="/for-talent" replace />, access: "public", shell: "public" },
  { path: "/become-talent", element: <Navigate to="/for-talent" replace />, access: "public", shell: "public" },
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
  // Target of the backend's AppUrls:EmailVerificationPath link.
  { path: "/verify-email", element: <VerifyEmail />, access: "public", shell: "public" },
  // Where a restricted session is held. Registered as "public" because the guard
  // above the router must be able to route here BEFORE the role guards run — a
  // restricted user who also lacks a role would otherwise be bounced to
  // /unauthorized, which cannot help them. The page itself reads the principal
  // and the API refuses everything but the change until it succeeds.
  { path: "/change-password", element: <ChangePasswordRequired />, access: "public", shell: "public" },
  { path: "/dev/roles", element: <DevRoles />, access: "public", shell: "public", devOnly: true },

  // ---- Client app (mobile-first immersive) ----
  //
  // Lustra is concierge-led. The client browses, presses MESSAGE, and arranges everything
  // by talking to management. There is deliberately NO inquiry form, proposal, booking or
  // settlement on this surface — see INTEGRATION.md §0. The corresponding screens have
  // been withdrawn from routing; their code and endpoints remain but are legacy/deferred
  // and must not be reintroduced without a product decision.
  { path: "/app/discover", element: <Discover />, access: "protected", roles: CLIENT_AND_UP, shell: "client", index: true, nav: { group: "client", label: "Discover", icon: "Compass", order: 1 } },
  { path: "/app/talent/:id", element: <TalentProfile />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },
  { path: "/app/saved", element: <Saved />, access: "protected", roles: CLIENT_AND_UP, shell: "client", nav: { group: "client", label: "Saved", icon: "Heart", order: 2 } },
  { path: "/app/collections/:id", element: <CollectionDetail />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },
  { path: "/app/messages", element: <Messages />, access: "protected", roles: CLIENT_AND_UP, shell: "client", nav: { group: "client", label: "Messages", icon: "MessageSquare", order: 3 } },
  { path: "/app/messages/:id", element: <Conversation />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },
  // The MESSAGE action lands here: it opens or reuses the management conversation for a
  // talent, then replaces itself with the thread. A route (not an inline handler) because
  // a guest returning from login can only resume by navigating to a URL.
  { path: "/app/message/:slug", element: <StartConversation />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },
  // Reached from the header bell rather than the bottom bar: the client navigation is a
  // six-column grid, and a seventh item would break the approved layout.
  { path: "/app/notifications", element: <Notifications />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },
  // Safety reporting. Linked from talent profiles; the route was missing until Stage 12,
  // so "Report profile" silently 404'd.
  { path: "/app/report", element: <Report />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },
  // The client's own appointments — read-only. They are reserved by management;
  // nothing on this surface creates, reschedules or cancels one.
  { path: "/app/appointments", element: <ClientAppointments />, access: "protected", roles: CLIENT_AND_UP, shell: "client", nav: { group: "client", label: "Appointments", icon: "CalendarCheck", order: 4 } },
  { path: "/app/appointments/:id", element: <ClientAppointmentDetail />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },
  { path: "/app/profile", element: <Profile />, access: "protected", roles: CLIENT_AND_UP, shell: "client", nav: { group: "client", label: "Profile", icon: "User", order: 5 } },
  // Saved addresses — reached from the profile, not the bottom bar (a seventh tab would break
  // the approved six-column client grid).
  { path: "/app/addresses", element: <ClientAddresses />, access: "protected", roles: CLIENT_AND_UP, shell: "client" },

  // ---- Talent portal ----
  //
  // The mobile bottom bar shows exactly the four PRIMARY items — Preview, Appointments,
  // Messages, Profile — with Preview first and the talent's default landing (see roles.ts).
  // Everything else is a real route in the side drawer, not removed.
  { path: "/talent-preview", element: <TalentPreview />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Preview", icon: "Eye", order: 1, primary: true } },
  { path: "/talent-appointments", element: <TalentAppointments />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Appointments", icon: "CalendarCheck", order: 2, primary: true } },
  // A talent's booking conversations (client ↔ talent ↔ management). Participant-gated on the
  // server: a talent only ever sees threads for bookings assigned to them.
  { path: "/talent-messages", element: <TalentMessages />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Messages", icon: "MessageSquare", order: 3, primary: true } },
  { path: "/talent-messages/:id", element: <TalentConversation />, access: "protected", roles: ["talent", ...STAFF], shell: "internal" },
  { path: "/talent-profile", element: <TalentProfileEditor />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Profile", icon: "User", order: 4, primary: true } },
  // Secondary talent tools — the side drawer.
  { path: "/talent-portal", element: <TalentPortal />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Dashboard", icon: "LayoutDashboard", order: 10 } },
  { path: "/talent-media", element: <TalentMedia />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Media", icon: "Image", order: 11 } },
  { path: "/talent-availability", element: <TalentAvailability />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Availability", icon: "CalendarClock", order: 12 } },
  { path: "/talent-reviews", element: <TalentReviews />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Reviews", icon: "Star", order: 13 } },
  { path: "/talent-bookings/:id", element: <TalentBookingDetail />, access: "protected", roles: ["talent", ...STAFF], shell: "internal" },

  // ---- Management console ----
  { path: "/management-dashboard", element: <ManagementDashboard />, access: "protected", roles: STAFF, shell: "internal", nav: { group: "management", label: "Dashboard", icon: "LayoutDashboard", order: 1 } },
  { path: "/inquiry-pipeline", element: <InquiryPipeline />, access: "protected", roles: STAFF, permissions: ["Inquiries.View"], shell: "internal", nav: { group: "management", label: "Inquiries", icon: "Inbox", order: 2 } },
  { path: "/inquiry-pipeline/:id", element: <ManagementInquiryDetail />, access: "protected", roles: STAFF, permissions: ["Inquiries.View"], shell: "internal" },
  { path: "/management-conversations", element: <ManagementConversations />, access: "protected", roles: STAFF, permissions: ["Conversations.View"], shell: "internal", nav: [
    { group: "management", label: "Conversations", icon: "MessagesSquare", order: 3 },
    { group: "admin", label: "Conversations", icon: "MessagesSquare", order: 4, section: "Operations" },
  ] },
  { path: "/management-conversations/:id", element: <ManagementConversation />, access: "protected", roles: STAFF, permissions: ["Conversations.View"], shell: "internal" },
  // Creating an appointment is a Bookings.Create action reached from a conversation.
  { path: "/create-appointment", element: <CreateAppointment />, access: "protected", roles: STAFF, permissions: ["Bookings.Create"], shell: "internal" },
  { path: "/management-clients", element: <ClientDirectory />, access: "protected", roles: STAFF, shell: "internal", nav: [
    { group: "management", label: "Clients", icon: "Users", order: 11, section: "People" },
    { group: "admin", label: "Clients", icon: "Users", order: 11, section: "People" },
  ] },
  { path: "/moderation", element: <ModerationQueue />, access: "protected", roles: STAFF, permissions: ["Talent.ModerateMedia"], shell: "internal", nav: [
    { group: "management", label: "Moderation", icon: "ShieldCheck", order: 12, section: "Moderation" },
    { group: "admin", label: "Moderation", icon: "ShieldCheck", order: 12, section: "Moderation" },
  ] },
  { path: "/analytics", element: <AgencyAnalytics />, access: "protected", roles: STAFF, shell: "internal", nav: [
    { group: "management", label: "Analytics", icon: "BarChart3", order: 20, section: "Platform" },
    { group: "admin", label: "Analytics", icon: "BarChart3", order: 19, section: "Platform" },
  ] },

  // ---- Admin ----
  { path: "/admin", element: <AdminDashboard />, access: "protected", roles: ADMINS, shell: "internal", nav: { group: "admin", label: "Overview", icon: "LayoutDashboard", order: 1 } },
  { path: "/admin/users", element: <AdminUsers />, access: "protected", roles: ADMINS, permissions: ["Users.View"], shell: "internal", nav: { group: "admin", label: "All Users", icon: "Users", order: 9, section: "People" } },
  { path: "/admin/platform", element: <AdminPlatform />, access: "protected", roles: ADMINS, shell: "internal", nav: { group: "admin", label: "Platform", icon: "Database", order: 20, section: "Platform" } },
  { path: "/admin/audit", element: <AdminAudit />, access: "protected", roles: ADMINS, shell: "internal", nav: { group: "admin", label: "Audit Log", icon: "ScrollText", order: 30, section: "Security" } },

  // ---- Talent applications (Phase 1) ----
  //
  // Reachable by Management reviewers as well as admins, so it carries nav entries
  // for both workspaces. Visibility follows the permission, not the role: the
  // server enforces the same three permissions on every call.
  { path: "/admin/talent-applications", element: <TalentApplicationsQueue />, access: "protected", roles: STAFF, permissions: ["TalentApplications.View"], shell: "internal", nav: [
    { group: "management", label: "Talent Applications", icon: "UserPlus", order: 9, section: "People" },
    { group: "admin", label: "Talent Applications", icon: "UserPlus", order: 7, section: "People" },
  ] },

  // ---- Talent administration (Phase 4) ----
  //
  // "/admin/talent/new" MUST precede "/admin/talent/:id": otherwise React Router
  // matches "new" as a profile id and the create page renders a failed lookup.
  { path: "/admin/talent", element: <TalentRoster />, access: "protected", roles: STAFF, permissions: ["Talent.View"], shell: "internal", nav: [
    { group: "management", label: "Talent", icon: "UserCheck", order: 10, section: "People" },
    { group: "admin", label: "Talent", icon: "UserCheck", order: 8, section: "People" },
  ] },
  { path: "/admin/talent/new", element: <TalentCreate />, access: "protected", roles: STAFF, permissions: ["Talent.Create"], shell: "internal" },
  { path: "/admin/talent/:id", element: <TalentRecord />, access: "protected", roles: STAFF, permissions: ["Talent.View"], shell: "internal" },

  // ---- Account administration (Phase 4) ----
  { path: "/admin/users/new", element: <AdminStaffProvision />, access: "protected", roles: ADMINS, permissions: ["Users.Manage"], shell: "internal" },
  { path: "/admin/users/:id", element: <AdminUserDetail />, access: "protected", roles: ADMINS, permissions: ["Users.View"], shell: "internal" },
  { path: "/admin/roles", element: <AdminRoles />, access: "protected", roles: ADMINS, permissions: ["Roles.Manage"], shell: "internal", nav: { group: "admin", label: "Roles & Permissions", icon: "ShieldCheck", order: 10, section: "People" } },
  { path: "/admin/talent-applications/:id", element: <TalentApplicationReview />, access: "protected", roles: STAFF, permissions: ["TalentApplications.View"], shell: "internal" },

  // ---- Operations (Phase 2) ----
  //
  // The appointment register and the calendar are the same operational surface
  // seen two ways, so they share one navigation section. Both are real
  // destinations — neither is registered before its page exists.
  { path: "/admin/appointments", element: <ManagementAppointments />, access: "protected", roles: STAFF, permissions: ["Bookings.View"], shell: "internal", nav: [
    { group: "management", label: "Appointments", icon: "CalendarCheck", order: 7, section: "Operations" },
    { group: "admin", label: "Appointments", icon: "CalendarCheck", order: 5, section: "Operations" },
  ] },
  { path: "/admin/appointments/:id", element: <ManagementAppointmentDetail />, access: "protected", roles: STAFF, permissions: ["Bookings.View"], shell: "internal" },
  // The same calendar page as /agency-calendar, registered under the operations
  // prefix so the console's own links and a direct visit both resolve.
  { path: "/admin/calendar", element: <AgencyCalendar />, access: "protected", roles: STAFF, permissions: ["Bookings.View"], shell: "internal", nav: [
    { group: "management", label: "Calendar", icon: "Calendar", order: 8, section: "Operations" },
    { group: "admin", label: "Calendar", icon: "Calendar", order: 6, section: "Operations" },
  ] },

  // ---- Shared internal (shell selected by principal) ----
  { path: "/agency-calendar", element: <AgencyCalendar />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Calendar", icon: "Calendar", order: 14 } },
  { path: "/settings", element: <AccountSettings />, access: "protected", roles: ["talent", ...STAFF], shell: "internal", nav: { group: "talent", label: "Account & security", icon: "Settings", order: 15 } },
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

/** A route's nav entries, normalized — `nav` may be one entry or several. */
export const navMetas = (nav: RouteDef["nav"]): NavMeta[] =>
  nav ? (Array.isArray(nav) ? nav : [nav]) : [];

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  section?: string;
  /** True for a primary destination (talent bottom bar); see {@link NavMeta.primary}. */
  primary?: boolean;
}

/**
 * Navigation items for a workspace group, ordered.
 *
 * `hasPermission` hides links the caller cannot use. Passing it is optional so a
 * caller with no principal (tests, storybook) still gets the full menu; the
 * shells always pass it. This is presentation only — the route guard and the API
 * both re-check, so a hidden link is a courtesy and never the control.
 */
export function navForGroup(
  group: NavGroup,
  hasPermission?: (permission: string) => boolean
): NavItem[] {
  return ROUTES.flatMap((r) =>
    navMetas(r.nav)
      .filter((meta) => meta.group === group)
      .filter(() => !hasPermission || (r.permissions ?? []).every(hasPermission))
      .map((meta) => ({
        to: r.path,
        label: meta.label,
        icon: meta.icon,
        section: meta.section,
        primary: meta.primary,
        order: meta.order ?? 0,
      }))
  )
    .sort((a, b) => a.order - b.order)
    .map(({ to, label, icon, section, primary }) => ({ to, label, icon, section, primary }));
}
