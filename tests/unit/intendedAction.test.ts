import { describe, it, expect, beforeEach } from "vitest";
import {
  rememberIntendedAction,
  peekIntendedAction,
  consumeIntendedAction,
  clearIntendedAction,
  routeForIntendedAction,
  INTENT_TTL_MS,
} from "@/features/auth/intendedAction";

const NOW = 1_800_000_000_000;

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("guest intended action", () => {
  it("preserves the talent and the exact story position through sign-in", () => {
    rememberIntendedAction(
      {
        type: "inquire",
        talentSlug: "isabelle",
        returnTo: "/app/discover",
        talentIndex: 4,
        slideIndex: 3,
      },
      NOW
    );

    const restored = peekIntendedAction(NOW + 1000);
    expect(restored).not.toBeNull();
    expect(restored!.talentSlug).toBe("isabelle");
    expect(restored!.talentIndex).toBe(4);
    expect(restored!.slideIndex).toBe(3);
    expect(restored!.returnTo).toBe("/app/discover");
  });

  it("is consumed exactly once, so a refresh cannot replay the action", () => {
    rememberIntendedAction({ type: "save", talentSlug: "camille", returnTo: "/talent/camille" }, NOW);

    expect(consumeIntendedAction(NOW)).not.toBeNull();
    // A second read — e.g. after a page refresh — must find nothing.
    expect(consumeIntendedAction(NOW)).toBeNull();
    expect(peekIntendedAction(NOW)).toBeNull();
  });

  it("expires a stale intent rather than replaying it later", () => {
    rememberIntendedAction({ type: "inquire", talentSlug: "sofia", returnTo: "/app/discover" }, NOW);

    expect(peekIntendedAction(NOW + INTENT_TTL_MS - 1)).not.toBeNull();
    expect(peekIntendedAction(NOW + INTENT_TTL_MS + 1)).toBeNull();
    // The expired entry is purged, not left lying around.
    expect(window.sessionStorage.getItem("lustra.intendedAction")).toBeNull();
  });

  it("discards an intent written by an older app version", () => {
    window.sessionStorage.setItem(
      "lustra.intendedAction",
      JSON.stringify({ v: 0, type: "inquire", talentSlug: "x", returnTo: "/", createdAtMs: NOW })
    );
    expect(peekIntendedAction(NOW)).toBeNull();
  });

  it("rejects a tampered intent instead of half-restoring it", () => {
    window.sessionStorage.setItem("lustra.intendedAction", "{not json");
    expect(peekIntendedAction(NOW)).toBeNull();

    window.sessionStorage.setItem(
      "lustra.intendedAction",
      JSON.stringify({ v: 1, type: "transfer-funds", talentSlug: "x", returnTo: "/", createdAtMs: NOW })
    );
    expect(peekIntendedAction(NOW)).toBeNull();
  });

  it("refuses an absolute returnTo, which would be an open redirect", () => {
    rememberIntendedAction(
      { type: "inquire", talentSlug: "isabelle", returnTo: "https://evil.example/steal" },
      NOW
    );
    expect(peekIntendedAction(NOW)).toBeNull();

    rememberIntendedAction(
      { type: "inquire", talentSlug: "isabelle", returnTo: "//evil.example/steal" },
      NOW
    );
    expect(peekIntendedAction(NOW)).toBeNull();
  });

  it("carries no identity, role or permission", () => {
    rememberIntendedAction({ type: "save", talentSlug: "isabelle", returnTo: "/talent/isabelle" }, NOW);
    const raw = window.sessionStorage.getItem("lustra.intendedAction")!;
    expect(raw).not.toMatch(/userId|role|permission|token/i);
  });

  it("never parks personal inquiry content", () => {
    // Extra fields are not part of the schema and must be stripped, even if a caller
    // (or a future refactor) tries to smuggle them through.
    const withExtras = {
      type: "inquire" as const,
      talentSlug: "isabelle",
      returnTo: "/app/discover",
      message: "private note",
    };
    rememberIntendedAction(withExtras, NOW);
    const raw = window.sessionStorage.getItem("lustra.intendedAction")!;
    expect(raw).not.toContain("private note");
    expect(raw).not.toContain("message");
  });

  it("routes an inquire intent to the form and other intents back in place", () => {
    const inquire = {
      v: 1 as const,
      type: "inquire" as const,
      talentSlug: "a b",
      returnTo: "/app/discover",
      createdAtMs: NOW,
    };
    const save = {
      v: 1 as const,
      type: "save" as const,
      talentSlug: "camille",
      returnTo: "/talent/camille",
      createdAtMs: NOW,
    };

    expect(routeForIntendedAction(inquire)).toBe("/app/inquire/a%20b");
    expect(routeForIntendedAction(save)).toBe("/talent/camille");
  });

  it("is cleared explicitly, e.g. on logout", () => {
    rememberIntendedAction({ type: "save", talentSlug: "x", returnTo: "/" }, NOW);
    clearIntendedAction();
    expect(peekIntendedAction(NOW)).toBeNull();
  });
});
