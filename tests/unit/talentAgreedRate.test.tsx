import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as engagement from "@/services/talentEngagementService";

/**
 * The talent portal "My agreed rate" section.
 *
 * The talent sees their OWN payout and nothing of the commercial picture behind it — never the
 * client rate, the grade, the share percentage or the gross margin. The boundary is a narrow self
 * DTO on the server; this suite proves the service hits the self endpoint, the client type never
 * grew the staff-only fields, and the portal card renders only the payout with the right nudges.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("talent agreed-rate service", () => {
  let calls: { url: string }[] = [];

  afterEach(() => vi.unstubAllGlobals());

  const stub = () => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push({ url: String(url) });
        return new Response(
          JSON.stringify({ isConfigured: true, payoutHourlyMinor: 50_000, currency: "ZAR", updatedAtUtc: null }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      })
    );
  };

  it("reads the caller's own agreed rate from the talent self endpoint", async () => {
    stub();
    const rate = await engagement.getMyAgreedRate();
    const url = new URL(calls[0].url, "https://example.test");
    expect(url.pathname.endsWith("/talent/profile/agreed-rate")).toBe(true);
    // A talent id is never sent — the backend takes the talent from the bearer token.
    expect(url.search.toLowerCase()).not.toContain("talent");
    expect(rate.payoutHourlyMinor).toBe(50_000);
  });
});

describe("talent agreed-rate privacy", () => {
  it("keeps the client rate, grade and margin off the talent self DTO", () => {
    const source = read("src/services/talentEngagementService.ts");
    const dto = source.slice(source.indexOf("interface TalentAgreedRateDto"));
    const block = dto.slice(0, dto.indexOf("}"));
    // Only payout + currency + configured + updated may appear.
    expect(block).toContain("payoutHourlyMinor");
    expect(block).toContain("currency");
    for (const field of ["clientHourlyRate", "clientTotal", "grossMargin", "gradeName", "SharePercent", "grade"]) {
      expect(block).not.toContain(field);
    }
  });

  it("renders only the payout in the portal card, with the appointment nudge", () => {
    const source = read("src/pages/TalentProfileEditor.jsx");
    // The card exists and reads the self hook.
    expect(source).toContain("useMyAgreedRate");
    expect(source).toContain("My agreed rate");
    // It formats the talent's payout (minor units) and nothing else money-wise.
    expect(source).toContain("formatMinor(data.payoutHourlyMinor, data.currency)");
    // The required copy: unconfigured message, "set by Lustra / cannot edit", per-appointment note.
    expect(source).toContain("has not been configured yet");
    expect(source).toMatch(/appear on\s*\n?\s*each appointment/i);
    expect(source).toMatch(/you cannot change it here/i);
    // The card must not surface any staff-only commercial term.
    const card = source.slice(source.indexOf("function MyAgreedRateCard"), source.indexOf("function RateCard"));
    for (const leak of ["clientHourlyRate", "grossMargin", "gradeName", "clientTotal", "SharePercent"]) {
      expect(card).not.toContain(leak);
    }
  });
});
