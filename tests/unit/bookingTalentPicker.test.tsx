import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as appointmentService from "@/services/appointmentService";
import { adoptAuthResult, endSession } from "@/api/authTokenCoordinator";

/**
 * The booking-scoped talent picker.
 *
 * The point of this endpoint is a PERMISSION split: choosing who to schedule needs only
 * `Bookings.Manage`, while the talent administration roster needs `Talent.View` because it
 * exposes legal names, contact details and account security. So the assertions that matter
 * are the ones proving the picker calls the booking route and never the roster, and that its
 * payload carries none of the administration fields.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function emptyPage() {
  return { items: [], totalCount: 0, page: 1, pageSize: 20 };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(jsonResponse(emptyPage()));
  vi.stubGlobal("fetch", fetchMock);
  adoptAuthResult({
    user: { id: "staff-1" },
    tokens: { accessToken: "a", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z" },
  } as never);
});

afterEach(() => {
  endSession("logout");
  vi.unstubAllGlobals();
});

function requestedUrl(call = 0): string {
  const [input] = fetchMock.mock.calls[call];
  return typeof input === "string" ? input : String(input);
}

const pickerSource = () =>
  readFileSync(resolve(process.cwd(), "src/features/talentAdmin/TalentPicker.jsx"), "utf8");

/**
 * The picker with comments stripped.
 *
 * The file explains in prose WHY the booking route exists — which necessarily names
 * `/management/talents` and `Talent.View`. Asserting against the raw text would match that
 * explanation and fail on a correct file, so the code-shape assertions read this instead.
 * A test that matches its own documentation proves nothing.
 */
const pickerCode = () =>
  pickerSource()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("booking talent options — request shape", () => {
  it("calls the booking-scoped route, never the talent administration roster", async () => {
    await appointmentService.searchBookingTalentOptions({ query: "isabelle" });

    const url = requestedUrl();
    expect(url).toContain("/management/bookings/talent-options");
    // The whole reason this endpoint exists.
    expect(url).not.toContain("/management/talents");
  });

  it("sends the exact query names the backend binds", async () => {
    await appointmentService.searchBookingTalentOptions({
      query: "isabelle",
      includeUnavailable: true,
      page: 3,
      pageSize: 50,
    });

    const url = requestedUrl();
    expect(url).toContain("query=isabelle");
    expect(url).toContain("includeUnavailable=true");
    expect(url).toContain("page=3");
    expect(url).toContain("pageSize=50");
  });

  it("omits absent filters rather than sending empty values", async () => {
    await appointmentService.searchBookingTalentOptions({});

    const url = requestedUrl();
    expect(url).not.toContain("query=");
    expect(url).not.toContain("includeUnavailable=");
  });

  it("resolves a single talent by id for an existing appointment", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        talentProfileId: "t-1",
        displayName: "Archived Talent",
        coverImage: null,
        cityName: null,
        profileStatus: "Archived",
        accountStatus: "Suspended",
        isArchived: true,
        isSuspended: false,
        isPublished: false,
        canReceiveNewBooking: false,
        unavailableReason: "This talent has been archived and cannot take new appointments.",
      })
    );

    const talent = await appointmentService.getBookingTalentOption("t-1");

    expect(requestedUrl()).toContain("/management/bookings/talent-options/t-1");
    // An old booking must still render who it was assigned to.
    expect(talent.displayName).toBe("Archived Talent");
    expect(talent.canReceiveNewBooking).toBe(false);
  });

  it("never produces a doubled /api/v1 prefix", async () => {
    await appointmentService.searchBookingTalentOptions({ query: "x" });
    expect(requestedUrl()).not.toContain("/api/v1/api/v1");
  });
});

describe("booking talent picker — component contract", () => {
  it("reads the booking-options hook and not the talent roster", () => {
    const source = pickerCode();

    expect(source).toContain("useBookingTalentOptions");
    // Would reintroduce the Talent.View coupling this endpoint removed.
    expect(source).not.toContain("useTalentRoster");
    expect(source).not.toContain("/management/talents");
  });

  it("no longer tells the operator they need Talent.View", () => {
    const source = pickerCode();

    expect(source).not.toContain("Talent.View");
    expect(source).not.toMatch(/permission to view talent/i);
    expect(source).not.toContain("useTalentAdminPermissions");
  });

  it("refuses to select a talent the server marked unassignable", () => {
    const source = pickerSource();

    // The guard, not just a disabled attribute: a disabled button can still be
    // activated programmatically, so the handler checks too.
    expect(source).toMatch(/if \(!talent\.canReceiveNewBooking\) return;/);
    expect(source).toContain("disabled={!selectable}");
    expect(source).toContain("unavailableReason");
  });

  it("handles a missing cover image instead of rendering a broken one", () => {
    const source = pickerSource();

    expect(source).toContain("if (!talent.coverImage?.url)");
  });

  it("renders no legal name, contact detail or account-security field", () => {
    const source = pickerCode();

    for (const forbidden of [
      "legalFirstName",
      "legalSurname",
      "cellphoneNumber",
      "whatsAppNumber",
      "hasActiveLogin",
      "hasPendingInvitation",
      "invitation",
      "dateOfBirth",
    ]) {
      expect(source, `${forbidden} must not reach a booking picker`).not.toContain(forbidden);
    }
  });

  it("submits only the selected talentProfileId", () => {
    const source = pickerSource();
    expect(source).toContain("onChange(talent.talentProfileId, talent)");
  });
});

describe("no raw talent GUID inputs remain in normal operation", () => {
  it("keeps the picker free of a manual profile-id field", () => {
    const source = pickerSource();

    // The picker exists precisely so nobody pastes a GUID: mistyping one digit
    // silently reassigns an appointment to a different human being.
    expect(source).not.toMatch(/placeholder=["'][^"']*[Gg][Uu][Ii][Dd]/);
    expect(source).not.toMatch(/placeholder=["'][^"']*profile id/i);
  });
});
