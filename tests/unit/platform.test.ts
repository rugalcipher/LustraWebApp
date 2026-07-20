import { describe, it, expect } from "vitest";
import { ROUTES, allowedRolesFor, requiredPermissionsFor } from "@/app/routeRegistry";
import { queryKeys } from "@/api/queryKeys";

/**
 * Route-registry integrity.
 *
 * The registry is the single source of truth for access control, navigation and the
 * generated `<Routes>`. A link pointing at a path with no route silently 404s, which is
 * exactly the bug this suite exists to prevent.
 */
describe("route registry", () => {
  const paths = new Set(ROUTES.map((r) => r.path));

  it("registers every management route the console links to", () => {
    // These were linked from the pipeline board before they existed, and 404'd.
    expect(paths).toContain("/inquiry-pipeline/:id");
    expect(paths).toContain("/management-conversations/:id");
  });

  it("registers every talent-portal route", () => {
    for (const path of [
      "/talent-portal", "/talent-profile", "/talent-media",
      "/talent-availability", "/talent-reviews", "/talent-bookings/:id",
    ]) {
      expect(paths).toContain(path);
    }
  });

  it("registers every client route", () => {
    for (const path of [
      "/app/discover", "/app/saved", "/app/collections/:id",
      "/app/messages", "/app/messages/:id", "/app/message/:slug",
      "/app/notifications", "/app/report", "/app/profile",
    ]) {
      expect(paths).toContain(path);
    }
  });

  it("keeps the booking lifecycle OFF the client surface", () => {
    // Lustra is concierge-led: the client browses, messages management, and arranges
    // everything in conversation. Re-adding any of these would put the client back into
    // operational paperwork the product deliberately spares them. See INTEGRATION.md §0.
    for (const path of [
      "/app/inquire/:id", "/app/inquiries", "/app/inquiries/:id",
      "/app/bookings", "/app/bookings/:id", "/app/proposals/:id",
    ]) {
      expect(paths, `${path} must not be routable for clients`).not.toContain(path);
    }
  });

  it("offers the client exactly four navigation entries", () => {
    // Discover · Saved · Messages · Profile. A fifth would mean the lifecycle crept back.
    const clientNav = ROUTES.filter((r) => r.nav?.group === "client");
    expect(clientNav.map((r) => r.nav!.label).sort()).toEqual(
      ["Discover", "Messages", "Profile", "Saved"]
    );
  });

  it("registers the internal appointment surfaces", () => {
    for (const path of [
      "/management-conversations", // the inbox; only the detail route existed before
      "/create-appointment",
      "/agency-calendar",
      "/talent-appointments",
      "/talent-bookings/:id",
    ]) {
      expect(paths).toContain(path);
    }
  });

  it("keeps the proposal builder out of the console", () => {
    // The formal proposal workflow is withdrawn. A mock Proposals entry in management
    // navigation would advertise a lifecycle the product no longer has.
    expect(paths).not.toContain("/proposal-builder");
    const managementNav = ROUTES.filter((r) => r.nav?.group === "management");
    expect(managementNav.map((r) => r.nav!.label)).not.toContain("Proposals");
  });

  it("guards appointment creation behind the create permission", () => {
    expect(requiredPermissionsFor("/create-appointment")).toContain("Bookings.Create");
    expect(requiredPermissionsFor("/management-conversations")).toContain("Conversations.View");
  });

  it("keeps the appointment surfaces off the client shell entirely", () => {
    // The client must have no route to an appointment. Any of these appearing in the
    // client shell would be a direct breach of the concierge model.
    for (const path of ["/create-appointment", "/agency-calendar", "/talent-appointments"]) {
      const route = ROUTES.find((r) => r.path === path);
      expect(route?.shell).toBe("internal");
      expect(route?.roles).not.toContain("client");
    }
  });

  it("has no duplicate paths", () => {
    // A duplicate means one definition silently wins and the other's roles or permissions
    // are never applied.
    expect(paths.size).toBe(ROUTES.length);
  });

  it("keeps every client-area route protected", () => {
    // The client area holds inquiries, conversations and bookings. A public one would be
    // a straightforward data leak.
    //
    // Matched on "/app/" with the trailing slash, NOT "/app": the latter also catches the
    // public "/apply" marketing redirect, which is correctly public.
    const clientArea = ROUTES.filter((r) => r.path.startsWith("/app/"));
    expect(clientArea.length).toBeGreaterThan(5);
    for (const route of clientArea) {
      expect(route.access).toBe("protected");
      expect(route.shell).toBe("client");
    }
  });

  it("keeps the public /apply redirect out of the client area", () => {
    // Guards the prefix trap above: /apply is public by design and must not be
    // "fixed" into the protected area by a future prefix-matching change.
    const apply = ROUTES.find((r) => r.path === "/apply");
    expect(apply?.access).toBe("public");
    expect(apply?.shell).toBe("public");
  });

  it("keeps every management and admin route staff-only", () => {
    const internal = ROUTES.filter(
      (r) =>
        r.path.startsWith("/admin") ||
        r.path.startsWith("/management") ||
        r.path.startsWith("/inquiry-pipeline") ||
        r.path.startsWith("/moderation")
    );
    expect(internal.length).toBeGreaterThan(0);
    for (const route of internal) {
      expect(route.access).toBe("protected");
      expect(route.roles).toBeDefined();
      // No client or talent may reach a management surface.
      expect(route.roles).not.toContain("client");
      expect(route.roles).not.toContain("talent");
    }
  });

  it("resolves roles for a nested management path", () => {
    const roles = allowedRolesFor("/inquiry-pipeline/some-guid");
    expect(roles).not.toBeNull();
    expect(roles).not.toContain("client");
  });

  it("requires a permission on the routes that carry one", () => {
    expect(requiredPermissionsFor("/inquiry-pipeline")).toContain("Inquiries.View");
    expect(requiredPermissionsFor("/management-conversations/:id")).toContain("Conversations.View");
  });

  it("never marks an admin route as public", () => {
    for (const route of ROUTES.filter((r) => r.path.startsWith("/admin"))) {
      expect(route.access).toBe("protected");
    }
  });
});

describe("management conversation cache keys", () => {
  it("separates message pages per conversation", () => {
    const a = JSON.stringify(queryKeys.management.conversationMessages("c1", 1));
    const b = JSON.stringify(queryKeys.management.conversationMessages("c2", 1));
    const c = JSON.stringify(queryKeys.management.conversationMessages("c1", 2));
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("nests message pages under the management namespace so they clear on sign-out", () => {
    // These carry client conversation bodies; they must not survive an account switch.
    expect(queryKeys.management.conversationMessages("c1", 1)[0]).toBe("management");
  });
});
