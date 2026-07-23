import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import TalentActionBar from "@/components/lustra/immersive/TalentActionBar";

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), "utf8");

/**
 * Immersive discovery is media-first: real-image slides, no manufactured info slides, no vertical
 * arrows, a name/age/location overlay, and bottom controls of Previous / View profile / Message /
 * Next (no bottom save).
 */
describe("immersive media-first structure", () => {
  const source = read("src/components/lustra/immersive/ImmersiveTalentDiscovery.jsx");
  const stateSource = read("src/components/lustra/immersive/useDiscoverState.js");

  it("drives slides from the real approved image count, not a fixed seven", () => {
    expect(stateSource).not.toContain("TOTAL_SLIDES = 7");
    expect(stateSource).toContain("galleryImages?.length");
    expect(stateSource).toContain("totalSlides: imageCount");
  });

  it("renders a media gallery of the fetched profile, not manufactured story slides", () => {
    expect(source).toContain("TalentGallery");
    expect(source).toContain("currentStory.galleryImages");
    expect(source).not.toContain("TalentStory");
    expect(source).not.toContain("TalentAboutSlide");
  });

  it("has no vertical slide arrows", () => {
    expect(source).not.toContain("ChevronUp");
    expect(source).not.toContain("ChevronDown");
    expect(source).not.toContain("Previous slide");
  });

  it("keeps a name/age/location overlay and a View-profile action, not a bottom heart", () => {
    expect(source).toContain("handleViewProfile");
    expect(source).toContain("MapPin");
    // The old story components are gone.
    const removed = ["TalentSummarySlide.jsx", "TalentStory.jsx", "TalentNavigationControls.jsx"];
    for (const f of removed) {
      let existed = true;
      try { read(`src/components/lustra/immersive/${f}`); } catch { existed = false; }
      expect(existed, `${f} should be removed`).toBe(false);
    }
  });

  it("arrow keys change the image (goPrevSlide/goNextSlide), never the talent", () => {
    expect(source).toContain("goPrevSlide()");
    expect(source).toContain("goNextSlide()");
    // The old ArrowLeft→talent / ArrowUp→slide mappings are gone.
    expect(source).not.toContain("goPrevTalent();\n      else if");
  });
});

describe("TalentActionBar", () => {
  it("shows Previous talent, View full profile, Message and Next talent — and no save/heart", () => {
    render(
      <TalentActionBar
        onViewProfile={vi.fn()} onMessage={vi.fn()} onPrev={vi.fn()} onNext={vi.fn()} hasPrev hasNext
      />
    );
    expect(screen.getByRole("button", { name: /Previous talent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View full profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Message/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next talent/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save|remove from saved/i })).toBeNull();
  });

  it("fires View full profile", async () => {
    const onViewProfile = vi.fn();
    render(<TalentActionBar onViewProfile={onViewProfile} onMessage={vi.fn()} onPrev={vi.fn()} onNext={vi.fn()} hasPrev hasNext />);
    screen.getByRole("button", { name: /View full profile/i }).click();
    expect(onViewProfile).toHaveBeenCalled();
  });
});
