import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TalentGallery from "@/features/discovery/TalentGallery";

/**
 * The shared media-first gallery: real per-image slides, horizontal-only navigation
 * (tap/swipe/keys/indicators), and no navigation for a single image.
 */
const THREE = [
  { id: "a", url: "https://x/a.jpg" },
  { id: "b", url: "https://x/b.jpg" },
  { id: "c", url: "https://x/c.jpg" },
];

function activeAlt() {
  return (screen.getByRole("img") as HTMLImageElement).alt;
}

describe("TalentGallery", () => {
  it("renders the cover first and one indicator per real image", () => {
    render(<TalentGallery images={THREE} ariaLabel="Aria photographs" />);
    expect(activeAlt()).toMatch(/1 of 3/);
    expect(screen.getAllByRole("button", { name: /Go to photo/i })).toHaveLength(3);
  });

  it("advances on tap-right and goes back on tap-left, clamped at the ends", () => {
    render(<TalentGallery images={THREE} ariaLabel="Aria photographs" />);
    const next = () => screen.getAllByRole("button", { name: "Next photo" })[0];
    const prev = () => screen.getAllByRole("button", { name: "Previous photo" })[0];

    fireEvent.click(next());
    expect(activeAlt()).toMatch(/2 of 3/);
    fireEvent.click(next());
    expect(activeAlt()).toMatch(/3 of 3/);
    fireEvent.click(next()); // clamp — stays at last
    expect(activeAlt()).toMatch(/3 of 3/);
    fireEvent.click(prev());
    expect(activeAlt()).toMatch(/2 of 3/);
  });

  it("advances on a horizontal swipe past the threshold", () => {
    render(<TalentGallery images={THREE} ariaLabel="Aria photographs" />);
    const region = screen.getByRole("group");
    fireEvent.touchStart(region, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(region, { touches: [{ clientX: 120, clientY: 102 }] });
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 120, clientY: 102 }] });
    expect(activeAlt()).toMatch(/2 of 3/);
  });

  it("moves with the arrow keys", () => {
    render(<TalentGallery images={THREE} ariaLabel="Aria photographs" />);
    const region = screen.getByRole("group");
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(activeAlt()).toMatch(/2 of 3/);
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(activeAlt()).toMatch(/1 of 3/);
  });

  it("hides all navigation for a single image", () => {
    render(<TalentGallery images={[THREE[0]]} ariaLabel="Aria photographs" />);
    expect(screen.queryByRole("button", { name: "Next photo" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Go to photo/i })).toBeNull();
    expect(activeAlt()).toMatch(/1 of 1/);
  });

  it("is controlled when given index + onIndexChange", () => {
    const seen: number[] = [];
    render(
      <TalentGallery images={THREE} index={1} onIndexChange={(i: number) => seen.push(i)} ariaLabel="Aria photographs" />
    );
    expect(activeAlt()).toMatch(/2 of 3/);
    fireEvent.click(screen.getAllByRole("button", { name: "Next photo" })[0]);
    expect(seen).toContain(2);
  });
});
