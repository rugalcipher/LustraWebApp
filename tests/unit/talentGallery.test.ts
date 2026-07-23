import { describe, it, expect } from "vitest";
import { talentFromDetail } from "@/domain/talent";
import type { PublicTalentDetailDto, PublicMediaDto } from "@/services/discoveryService";

/**
 * The public gallery on a talent profile.
 *
 * The UAT defect this pins down: a talent with seven approved public images rendered seven
 * slots, every one showing the same picture. The cause was upstream — the immersive story was
 * fed search-card data, which carries only the cover, so every slide fell back to it. These
 * tests lock the mapper's half of the contract: each media item keeps its OWN id and its OWN
 * url, the cover leads, and identity — not URL or filename — decides what is a duplicate.
 */

function detail(media: PublicMediaDto[]): PublicTalentDetailDto {
  return {
    id: "slug",
    slug: "slug",
    displayName: "Isabelle",
    headline: null,
    shortBiography: "",
    fullBiography: "",
    cityName: "Cape Town",
    regionName: "",
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
    media,
    startingRate: null,
    startingRateCurrency: null,
    rates: [],
    ratesDisclaimer: "",
  } satisfies PublicTalentDetailDto;
}

const img = (n: number) => ({
  url: `/api/v1/media/${n}`,
  srcSet: null,
  width: 800,
  height: 1200,
  aspectRatio: 2 / 3,
});

const media = (id: string, url: number, isCover = false): PublicMediaDto => ({
  id,
  image: img(url),
  caption: null,
  mediaType: "Image",
  isCover,
});

describe("public gallery mapping", () => {
  it("renders seven distinct media as seven distinct images", () => {
    const talent = talentFromDetail(
      detail([
        media("m1", 1, true),
        media("m2", 2),
        media("m3", 3),
        media("m4", 4),
        media("m5", 5),
        media("m6", 6),
        media("m7", 7),
      ])
    );

    expect(talent.gallery).toHaveLength(7);
    expect(new Set(talent.gallery).size).toBe(7);
    expect(talent.galleryImages).toHaveLength(7);
    expect(new Set(talent.galleryImages.map((g) => g.id)).size).toBe(7);
  });

  it("puts the cover first even when the backend lists it later", () => {
    const talent = talentFromDetail(
      detail([media("m2", 2), media("m3", 3), media("m1", 1, true)])
    );

    expect(talent.gallery[0]).toContain("/api/v1/media/1");
    expect(talent.galleryImages[0].id).toBe("m1");
  });

  it("deduplicates by media id, not by URL", () => {
    // The same photograph appearing twice is one photograph.
    const talent = talentFromDetail(
      detail([media("m1", 1, true), media("m1", 1), media("m2", 2)])
    );

    expect(talent.galleryImages.map((g) => g.id)).toEqual(["m1", "m2"]);
  });

  it("keeps different media with identical URLs distinct", () => {
    // Two genuinely different photographs that happen to resolve to the same URL string must
    // NOT collapse — identity is the media id, never the URL or a filename.
    const talent = talentFromDetail(
      detail([media("m1", 1, true), media("m2", 1)])
    );

    expect(talent.galleryImages).toHaveLength(2);
    expect(talent.galleryImages.map((g) => g.id)).toEqual(["m1", "m2"]);
  });

  it("carries a stable media id onto every gallery image for React keys", () => {
    const talent = talentFromDetail(detail([media("m1", 1, true), media("m2", 2)]));
    expect(talent.galleryImages.every((g) => typeof g.id === "string" && g.id.length > 0)).toBe(true);
  });

  it("renders one slide for a one-image talent, not duplicated slots", () => {
    const talent = talentFromDetail(detail([media("m1", 1, true)]));
    expect(talent.gallery).toHaveLength(1);
    expect(talent.galleryImages).toHaveLength(1);
  });

  it("shows an empty gallery as empty rather than inventing the cover seven times", () => {
    const talent = talentFromDetail(detail([]));
    expect(talent.gallery).toHaveLength(0);
    expect(talent.galleryImages).toHaveLength(0);
  });
});

describe("the immersive story consumes the full profile, not the card", () => {
  const read = (p: string) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("node:fs").readFileSync(require("node:path").join(__dirname, "../..", p), "utf8");

  it("feeds the story the fetched profile so slides do not fall back to the cover", () => {
    const source = read("src/components/lustra/immersive/useDiscoverState.js");
    // The card has only the cover; the full profile carries the whole approved gallery.
    expect(source).toContain("useTalentProfile(current?.slug)");
    expect(source).toContain("currentStory");
  });

  it("feeds the media-first gallery the fetched profile's approved images, not the card cover", () => {
    const source = read("src/components/lustra/immersive/ImmersiveTalentDiscovery.jsx");
    expect(source).toContain("currentStory.galleryImages");
  });
});
