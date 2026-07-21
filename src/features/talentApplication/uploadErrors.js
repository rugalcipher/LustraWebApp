import { isApiError, toUserMessage } from "@/api/problemDetails";
import { DirectUploadError } from "@/services/directUpload";

/**
 * What to tell an applicant when a photograph will not upload or will not go away.
 *
 * An applicant is anonymous and has no idea what a bucket, a signature or a
 * preflight is. They need to know one thing: whether to try again, and with what.
 * So each message says what to DO. Nothing here leaks a storage error code, a
 * bucket name or a URL — the sanitized detail lives in the server logs, reachable
 * by the correlation id, which is where someone who can act on it will look.
 */

/** Backend codes this workflow can actually produce. */
export const UPLOAD_ERROR_CODES = {
  storageUnavailable: "talent_application.media_storage_unavailable",
  uploadNotFound: "talent_application.upload_not_found",
  mediaInvalidState: "talent_application.media_invalid_state",
  tooMany: "talent_application.too_many_photographs",
  notEditable: "talent_application.not_editable",
  tokenInvalid: "talent_application.token_invalid",
};

const BY_CODE = {
  [UPLOAD_ERROR_CODES.storageUnavailable]:
    "That photograph could not be removed just now. Please try again in a moment.",
  [UPLOAD_ERROR_CODES.uploadNotFound]:
    "The upload did not finish. Select the image and try again.",
  [UPLOAD_ERROR_CODES.mediaInvalidState]:
    "That photograph is no longer waiting to be uploaded. Refresh and try again.",
  [UPLOAD_ERROR_CODES.tooMany]:
    "You have reached the maximum number of photographs. Remove one before adding another.",
  [UPLOAD_ERROR_CODES.notEditable]:
    "This application can no longer be edited.",
  [UPLOAD_ERROR_CODES.tokenInvalid]:
    "This link has expired. Request a new one from the email we sent you.",
};

/**
 * The message for a failed upload.
 *
 * A direct-storage failure is deliberately not reported as "something went
 * wrong": the applicant's file is almost always fine, and telling them to retry
 * is both true and the only useful instruction.
 */
export function uploadFailureMessage(error) {
  if (error instanceof DirectUploadError) {
    // No status at all means the browser blocked the request before it was
    // answered — a storage configuration problem, not a bad file.
    if (error.status === 0) {
      return "The upload could not reach our storage service. Please try again in a moment.";
    }

    if (error.status === 403) {
      return "The upload link expired before the image finished. Select the image and try again.";
    }

    return "That image could not be uploaded. Please try again, or choose a different image.";
  }

  return apiMessage(error, "That image could not be uploaded. Please try again.");
}

/** The message for a failed removal. */
export function removalFailureMessage(error) {
  return apiMessage(
    error,
    "That photograph could not be removed. Please try again in a moment."
  );
}

/**
 * The correlation id the server attached, when it did.
 *
 * Shown alongside a removal failure so an applicant reporting the problem can
 * quote something that ties their report to the exact request in the logs.
 */
export function correlationIdOf(error) {
  return (isApiError(error) && (error.correlationId ?? error.problem?.correlationId)) || null;
}

function apiMessage(error, fallback) {
  if (isApiError(error) && error.code && BY_CODE[error.code]) {
    return BY_CODE[error.code];
  }

  // A code we do not recognise still gets the server's own sentence rather than a
  // generic banner — it is more likely to be useful than anything invented here.
  const fromServer = isApiError(error) ? toUserMessage(error) : null;
  return fromServer || fallback;
}
