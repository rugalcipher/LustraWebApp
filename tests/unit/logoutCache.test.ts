import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { clearUserScopedCaches } from "@/services/cache";
import { queryKeys, USER_SCOPED_NAMESPACES } from "@/api/queryKeys";

describe("cache clearing on logout / account switch", () => {
  it("removes every user-scoped namespace so protected data cannot be read back", () => {
    const qc = new QueryClient();

    qc.setQueryData(queryKeys.auth.me(), { id: "u1" });
    qc.setQueryData(queryKeys.inquiries.mine(), [{ id: "i1" }]);
    qc.setQueryData(queryKeys.conversations.mine(), [{ id: "c1" }]);
    qc.setQueryData(queryKeys.bookings.mine(), [{ id: "b1" }]);
    qc.setQueryData(queryKeys.media.gallery("u1", "t1"), [{ id: "m1" }]);
    qc.setQueryData(queryKeys.talentPortal.draft(), { headline: "draft" });
    qc.setQueryData(queryKeys.management.dashboard(), { open: 3 });
    qc.setQueryData(queryKeys.admin.auditLogs(), { items: [] });

    clearUserScopedCaches(qc);

    expect(qc.getQueryData(queryKeys.auth.me())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.inquiries.mine())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.conversations.mine())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.bookings.mine())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.media.gallery("u1", "t1"))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.talentPortal.draft())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.management.dashboard())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.admin.auditLogs())).toBeUndefined();
  });

  it("keeps public caches, which are not user-scoped", () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.reference.countries(), [{ id: "c1" }]);
    qc.setQueryData(queryKeys.talent.public("isabelle"), { slug: "isabelle" });
    qc.setQueryData(queryKeys.cms.page("about"), { slug: "about" });

    clearUserScopedCaches(qc);

    expect(qc.getQueryData(queryKeys.reference.countries())).toBeDefined();
    expect(qc.getQueryData(queryKeys.talent.public("isabelle"))).toBeDefined();
    expect(qc.getQueryData(queryKeys.cms.page("about"))).toBeDefined();
  });

  it("scopes the talent portal separately from public talent data", () => {
    // A regression guard: if talent-portal drafts shared the public `talent`
    // namespace they would survive sign-out.
    expect(USER_SCOPED_NAMESPACES).toContain("talent-portal");
    expect(USER_SCOPED_NAMESPACES).not.toContain("talent");
    expect(queryKeys.talentPortal.draft()[0]).toBe("talent-portal");
    expect(queryKeys.talent.public("x")[0]).toBe("talent");
  });

  it("gives unrelated endpoints distinct, collision-free keys", () => {
    const keys = [
      queryKeys.inquiries.mine(),
      queryKeys.management.inquiries(),
      queryKeys.bookings.mine(),
      queryKeys.talentPortal.bookings(),
      queryKeys.reference.cities("r1"),
      queryKeys.admin.cities("r1"),
    ].map((k) => JSON.stringify(k));

    expect(new Set(keys).size).toBe(keys.length);
  });
});
