import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as applications from "@/services/talentApplicationService";
import PhotographManager from "@/features/talentApplication/PhotographManager";

/**
 * Uploading several photographs at once.
 *
 * The UAT defect: selecting four images uploaded all four to the server, but the
 * UI showed only one. Each completing upload merged into the `media` captured
 * when the batch STARTED — a stale snapshot — so every completion discarded the
 * others and the last write won. One at a time worked because there was nothing
 * to overwrite.
 *
 * These tests drive the real component with a parent that owns media the way the
 * application pages do, and force completions to resolve in different orders.
 */

const session = { applicationId: "app-1", token: "tok-1" };
const limits = { min: 3, max: 8 };

function media(id: string) {
  return {
    id,
    originalFileName: `${id}.png`,
    mimeType: "image/png",
    sizeBytes: 1024,
    width: 800,
    height: 600,
    sortOrder: 0,
    isCover: false,
    uploadStatus: "PendingReview",
    isUploaded: true,
    isExpired: false,
    uploadExpiresAtUtc: null,
    createdAtUtc: "2026-01-01T00:00:00Z",
  };
}

/** A parent that owns media through useState, exactly as the application pages do. */
function Harness({ initial = [] as ReturnType<typeof media>[] }) {
  const [items, setItems] = useState(initial);
  return (
    <PhotographManager
      session={session}
      media={items}
      onMediaChange={setItems}
      limits={limits}
      onError={() => {}}
    />
  );
}

function pngFile(name: string) {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

/**
 * Wires the four service calls so each file's finalize resolves when its own
 * deferred is released, letting a test choose completion order. requestUpload
 * hands back a mediaId derived from the file name.
 */
function wireUploads() {
  const finalizeGates: Record<string, () => void> = {};

  vi.spyOn(applications, "requestUpload").mockImplementation(
    async (_appId, _token, req: { fileName: string }) =>
      ({
        mediaId: req.fileName.replace(".png", ""),
        uploadUrl: "https://r2.test/put",
        httpMethod: "PUT",
        storageKey: "k",
        contentType: "image/png",
        requiredHeaders: { "Content-Type": "image/png" },
        expiresAtUtc: "2099-01-01T00:00:00Z",
      }) as never
  );

  vi.spyOn(applications, "uploadToStorage").mockResolvedValue(undefined as never);

  vi.spyOn(applications, "finalizeUpload").mockImplementation(
    (_appId, _token, mediaId: string) =>
      new Promise((resolve) => {
        finalizeGates[mediaId] = () => resolve(media(mediaId) as never);
      }) as never
  );

  // The canonical refetch after the batch: returns whatever finalized so far, so
  // the reconcile reflects the true server state.
  const finalizedIds = new Set<string>();
  vi.spyOn(applications, "getApplicationStatus").mockImplementation(
    async () =>
      ({
        media: [...finalizedIds].map(media),
        minimumPhotographs: 3,
        maximumPhotographs: 8,
      }) as never
  );

  return {
    release(mediaId: string) {
      finalizedIds.add(mediaId);
      finalizeGates[mediaId]?.();
    },
  };
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

async function selectFour() {
  const input = screen.getByLabelText("Add photographs");
  await userEvent.upload(input, ["a.png", "b.png", "c.png", "d.png"].map(pngFile));
}

describe("four images uploaded at once", () => {
  it("shows all four when they complete in selection order", async () => {
    const gate = wireUploads();
    render(<Harness />);

    await selectFour();
    for (const id of ["a", "b", "c", "d"]) gate.release(id);

    await waitFor(() => expect(screen.getByText("4/8 uploaded")).toBeInTheDocument());
    // Each uploaded photo is shown as a thumbnail whose alt text is its filename (the panel is a
    // visual grid now, not a list of filenames).
    for (const name of ["a.png", "b.png", "c.png", "d.png"]) {
      expect(screen.getByAltText(name)).toBeInTheDocument();
    }
  });

  it("shows all four when they complete in REVERSE order", async () => {
    // This is the case the stale snapshot broke worst: the last to start finishes
    // first and its merge must not erase the ones still in flight.
    const gate = wireUploads();
    render(<Harness />);

    await selectFour();
    for (const id of ["d", "c", "b", "a"]) gate.release(id);

    await waitFor(() => expect(screen.getByText("4/8 uploaded")).toBeInTheDocument());
  });

  it("shows all four when they complete in a random interleaving", async () => {
    const gate = wireUploads();
    render(<Harness />);

    await selectFour();
    for (const id of ["c", "a", "d", "b"]) gate.release(id);

    await waitFor(() => expect(screen.getByText("4/8 uploaded")).toBeInTheDocument());
  });

  it("keeps the successes when one of the batch fails", async () => {
    const gate = wireUploads();
    // b fails at the storage step; the others finalize.
    vi.spyOn(applications, "uploadToStorage").mockImplementation(async (ticket) => {
      if ((ticket as { mediaId: string }).mediaId === "b") throw new Error("boom");
    });
    vi.spyOn(applications, "deleteMedia").mockResolvedValue(undefined as never);

    render(<Harness />);
    await selectFour();
    for (const id of ["a", "c", "d"]) gate.release(id);

    // Three real photographs remain; the failure did not take them down with it.
    await waitFor(() => expect(screen.getByText("3/8 uploaded")).toBeInTheDocument());
  });

  it("keeps both rows when two selected files share a name", async () => {
    // requestUpload keys media by file name, so give the duplicates distinct ids
    // to prove the ROW identity (not the filename) is what keeps them apart.
    let n = 0;
    vi.spyOn(applications, "requestUpload").mockImplementation(
      async () =>
        ({
          mediaId: `dup-${n++}`,
          uploadUrl: "https://r2.test/put",
          httpMethod: "PUT",
          storageKey: "k",
          contentType: "image/png",
          requiredHeaders: { "Content-Type": "image/png" },
          expiresAtUtc: "2099-01-01T00:00:00Z",
        }) as never
    );
    vi.spyOn(applications, "uploadToStorage").mockResolvedValue(undefined as never);
    vi.spyOn(applications, "finalizeUpload").mockImplementation(
      async (_a, _t, mediaId: string) => media(mediaId) as never
    );
    vi.spyOn(applications, "getApplicationStatus").mockResolvedValue({
      media: [media("dup-0"), media("dup-1")],
      minimumPhotographs: 3,
      maximumPhotographs: 8,
    } as never);

    render(<Harness />);
    const input = screen.getByLabelText("Add photographs");
    await userEvent.upload(input, [pngFile("same.png"), pngFile("same.png")]);

    await waitFor(() => expect(screen.getByText("2/8 uploaded")).toBeInTheDocument());
  });

  it("refetches the canonical media after the batch settles", async () => {
    const gate = wireUploads();
    const refetch = vi.spyOn(applications, "getApplicationStatus");

    render(<Harness />);
    await selectFour();
    for (const id of ["a", "b", "c", "d"]) gate.release(id);

    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it("does not start more uploads than the remaining capacity", async () => {
    const request = vi.spyOn(applications, "requestUpload");
    wireUploads();

    // Seven already finalized: only one slot remains of eight.
    render(<Harness initial={["p1", "p2", "p3", "p4", "p5", "p6", "p7"].map(media)} />);
    await selectFour();

    // Only one upload may be attempted, not four.
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  });
});
