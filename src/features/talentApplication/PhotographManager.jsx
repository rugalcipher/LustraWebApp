import React, { useRef, useState } from "react";
import { Upload, Star, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import * as applications from "@/services/talentApplicationService";
import {
  uploadFailureMessage, removalFailureMessage, correlationIdOf,
} from "@/features/talentApplication/uploadErrors";

/**
 * The applicant's photograph panel, shared by the first application and by the
 * changes-requested continuation.
 *
 * Both surfaces need the identical three-step upload — request a ticket, PUT the
 * bytes straight to the signed storage URL, then ask the API to finalize — plus
 * reorder, remove and cover selection. Duplicating that would mean two places to
 * get the "never show an upload as complete before the server confirms it" rule
 * wrong, so it lives here once.
 *
 * The bytes never pass through the Lustra API and no Lustra credential is
 * attached to the storage request; see `uploadToStorage`.
 */

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Photographs the server has confirmed.
 *
 * `isUploaded` is the server's own answer: true only when it verified an object in
 * the bucket. Everything else — a reservation still uploading, one whose PUT
 * failed, one whose signed window closed — is a row with nothing behind it and
 * must not count towards the minimum, the maximum, or cover selection.
 *
 * This used to compare `uploadStatus` against `"pending"`, but the server sends
 * `Uploading` and `PendingReview`. Neither ever matched, so nothing was ever
 * filtered and a failed upload was displayed and counted as a photograph the
 * applicant had. That is the "5/8 uploaded" beside a visibly failed row.
 *
 * The status fallback is for a server that predates `isUploaded`; it checks the
 * real enum names rather than an invented one.
 */
export function finalizedPhotos(media) {
  return (media ?? []).filter((m) =>
    typeof m.isUploaded === "boolean"
      ? m.isUploaded
      : (m.uploadStatus ?? "").toLowerCase() === "pendingreview"
  );
}

/**
 * Rows the applicant can see but cannot use: an upload that failed, or a
 * reservation whose signed window closed. Shown so they can be cleared, never
 * counted.
 */
export function unusablePhotos(media) {
  return (media ?? []).filter((m) =>
    typeof m.isUploaded === "boolean" ? !m.isUploaded : false
  );
}

/**
 * @param {{
 *   session: { applicationId: string, token: string },
 *   media: any[],
 *   onMediaChange: (media: any[]) => void,
 *   limits: { min: number, max: number },
 *   onError?: (message: string) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function PhotographManager({
  session,
  media,
  onMediaChange,
  limits,
  onError,
  disabled = false,
}) {
  const [uploads, setUploads] = useState({});
  // Media ids with a DELETE in flight. Guards the button AND the handler: a
  // disabled button can still be activated programmatically, and three
  // simultaneous DELETEs for one id is what the UAT logs showed.
  const [removing, setRemoving] = useState(() => new Set());
  const fileInput = useRef(null);
  const finalized = finalizedPhotos(media);
  const unusable = unusablePhotos(media);
  const report = (error) => onError?.(removalFailureMessage(error));

  async function uploadFiles(fileList) {
    const files = Array.from(fileList ?? []);
    if (!files.length || !session || disabled) return;

    for (const file of files) {
      const clientId = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      if (!IMAGE_TYPES.includes(file.type)) {
        setUploads((u) => ({ ...u, [clientId]: { name: file.name, error: "JPG, PNG or WebP only" } }));
        continue;
      }
      if (file.size > MAX_BYTES) {
        setUploads((u) => ({
          ...u,
          [clientId]: { name: file.name, error: "Each image must be 8MB or smaller" },
        }));
        continue;
      }

      setUploads((u) => ({ ...u, [clientId]: { name: file.name, progress: 0 } }));
      try {
        const ticket = await applications.requestUpload(session.applicationId, session.token, {
          contentType: file.type,
          expectedSizeBytes: file.size,
          fileName: file.name,
        });
        try {
          await applications.uploadToStorage(ticket, file, (fraction) =>
            setUploads((u) => ({ ...u, [clientId]: { ...u[clientId], progress: fraction } }))
          );
        } catch (uploadError) {
          // The bytes never landed, so the reservation is worthless. Release it
          // ONCE — leaving it behind is what made a failed upload reappear after
          // a refresh and consume one of the applicant's slots. Best effort: the
          // upload failure is what they need to read, not a cleanup failure.
          await applications
            .deleteMedia(session.applicationId, session.token, ticket.mediaId)
            .catch(() => {});
          throw uploadError;
        }

        // A photograph exists only once the server confirms the object landed.
        // Unreachable unless the PUT resolved, so a failed upload can never
        // finalize a row that points at nothing.
        const confirmed = await applications.finalizeUpload(
          session.applicationId,
          session.token,
          ticket.mediaId
        );
        onMediaChange([...(media ?? []).filter((m) => m.id !== confirmed.id), confirmed]);
        setUploads((u) => {
          const rest = { ...u };
          delete rest[clientId];
          return rest;
        });
      } catch (error) {
        setUploads((u) => ({
          ...u,
          [clientId]: { name: file.name, error: uploadFailureMessage(error), retryable: true },
        }));
      }
    }
  }

  async function removePhoto(mediaId) {
    // The handler refuses too, not just the button. Repeated clicks on a slow
    // delete produced three concurrent DELETEs for one id.
    if (!session || disabled || removing.has(mediaId)) return;

    setRemoving((current) => new Set(current).add(mediaId));
    try {
      await applications.deleteMedia(session.applicationId, session.token, mediaId);
      onMediaChange((media ?? []).filter((m) => m.id !== mediaId));
    } catch (error) {
      const correlationId = correlationIdOf(error);
      onError?.(
        correlationId
          ? `${removalFailureMessage(error)} (reference ${correlationId})`
          : removalFailureMessage(error)
      );
    } finally {
      setRemoving((current) => {
        const next = new Set(current);
        next.delete(mediaId);
        return next;
      });
    }
  }

  async function persistOrder(next) {
    if (!session || disabled) return;
    onMediaChange(next);
    try {
      const status = await applications.reorderMedia(
        session.applicationId,
        session.token,
        next.map((m, index) => ({ mediaId: m.id, sortOrder: index, isCover: Boolean(m.isCover) }))
      );
      if (status?.media) onMediaChange(status.media);
    } catch (error) {
      report(error);
    }
  }

  const move = (index, delta) => {
    const next = [...finalized];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  };

  const setCover = (mediaId) =>
    persistOrder(finalized.map((m) => ({ ...m, isCover: m.id === mediaId })));

  return (
    <div className="space-y-4">
      <p className="font-body text-body text-soft-ivory/75">
        Add {limits.min}–{limits.max} photographs (JPG, PNG or WebP, up to 8MB each). They are
        stored privately for Management review and are never published automatically.
      </p>

      <div
        onClick={() => !disabled && fileInput.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          uploadFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/15 px-4 py-8 transition ${
          disabled ? "opacity-50" : "cursor-pointer hover:border-rose-gold/40"
        }`}
      >
        <Upload className="w-5 h-5 text-rose-gold/80" strokeWidth={1.3} aria-hidden="true" />
        <p className="font-body text-body text-soft-ivory/80">Drag &amp; drop, or browse</p>
        <p className="font-body text-meta text-muted-grey">
          {finalized.length}/{limits.max} uploaded
        </p>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          multiple
          disabled={disabled}
          className="hidden"
          aria-label="Add photographs"
          onChange={(e) => {
            uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {Object.entries(uploads).map(([id, u]) => (
        <div key={id} className="rounded-sm border border-white/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-body text-body text-soft-ivory/80 truncate">{u.name}</span>
            {u.error ? (
              <span className="font-body text-meta text-error">{u.error}</span>
            ) : (
              <span className="font-body text-meta text-muted-grey tabular-nums">
                {Math.round((u.progress ?? 0) * 100)}%
              </span>
            )}
          </div>
          {!u.error && (
            <div className="mt-2 h-0.5 bg-ivory/10">
              <div
                className="h-full bg-rose-gold origin-left"
                style={{ transform: `scaleX(${u.progress ?? 0})` }}
              />
            </div>
          )}
        </div>
      ))}

      {finalized.length > 0 && (
        <ul className="space-y-2">
          {finalized.map((m, index) => (
            <li key={m.id} className="flex items-center gap-3 rounded-sm border border-white/10 p-2.5">
              <span className="font-body text-meta text-muted-grey tabular-nums w-5">{index + 1}</span>
              <span className="flex-1 min-w-0 font-body text-body text-soft-ivory/85 truncate">
                {m.originalFileName}
              </span>
              <button
                type="button"
                onClick={() => setCover(m.id)}
                aria-label={`Set ${m.originalFileName} as cover`}
                className={m.isCover ? "text-rose-gold" : "text-muted-grey hover:text-rose-gold"}
              >
                <Star className="w-4 h-4" fill={m.isCover ? "currentColor" : "none"} strokeWidth={1.4} />
              </button>
              <button
                type="button"
                onClick={() => move(index, -1)}
                aria-label={`Move ${m.originalFileName} up`}
                className="text-muted-grey hover:text-rose-gold"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                aria-label={`Move ${m.originalFileName} down`}
                className="text-muted-grey hover:text-rose-gold"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removePhoto(m.id)}
                disabled={removing.has(m.id) || disabled}
                aria-label={`Remove ${m.originalFileName}`}
                className="text-muted-grey hover:text-error disabled:opacity-40 disabled:pointer-events-none"
              >
                {removing.has(m.id) ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.4} aria-hidden="true" />
                ) : (
                  <Trash2 className="w-4 h-4" strokeWidth={1.4} aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Rows with nothing behind them: an upload that failed, or a reservation
          whose signed window closed. Shown so they can be cleared, and pointedly
          NOT counted — displaying them as photographs is what made "5/8 uploaded"
          appear beside a visibly failed row. */}
      {unusable.length > 0 && (
        <ul className="space-y-2" aria-label="Photographs that did not upload">
          {unusable.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-sm border border-warning/40 bg-warning/[0.06] p-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" strokeWidth={1.4} aria-hidden="true" />
              <span className="flex-1 min-w-0 font-body text-body text-soft-ivory/85 truncate">
                {m.originalFileName}
              </span>
              <span className="font-body text-meta text-warning whitespace-nowrap">
                {m.isExpired ? "Upload expired" : "Did not finish"}
              </span>
              <button
                type="button"
                onClick={() => removePhoto(m.id)}
                disabled={removing.has(m.id) || disabled}
                aria-label={`Remove ${m.originalFileName}`}
                className="text-muted-grey hover:text-error disabled:opacity-40 disabled:pointer-events-none"
              >
                {removing.has(m.id) ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.4} aria-hidden="true" />
                ) : (
                  <Trash2 className="w-4 h-4" strokeWidth={1.4} aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="font-body text-meta text-muted-grey">
        {finalized.some((m) => m.isCover)
          ? "The starred photograph is your preferred cover."
          : "Star a photograph to set your preferred cover."}
      </p>
    </div>
  );
}
