import React from "react";
import { Loader2, ImageOff, Star } from "lucide-react";
import { useApplicationMediaUrl } from "@/features/talentApplication/hooks";

/**
 * One private application photograph.
 *
 * Application media has **no public URL at any point**. The list response
 * deliberately carries none, and a link is minted per photograph, per reviewer,
 * with a short life via `GET /management/talent-applications/{id}/media/{mediaId}/url`.
 * The URL is used as an `<img src>` and nothing else: it is never written to a
 * log, an analytics payload or an error report, and it is not persisted.
 *
 * `referrerPolicy="no-referrer"` so the signed URL cannot leak through a
 * `Referer` header if the image host redirects.
 */
export default function PrivatePhoto({ applicationId, media, onOpen }) {
  const query = useApplicationMediaUrl(applicationId, media.id);

  return (
    <figure className="relative rounded-sm overflow-hidden border border-white/10 bg-deep-black/60">
      <div className="aspect-[3/4] flex items-center justify-center">
        {query.isPending && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-grey" aria-hidden="true" />
        )}
        {query.isError && (
          <span className="flex flex-col items-center gap-1 text-muted-grey">
            <ImageOff className="w-5 h-5" aria-hidden="true" />
            <span className="font-body text-meta">Unavailable</span>
          </span>
        )}
        {query.isSuccess && (
          <button
            type="button"
            onClick={() => onOpen?.(query.data.url, media)}
            className="w-full h-full focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-gold"
            aria-label={`View ${media.originalFileName} full size`}
          >
            <img
              src={query.data.url}
              alt={media.originalFileName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </button>
        )}
      </div>

      {media.isCover && (
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-noir/80 border border-rose-gold/40 font-body text-meta uppercase tracking-luxe text-rose-gold">
          <Star className="w-3 h-3" fill="currentColor" aria-hidden="true" /> Preferred cover
        </span>
      )}

      <figcaption className="px-2 py-1.5 font-body text-meta text-muted-grey truncate">
        {media.originalFileName}
      </figcaption>
    </figure>
  );
}
