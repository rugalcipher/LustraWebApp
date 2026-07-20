import { describe, it, expect } from "vitest";
import { toTalentImage, talentFromListItem, talentFromDetail } from "@/domain/talent";
import type { TalentListItemDto, PublicTalentDetailDto } from "@/services/discoveryService";

function image(overrides: Record<string, unknown> = {}) {
  return {
    url: "/api/v1/media/abc?token=xyz",
    srcSet: null,
    width: 1200,
    height: 1600,
    aspectRatio: 0.75,
    ...overrides,
  };
}

describe("image mapping", () => {
  it("carries the intrinsic dimensions through", () => {
    // These are the whole point: without them every card renders at an unknown size and
    // the page reflows as images arrive.
    const mapped = toTalentImage(image());
    expect(mapped?.width).toBe(1200);
    expect(mapped?.height).toBe(1600);
    expect(mapped?.aspectRatio).toBeCloseTo(0.75);
  });

  it("returns null for a missing image rather than an empty url", () => {
    // A caller renders its own placeholder; an empty src would be a broken <img>.
    expect(toTalentImage(null)).toBeNull();
    expect(toTalentImage(undefined)).toBeNull();
  });

  it("preserves a null srcSet instead of inventing one", () => {
    // Null means the CDN cannot resize. Emitting "" would be an invalid srcset attribute.
    expect(toTalentImage(image({ srcSet: null }))?.srcSet).toBeNull();
  });

  it("passes an absolute srcSet through untouched", () => {
    const srcSet = "https://media.lustra.vip/cdn-cgi/image/width=480/x.jpg 480w";
    expect(toTalentImage(image({ srcSet }))?.srcSet).toBe(srcSet);
  });

  it("tolerates unknown dimensions", () => {
    // The server's reader only parses PNG and JPEG headers.
    const mapped = toTalentImage(image({ width: null, height: null, aspectRatio: null }));
    expect(mapped?.url).toBeTruthy();
    expect(mapped?.aspectRatio).toBeNull();
  });
});

describe("talent view model images", () => {
  function listItem(): TalentListItemDto {
    return {
      id: "profile-1",
      slug: "aria",
      displayName: "Aria",
      headline: null,
      cityName: null,
      regionName: null,
      availabilityStatus: "Available",
      travelAvailable: false,
      eventAvailable: false,
      isVerified: false,
      isFeatured: false,
      averageRating: 0,
      reviewCount: 0,
      startingRate: null,
      startingRateCurrency: null,
      coverImage: image(),
      categories: [],
      isNearby: false,
      isPlaced: false,
    } as TalentListItemDto;
  }

  it("keeps the plain cover URL so existing components render unchanged", () => {
    // The approved design binds to `cover`/`gallery` strings. The richer form is ADDITIVE.
    const talent = talentFromListItem(listItem());
    expect(typeof talent.cover).toBe("string");
    expect(talent.gallery).toHaveLength(1);
  });

  it("also exposes the dimensioned form", () => {
    const talent = talentFromListItem(listItem());
    expect(talent.coverImage?.width).toBe(1200);
    expect(talent.galleryImages).toHaveLength(1);
  });

  it("survives a talent with no cover", () => {
    const talent = talentFromListItem({ ...listItem(), coverImage: null });
    expect(talent.cover).toBeNull();
    expect(talent.coverImage).toBeNull();
    expect(talent.gallery).toEqual([]);
    expect(talent.galleryImages).toEqual([]);
  });

  it("orders the gallery with the cover first and keeps both forms aligned", () => {
    const detail = {
      id: "p1",
      slug: "aria",
      displayName: "Aria",
      headline: null,
      shortBiography: "",
      fullBiography: "",
      cityName: null,
      regionName: null,
      availabilityStatus: "Available",
      travelAvailable: false,
      eventAvailable: false,
      isVerified: false,
      isFeatured: false,
      age: null,
      averageRating: 0,
      reviewCount: 0,
      categories: [],
      engagementCategories: [],
      languages: [],
      skills: [],
      interests: [],
      personalityTags: [],
      media: [
        { image: image({ url: "/api/v1/media/2" }), caption: null, mediaType: "Image", isCover: false },
        { image: image({ url: "/api/v1/media/1" }), caption: null, mediaType: "Image", isCover: true },
      ],
      startingRate: null,
      startingRateCurrency: null,
      rates: [],
      ratesDisclaimer: "",
    } as unknown as PublicTalentDetailDto;

    const talent = talentFromDetail(detail);

    // The cover leads, and the string list and dimensioned list must not drift apart —
    // a mismatch would pair a photo with another photo's aspect box.
    expect(talent.gallery).toHaveLength(2);
    expect(talent.galleryImages).toHaveLength(2);
    expect(talent.gallery[0]).toContain("/media/1");
    expect(talent.galleryImages[0].url).toContain("/media/1");
    expect(talent.gallery).toEqual(talent.galleryImages.map((i) => i.url));
    expect(talent.coverImage?.url).toBe(talent.cover);
  });
});
