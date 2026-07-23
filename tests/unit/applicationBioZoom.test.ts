import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { EMPTY_DETAILS, validateProfile, toDetails } from "@/features/talentApplication/details";

/**
 * Talent-application UX corrections: the short biography is optional, and every interactive text
 * control uses a 16px font so iOS Safari does not auto-zoom on focus.
 */

describe("optional short biography", () => {
  it("accepts an empty short biography", () => {
    const form = { ...EMPTY_DETAILS, requestedDisplayName: "Aria", shortBiography: "" };
    expect(validateProfile(form).shortBiography).toBeUndefined();
    // Submitted as null, not an empty string.
    expect(toDetails(form).shortBiography).toBeNull();
  });

  it("still nudges a too-short non-empty biography, without blocking a blank one", () => {
    expect(validateProfile({ ...EMPTY_DETAILS, requestedDisplayName: "Aria", shortBiography: "hi" }).shortBiography)
      .toBeTruthy();
    expect(validateProfile({ ...EMPTY_DETAILS, requestedDisplayName: "Aria", shortBiography: "" }).shortBiography)
      .toBeUndefined();
  });
});

describe("iOS no-zoom (16px inputs)", () => {
  const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), "utf8");

  it("uses text-base (16px), not the sub-16px text-body, on application and address inputs", () => {
    const files = [
      "src/pages/TalentApplication.jsx",
      "src/pages/ApplicationContinue.jsx",
      "src/components/address/AddressAutocomplete.jsx",
      "src/components/address/AddressFields.jsx",
    ];
    for (const file of files) {
      const src = read(file);
      // The input class strings must not use the fluid text-body (floors ~13px).
      const inputLines = src.split("\n").filter((l) => /className|inputCls|inputClass/.test(l) && /border|px-3|pl-10/.test(l));
      for (const line of inputLines) {
        expect(line, `${file}: interactive input must not use text-body`).not.toContain("text-body");
      }
    }
  });
});
