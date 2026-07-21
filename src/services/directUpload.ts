/**
 * The one way bytes reach the object store.
 *
 * A presigned PUT is signed over `content-type;host`. That single fact drives
 * every rule below:
 *
 *  - **The URL is used byte for byte.** Appending, reordering or re-encoding a
 *    query parameter invalidates the signature.
 *  - **The signed content type is sent, not `file.type`.** The browser's guess
 *    and the value the server signed are not reliably the same string, and a
 *    mismatch fails the signature — which the browser then reports as a CORS
 *    error, two layers from the cause.
 *  - **No other header.** Every header a client adds is a header the bucket's
 *    CORS policy must also list; adding one here breaks uploads in a way that is
 *    invisible from the frontend and looks like a Cloudflare misconfiguration.
 *  - **No Lustra credential.** Not `Authorization`, not `X-Application-Token`,
 *    not a cookie. The object store has no business seeing any of them, and
 *    `Authorization` in particular collides with the signature.
 *  - **Never the API client.** `api` attaches auth, tracing and idempotency
 *    headers and retries on 401. All three are wrong here.
 *
 * This exists as one helper because the rules are invisible at the call site: a
 * second upload path written from scratch would look correct and fail in UAT.
 */

/** The subset of the server's upload ticket a direct PUT needs. */
export interface DirectUploadTicket {
  uploadUrl: string;
  httpMethod?: string;
  /** The exact content type the URL was signed with. */
  contentType: string;
  /**
   * Every header the PUT must carry, from the server. Optional so an older
   * response still works; `contentType` is the fallback.
   */
  requiredHeaders?: Record<string, string> | null;
}

/**
 * The headers to send, taken from the server's instruction where it gave one.
 *
 * Exported for tests: the assertion that matters is that this is exactly one
 * header, and that it is the signed value rather than the file's own type.
 */
export function uploadHeaders(ticket: DirectUploadTicket): Record<string, string> {
  const required = ticket.requiredHeaders;
  if (required && Object.keys(required).length > 0) {
    return { ...required };
  }
  return { "Content-Type": ticket.contentType };
}

/** Raised when the object store rejects the upload, carrying its status. */
export class DirectUploadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DirectUploadError";
    this.status = status;
  }
}

/**
 * PUTs a file straight to the object store.
 *
 * Uses `XMLHttpRequest` rather than `fetch` for one reason: upload progress.
 * `fetch` cannot report it, and a multi-megabyte photograph uploading with no
 * feedback reads as a frozen page. `withCredentials` stays false, which is the
 * XHR equivalent of `credentials: "omit"` — no cookie is attached.
 *
 * Resolves only on a 2xx. The caller must not finalize otherwise: finalizing an
 * upload whose bytes never landed creates a media row pointing at nothing.
 */
export function putToStorage(
  ticket: DirectUploadTicket,
  file: File | Blob,
  onProgress?: (fraction: number) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // The URL exactly as issued. Nothing is parsed, normalised or rebuilt.
    xhr.open(ticket.httpMethod || "PUT", ticket.uploadUrl, true);
    xhr.withCredentials = false;

    for (const [name, value] of Object.entries(uploadHeaders(ticket))) {
      xhr.setRequestHeader(name, value);
    }

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      };
    }

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new DirectUploadError(`Upload failed (${xhr.status})`, xhr.status));

    // A blocked preflight, a DNS failure and an offline device all arrive here
    // with no status at all — the browser deliberately withholds it. Saying so
    // beats reporting a status of 0 as though the store had answered.
    xhr.onerror = () =>
      reject(
        new DirectUploadError(
          "The upload could not reach the storage service. This is usually a network problem "
            + "or a storage configuration issue rather than a problem with the file.",
          0
        )
      );
    xhr.onabort = () => reject(new DirectUploadError("Upload cancelled", 0));

    // The raw file. No FormData, no base64, no transformation of any kind.
    xhr.send(file);
  });
}
