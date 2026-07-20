import { describe, it, expect } from "vitest";
import {
  columnFor, PIPELINE_COLUMNS, INQUIRY_STATUSES, priorityTone, APPROVAL_VISIBILITIES,
} from "@/services/managementService";
import { queryKeys, USER_SCOPED_NAMESPACES } from "@/api/queryKeys";

describe("inquiry pipeline columns", () => {
  it("places every backend InquiryStatus in a column", () => {
    // A status with no column would make an inquiry invisible to the team working the
    // queue — the worst possible failure for an operational board.
    const columnIds = PIPELINE_COLUMNS.map((c) => c.id);
    for (const status of INQUIRY_STATUSES) {
      expect(columnIds).toContain(columnFor(status));
    }
  });

  it("covers the full InquiryStatus enum", () => {
    // Mirrors the backend enum, which the client-facing presenter also maps.
    for (const status of [
      "New", "ManagementReviewing", "AwaitingClientDetails", "CheckingAvailability",
      "ProposalSent", "AwaitingClientConfirmation", "AcceptedByClient",
      "ConvertedToBooking", "Declined", "Cancelled", "Closed",
    ]) {
      expect(INQUIRY_STATUSES).toContain(status);
    }
  });

  it("files an unrecognised status somewhere visible rather than dropping it", () => {
    expect(columnFor("SomeFutureStatus")).toBe("New");
  });

  it("keeps closed outcomes out of the active columns", () => {
    for (const status of ["ConvertedToBooking", "Declined", "Cancelled", "Closed"]) {
      expect(columnFor(status)).toBe("Closed");
    }
  });

  it("separates proposal-stage inquiries from those still under review", () => {
    expect(columnFor("ManagementReviewing")).toBe("Reviewing");
    expect(columnFor("ProposalSent")).toBe("Proposal");
    expect(columnFor("AcceptedByClient")).toBe("Proposal");
  });
});

describe("priority", () => {
  it("flags high and urgent alike", () => {
    expect(priorityTone("High")).toBe("high");
    expect(priorityTone("Urgent")).toBe("high");
    expect(priorityTone("Normal")).toBe("normal");
    expect(priorityTone("Low")).toBe("low");
  });

  it("treats an unknown priority as normal rather than urgent", () => {
    // Defaulting unknown to "high" would cry wolf on every new enum member.
    expect(priorityTone("Whatever")).toBe("normal");
  });
});

describe("media approval visibility", () => {
  it("offers exactly the backend MediaVisibility members management may assign", () => {
    expect(APPROVAL_VISIBILITIES.map((v) => v.value)).toEqual([
      "Public", "VipOnly", "Private", "ManagementOnly",
    ]);
  });

  it("does not offer Archived as an approval outcome", () => {
    // Archived is a deletion state, not a publication choice. Offering it here would let
    // a moderator "approve" an item into invisibility.
    expect(APPROVAL_VISIBILITIES.map((v) => v.value)).not.toContain("Archived");
  });

  it("explains what VIP-only actually restricts", () => {
    const vip = APPROVAL_VISIBILITIES.find((v) => v.value === "VipOnly");
    expect(vip?.detail).toMatch(/VIP/i);
  });
});

describe("management cache scoping", () => {
  it("keeps management data user-scoped so it is dropped on sign-out", () => {
    // Management queues carry client identities, internal notes and unapproved media.
    expect(USER_SCOPED_NAMESPACES).toContain("management");
  });

  it("scopes entitlement lookups per client", () => {
    const a = JSON.stringify(queryKeys.management.entitlements("client-a"));
    const b = JSON.stringify(queryKeys.management.entitlements("client-b"));
    expect(a).not.toBe(b);
  });

  it("nests VIP requests under the management namespace", () => {
    expect(queryKeys.management.vipRequests({ status: "Pending" })[0]).toBe("management");
  });

  it("keeps the client's own entitlement key separate from management's view", () => {
    // The client sees only whether they hold VIP; management sees notes and history.
    // Sharing a key would risk one rendering the other's payload.
    expect(queryKeys.client.entitlements()[0]).toBe("client");
    expect(queryKeys.management.entitlements("x")[0]).toBe("management");
  });
});
