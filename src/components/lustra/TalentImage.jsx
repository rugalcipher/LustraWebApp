import React, { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A talent image that reserves its space before it loads.
 *
 * The point of this component is the LAYOUT SHIFT it prevents. Given intrinsic dimensions
 * from the API it sets `width`/`height` attributes and a CSS `aspect-ratio`, so the
 * browser allocates the box during layout rather than reflowing the page as each photo
 * arrives. Without dimensions it falls back to the caller's own ratio and behaves exactly
 * as a plain `<img>` would.
 *
 * There is deliberately NO remote fallback image. The component this replaced pointed its
 * error fallback at a third-party CDN, so a broken Lustra upload made the browser fetch an
 * asset from an unrelated host. A failed load now renders a local, silent placeholder.
 */
export default function TalentImage({
  image,
  alt = "",
  className,
  sizes,
  eager = false,
  fallbackRatio = "3 / 4",
  ...rest
}) {
  const [failed, setFailed] = useState(false);

  if (!image?.url || failed) {
    return (
      <div
        aria-hidden={alt ? undefined : "true"}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        style={{ aspectRatio: ratioFor(image, fallbackRatio) }}
        className={cn("bg-elevated-black border border-white/[0.04]", className)}
      />
    );
  }

  return (
    <img
      src={image.url}
      // Null when the CDN cannot resize. Passing null (not "") keeps the attribute off
      // the element entirely rather than emitting an empty, invalid srcset.
      srcSet={image.srcSet ?? undefined}
      sizes={image.srcSet ? sizes : undefined}
      // Intrinsic dimensions, not display size — the browser uses them purely to compute
      // the aspect box. CSS still controls the rendered size.
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      style={{ aspectRatio: ratioFor(image, fallbackRatio) }}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      // Above-the-fold imagery should not queue behind lazy work.
      fetchPriority={eager ? "high" : undefined}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
      {...rest}
    />
  );
}

/**
 * Prefer the real ratio; fall back to the caller's only when the server could not read
 * the dimensions. Guessing a ratio would reintroduce exactly the shift this prevents.
 */
function ratioFor(image, fallbackRatio) {
  if (image?.aspectRatio && image.aspectRatio > 0) return String(image.aspectRatio);
  if (image?.width && image.height) return `${image.width} / ${image.height}`;
  return fallbackRatio;
}
