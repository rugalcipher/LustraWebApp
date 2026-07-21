import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as applications from "@/services/talentApplicationService";
import PhotographManager, {
  finalizedPhotos, unusablePhotos,
} from "@/features/talentApplication/PhotographManager";
import {
  uploadFailureMessage, removalFailureMessage, UPLOAD_ERROR_CODES,
} from "@/features/talentApplication/uploadErrors";
import { DirectUploadError } from "@/services/directUpload";
import { ApiError } from "@/api/problemDetails";

/**
 * Recovering from a failed photograph upload.
 *
 * The UAT symptoms this pins down: a failed upload stayed in the list after a
 * refresh, could not be removed, counted towards "5/8 uploaded", and produced
 * repeated DELETE calls when the applicant tried. Each is a separate defect and
 * each gets its own test.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const session = { applicationId: "app-1", token: "tok-1" };
const limits = { min: 3, max: 8 };

const photo = (over: Record<string, unknown> = {}) => ({
  id: "m-1",
  originalFileName: "photo.png",
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
  ...over,
});

function file(name = "a.png", type = "image/png") {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

afterEach(() => vi.restoreAllMocks());

// ---- the count -------------------------------------------------------------------

describe("what counts as an uploaded photograph", () => {
  it("counts only what the server verified", () => {
    const media = [
      photo({ id: "a", isUploaded: true }),
      photo({ id: "b", isUploaded: false, uploadStatus: "Uploading" }),
      photo({ id: "c", isUploaded: true }),
    ];

    expect(finalizedPhotos(media).map((m: { id: string }) => m.id)).toEqual(["a", "c"]);
  });

  it("excludes an expired reservation", () => {
    const media = [photo({ id: "a" }), photo({ id: "b", isUploaded: false, isExpired: true })];

    expect(finalizedPhotos(media).map((m: { id: string }) => m.id)).toEqual(["a"]);
    expect(unusablePhotos(media).map((m: { id: string }) => m.id)).toEqual(["b"]);
  });

  it("uses the real enum name when an older server sends no isUploaded", () => {
    // The previous filter compared against "pending". The server sends
    // "Uploading" and "PendingReview", so it never matched and nothing was ever
    // excluded — which is precisely how a failed upload got counted.
    const media = [
      { id: "a", uploadStatus: "PendingReview" },
      { id: "b", uploadStatus: "Uploading" },
    ];

    expect(finalizedPhotos(media).map((m: { id: string }) => m.id)).toEqual(["a"]);
  });

  it("never treats the invented status the old filter looked for as meaningful", () => {
    const source = read("src/features/talentApplication/PhotographManager.jsx");
    expect(source).not.toMatch(/toLowerCase\(\)\s*!==\s*"pending"/);
  });
});

// ---- a failed PUT ----------------------------------------------------------------

describe("a failed upload releases its slot", () => {
  beforeEach(() => {
    vi.spyOn(applications, "requestUpload").mockResolvedValue({
      mediaId: "m-new",
      uploadUrl: "https://r2.test/put",
      httpMethod: "PUT",
      storageKey: "k",
      contentType: "image/png",
      requiredHeaders: { "Content-Type": "image/png" },
      expiresAtUtc: "2099-01-01T00:00:00Z",
    } as never);
  });

  it("cancels the reservation exactly once and never finalizes", async () => {
    vi.spyOn(applications, "uploadToStorage").mockRejectedValue(
      new DirectUploadError("Upload failed (400)", 400)
    );
    const del = vi.spyOn(applications, "deleteMedia").mockResolvedValue(undefined as never);
    const finalize = vi.spyOn(applications, "finalizeUpload");

    render(
      <PhotographManager session={session} media={[]} onMediaChange={() => {}} limits={limits} />
    );

    await userEvent.upload(screen.getByLabelText("Add photographs"), file());

    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(del).toHaveBeenCalledWith("app-1", "tok-1", "m-new");
    // Finalizing an upload whose bytes never landed creates a row pointing at nothing.
    expect(finalize).not.toHaveBeenCalled();
  });

  it("still reports the upload failure when the cleanup also fails", async () => {
    vi.spyOn(applications, "uploadToStorage").mockRejectedValue(
      new DirectUploadError("blocked", 0)
    );
    vi.spyOn(applications, "deleteMedia").mockRejectedValue(new Error("cleanup failed"));

    render(
      <PhotographManager session={session} media={[]} onMediaChange={() => {}} limits={limits} />
    );

    await userEvent.upload(screen.getByLabelText("Add photographs"), file());

    // The upload failure is what the applicant can act on. A cleanup failure is ours.
    await waitFor(() =>
      expect(screen.getByText(/could not reach our storage service/i)).toBeInTheDocument()
    );
  });

  it("finalizes when the upload succeeds", async () => {
    vi.spyOn(applications, "uploadToStorage").mockResolvedValue(undefined as never);
    const finalize = vi
      .spyOn(applications, "finalizeUpload")
      .mockResolvedValue(photo({ id: "m-new" }) as never);
    const del = vi.spyOn(applications, "deleteMedia");

    render(
      <PhotographManager session={session} media={[]} onMediaChange={() => {}} limits={limits} />
    );

    await userEvent.upload(screen.getByLabelText("Add photographs"), file());

    await waitFor(() => expect(finalize).toHaveBeenCalledTimes(1));
    expect(del).not.toHaveBeenCalled();
  });
});

// ---- removal -----------------------------------------------------------------------

describe("removing a photograph", () => {
  it("issues exactly one DELETE however many times the button is pressed", async () => {
    // Three concurrent DELETEs for one id is what the UAT logs showed.
    let release: (() => void) | undefined;
    const del = vi.spyOn(applications, "deleteMedia").mockImplementation(
      () => new Promise<void>((resolve) => (release = () => resolve()))
    );

    render(
      <PhotographManager
        session={session}
        media={[photo({ id: "m-1" })]}
        onMediaChange={() => {}}
        limits={limits}
      />
    );

    const button = screen.getByLabelText("Remove photo.png");
    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);

    expect(del).toHaveBeenCalledTimes(1);
    release?.();
  });

  it("disables the button while the delete is in flight", async () => {
    vi.spyOn(applications, "deleteMedia").mockImplementation(() => new Promise<void>(() => {}));

    render(
      <PhotographManager
        session={session}
        media={[photo({ id: "m-1" })]}
        onMediaChange={() => {}}
        limits={limits}
      />
    );

    await userEvent.click(screen.getByLabelText("Remove photo.png"));
    await waitFor(() => expect(screen.getByLabelText("Remove photo.png")).toBeDisabled());
  });

  it("offers a way to clear a failed row, and does not count it", () => {
    render(
      <PhotographManager
        session={session}
        media={[photo({ id: "m-1" }), photo({ id: "m-2", isUploaded: false, isExpired: true })]}
        onMediaChange={() => {}}
        limits={limits}
      />
    );

    expect(screen.getByText("1/8 uploaded")).toBeInTheDocument();
    expect(screen.getByText(/upload expired/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText("Remove photo.png").length).toBe(2);
  });

  it("quotes the correlation id when removal fails", async () => {
    const errors: string[] = [];
    vi.spyOn(applications, "deleteMedia").mockRejectedValue(
      new ApiError({
        status: 503,
        kind: "server",
        code: UPLOAD_ERROR_CODES.storageUnavailable,
        detail: "unavailable",
        correlationId: "corr-123",
      } as never)
    );

    render(
      <PhotographManager
        session={session}
        media={[photo({ id: "m-1" })]}
        onMediaChange={() => {}}
        limits={limits}
        onError={(m: string) => errors.push(m)}
      />
    );

    await userEvent.click(screen.getByLabelText("Remove photo.png"));

    await waitFor(() => expect(errors).toHaveLength(1));
    expect(errors[0]).toMatch(/corr-123/);
    expect(errors[0]).toMatch(/try again/i);
  });

  it("re-enables the button after a failure so the applicant can retry", async () => {
    vi.spyOn(applications, "deleteMedia").mockRejectedValue(new Error("nope"));

    render(
      <PhotographManager
        session={session}
        media={[photo({ id: "m-1" })]}
        onMediaChange={() => {}}
        limits={limits}
        onError={() => {}}
      />
    );

    await userEvent.click(screen.getByLabelText("Remove photo.png"));
    await waitFor(() => expect(screen.getByLabelText("Remove photo.png")).not.toBeDisabled());
  });
});

// ---- the messages ------------------------------------------------------------------

describe("what the applicant is told", () => {
  it("names storage, not the file, when the request never got an answer", () => {
    expect(uploadFailureMessage(new DirectUploadError("blocked", 0)))
      .toMatch(/could not reach our storage service/i);
  });

  it("tells them to retry the file when the link expired", () => {
    expect(uploadFailureMessage(new DirectUploadError("forbidden", 403)))
      .toMatch(/expired.*select the image and try again/i);
  });

  it("maps the storage-unavailable refusal to a retryable sentence", () => {
    const error = new ApiError({
      status: 503, kind: "server", code: UPLOAD_ERROR_CODES.storageUnavailable, detail: "x",
    } as never);

    expect(removalFailureMessage(error)).toMatch(/try again in a moment/i);
  });

  it("exposes no storage internals to an anonymous applicant", () => {
    const messages = [
      uploadFailureMessage(new DirectUploadError("x", 0)),
      uploadFailureMessage(new DirectUploadError("x", 403)),
      uploadFailureMessage(new DirectUploadError("x", 400)),
      removalFailureMessage(new Error("boom")),
    ];

    for (const message of messages) {
      for (const leak of ["r2", "bucket", "signature", "X-Amz", "cloudflare", "SignatureDoesNotMatch"]) {
        expect(message.toLowerCase()).not.toContain(leak.toLowerCase());
      }
    }
  });
});

// ---- the token goes to the API and nowhere else ---------------------------------------

describe("the application token", () => {
  it("is sent to the API for cleanup", async () => {
    vi.spyOn(applications, "requestUpload").mockResolvedValue({
      mediaId: "m-new", uploadUrl: "https://r2.test/put", httpMethod: "PUT",
      storageKey: "k", contentType: "image/png",
      requiredHeaders: { "Content-Type": "image/png" }, expiresAtUtc: "2099-01-01T00:00:00Z",
    } as never);
    vi.spyOn(applications, "uploadToStorage").mockRejectedValue(new DirectUploadError("x", 400));
    const del = vi.spyOn(applications, "deleteMedia").mockResolvedValue(undefined as never);

    render(
      <PhotographManager session={session} media={[]} onMediaChange={() => {}} limits={limits} />
    );
    await userEvent.upload(screen.getByLabelText("Add photographs"), file());

    await waitFor(() => expect(del).toHaveBeenCalledWith("app-1", "tok-1", "m-new"));
  });

  it("is never attached to the storage request", () => {
    // Comments stripped: the helper's own documentation names these headers in
    // order to forbid them, and matching that would fail on a correct file.
    const helper = read("src/services/directUpload.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    expect(helper).not.toContain("X-Application-Token");
    expect(helper).not.toContain("Authorization");
    expect(helper).toContain("withCredentials = false");
  });
});
