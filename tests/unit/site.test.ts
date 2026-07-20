import { describe, it, expect } from "vitest";
import { toExperienceSlides } from "@/services/siteService";
import type { HeroSlideDto } from "@/services/siteService";
import { EXPERIENCE_SLIDES } from "@/components/lustra/hero/experienceSlides";
import { queryKeys, USER_SCOPED_NAMESPACES } from "@/api/queryKeys";

function slide(overrides: Partial<HeroSlideDto> = {}): HeroSlideDto {
  return {
    key: "brand",
    label: "The Brand",
    headline: "Desire, Reserved.",
    copy: "A private standard of introductions.",
    mobile: { srcSet: "/home/home-1-mobile-900.webp 900w", fallbackUrl: "/home/home-1-mobile.jpg" },
    wide: { srcSet: "/home/home-1-wide-1672.webp 1672w", fallbackUrl: "/home/home-1-wide.jpg" },
    previewUrl: "/home/home-1-preview.webp",
    focalDesktop: "50% 50%",
    focalMobile: "50% 45%",
    align: "Center",
    ...overrides,
  };
}

describe("hero CMS mapping", () => {
  it("produces the exact shape the shipped hero already renders", () => {
    // The CMS was modelled on the approved design, not the other way round. If these
    // keys drift, adopting the CMS becomes a hero rewrite instead of a data swap.
    const [mapped] = toExperienceSlides([slide()]);
    const [shipped] = EXPERIENCE_SLIDES;

    expect(Object.keys(mapped).sort()).toEqual(Object.keys(shipped).sort());
  });

  it("carries both art directions through", () => {
    // The hero serves portrait below 768px and landscape above it. Losing either would
    // leave half of all visitors without an image.
    const [mapped] = toExperienceSlides([slide()]);
    expect(mapped.mobile.srcSet).toContain("mobile");
    expect(mapped.mobile.fallback).toContain(".jpg");
    expect(mapped.wide.srcSet).toContain("wide");
    expect(mapped.wide.fallback).toContain(".jpg");
  });

  it("lowercases alignment to the union the hero expects", () => {
    expect(toExperienceSlides([slide({ align: "Left" })])[0].align).toBe("left");
    expect(toExperienceSlides([slide({ align: "Right" })])[0].align).toBe("right");
    expect(toExperienceSlides([slide({ align: "Center" })])[0].align).toBe("center");
  });

  it("falls back to centre for an unrecognised alignment", () => {
    // Emitting an unknown value would produce invalid CSS rather than a visible error.
    expect(toExperienceSlides([slide({ align: "diagonal" })])[0].align).toBe("center");
  });

  it("defaults blank focal points instead of emitting invalid CSS", () => {
    const [mapped] = toExperienceSlides([slide({ focalDesktop: "", focalMobile: "" })]);
    expect(mapped.focalDesktop).toBe("50% 50%");
    expect(mapped.focalMobile).toBe("50% 50%");
  });

  it("returns empty for an empty CMS rather than a fabricated slide", () => {
    // The caller falls back to the shipped slides, so an empty or unreachable CMS
    // degrades to the approved design — never to a blank hero.
    expect(toExperienceSlides([])).toEqual([]);
    expect(toExperienceSlides(null)).toEqual([]);
    expect(toExperienceSlides(undefined)).toEqual([]);
  });

  it("uses the slide key as the id, so analytics stays stable across reorders", () => {
    expect(toExperienceSlides([slide({ key: "concierge" })])[0].id).toBe("concierge");
  });
});

describe("site cache scoping", () => {
  it("keeps public site content OUT of the user-scoped namespaces", () => {
    // The landing page is identical for every visitor; dropping it on sign-out would
    // refetch it needlessly.
    expect(queryKeys.cms.home()[0]).toBe("cms");
    expect(USER_SCOPED_NAMESPACES).not.toContain("cms");
  });

  it("separates the home payload from the announcements list", () => {
    expect(JSON.stringify(queryKeys.cms.home()))
      .not.toBe(JSON.stringify(queryKeys.cms.announcements()));
  });
});
