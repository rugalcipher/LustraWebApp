import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import PhotographManager from "@/features/talentApplication/PhotographManager";

vi.mock("@/services/talentApplicationService", () => ({
  requestUpload: vi.fn(),
  uploadToStorage: vi.fn(),
  finalizeUpload: vi.fn(),
  deleteMedia: vi.fn(),
  reorderMedia: vi.fn(),
  getApplicationStatus: vi.fn(),
}));

const finalized = [
  { id: "m1", originalFileName: "one.jpg", isUploaded: true, isCover: true, sortOrder: 0, uploadStatus: "PendingReview" },
  { id: "m2", originalFileName: "two.jpg", isUploaded: true, isCover: false, sortOrder: 1, uploadStatus: "PendingReview" },
];

describe("PhotographManager cover selection", () => {
  it("renders a visual grid with a Cover badge and per-image Set-as-cover controls, not just filenames", () => {
    render(
      <PhotographManager
        session={{ applicationId: "a1", token: "t" }}
        media={finalized}
        onMediaChange={() => {}}
        limits={{ min: 1, max: 8 }}
      />
    );

    // A prominent Cover badge on the chosen image (uppercased via CSS; assert the accessible text node).
    expect(screen.getByText(/^Cover$/i)).toBeInTheDocument();
    // Every image exposes a "Set as cover" action, so the applicant can pick the cover visually.
    expect(screen.getByRole("button", { name: /Set one\.jpg as cover/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Set two\.jpg as cover/i })).toBeInTheDocument();
    // Remove actions exist per image.
    expect(screen.getByRole("button", { name: /Remove one\.jpg/i })).toBeInTheDocument();
  });
});
