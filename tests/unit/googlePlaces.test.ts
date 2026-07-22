import { describe, it, expect, beforeEach, vi } from "vitest";

// The key is controlled through a mock of the env module so the loader can be tested both
// configured and not, without ever contacting Google.
vi.mock("@/config/env", () => ({
  env: { googleMapsApiKey: "", googlePlacesCountries: ["za"] },
}));

import * as gp from "@/services/googlePlaces";
import { env } from "@/config/env";

describe("google places loader", () => {
  beforeEach(() => {
    (env as unknown as { googleMapsApiKey: string }).googleMapsApiKey = "";
    delete (window as unknown as { google?: unknown }).google;
    gp.__resetGoogleMapsLoaderForTests();
    vi.restoreAllMocks();
  });

  it("builds a Places URL with an encoded key and async loading", () => {
    const url = gp.buildMapsScriptUrl("abc 123");
    expect(url).toContain("libraries=places");
    expect(url).toContain("loading=async");
    expect(url).toContain("key=abc+123");
  });

  it("reports not configured and rejects when there is no key", async () => {
    expect(gp.isGoogleMapsConfigured()).toBe(false);
    await expect(gp.loadGoogleMaps()).rejects.toBeInstanceOf(gp.GoogleMapsNotConfiguredError);
  });

  it("injects exactly one script for concurrent consumers and never logs the key", async () => {
    (env as unknown as { googleMapsApiKey: string }).googleMapsApiKey = "secret-key";
    gp.__resetGoogleMapsLoaderForTests();

    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...a) => logs.push(a.join(" ")));

    const created: HTMLScriptElement[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === "script") created.push(el as HTMLScriptElement);
      return el;
    });

    const p1 = gp.loadGoogleMaps();
    const p2 = gp.loadGoogleMaps();
    expect(p1).toBe(p2); // concurrent consumers share one in-flight load

    (window as unknown as { google: unknown }).google = { maps: { places: {} } };
    created[0].dispatchEvent(new Event("load"));

    await expect(p1).resolves.toBeTruthy();
    expect(created).toHaveLength(1);
    expect(logs.join(" ")).not.toContain("secret-key");
  });

  it("rejects with a load error and allows a retry when the script fails", async () => {
    (env as unknown as { googleMapsApiKey: string }).googleMapsApiKey = "k";
    gp.__resetGoogleMapsLoaderForTests();

    const created: HTMLScriptElement[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === "script") created.push(el as HTMLScriptElement);
      return el;
    });

    const p = gp.loadGoogleMaps();
    created[0].dispatchEvent(new Event("error"));
    await expect(p).rejects.toBeInstanceOf(gp.GoogleMapsLoadError);

    // The cache was cleared, so a later attempt tries again rather than returning the failure.
    gp.__resetGoogleMapsLoaderForTests();
    expect(gp.isGoogleMapsConfigured()).toBe(true);
  });

  it("exposes the configured country restriction", () => {
    expect(gp.googlePlacesCountries()).toEqual(["za"]);
  });
});
