import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A media-first talent gallery: one slide per approved image, cover first.
 *
 * Navigation is horizontal only and deliberately separated from any parent talent-to-talent
 * gesture: tap the left/right third of the image, swipe horizontally (threshold + direction
 * lock), use the arrow keys, or click an indicator. Vertical scroll is never hijacked. The
 * tap zones start BELOW `headerOffset` so a header Back button is never stolen by the left zone.
 *
 * Controlled (`index` + `onIndexChange`) or uncontrolled. Clamps at both ends (no wrap) so the
 * behaviour is predictable. The cover loads eagerly, the next image is preloaded, the rest are
 * lazy. A polite live region announces "Image X of N".
 *
 * `images` may be strings or objects with `{ id?, url }`; keys use the stable media id when present.
 */
const SWIPE_THRESHOLD = 45;
const DIRECTION_LOCK = 12;

function normalise(images) {
  return (images ?? [])
    .map((img, i) => (typeof img === "string" ? { id: null, url: img, key: `img-${i}` } : { id: img?.id ?? null, url: img?.url, key: img?.id ?? `img-${i}` }))
    .filter((img) => Boolean(img.url));
}

/**
 * @param {{
 *   images: Array<string | { id?: string | null; url: string }>,
 *   index?: number,
 *   onIndexChange?: (i: number) => void,
 *   headerOffset?: string,
 *   className?: string,
 *   imageClassName?: string,
 *   indicatorPosition?: "top" | "bottom",
 *   children?: import("react").ReactNode,
 *   ariaLabel?: string,
 * }} props
 */
export default function TalentGallery({
  images,
  index: controlledIndex,
  onIndexChange,
  headerOffset = "5rem",
  className,
  imageClassName,
  indicatorPosition = "bottom",
  children,
  ariaLabel = "Talent photographs",
}) {
  const slides = normalise(images);
  const count = slides.length;

  const [uncontrolled, setUncontrolled] = useState(0);
  const isControlled = controlledIndex != null;
  const rawIndex = isControlled ? controlledIndex : uncontrolled;
  const index = count > 0 ? Math.max(0, Math.min(rawIndex, count - 1)) : 0;

  const setIndex = useCallback(
    (next) => {
      const clamped = Math.max(0, Math.min(next, Math.max(count - 1, 0)));
      if (isControlled) onIndexChange?.(clamped);
      else setUncontrolled(clamped);
    },
    [count, isControlled, onIndexChange]
  );

  const prev = useCallback(() => setIndex(index - 1), [index, setIndex]);
  const next = useCallback(() => setIndex(index + 1), [index, setIndex]);

  const touch = useRef({ x: 0, y: 0, locked: null });
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, locked: null };
  };
  const onTouchMove = (e) => {
    const t = e.touches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (!touch.current.locked && (Math.abs(dx) > DIRECTION_LOCK || Math.abs(dy) > DIRECTION_LOCK)) {
      touch.current.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
  };
  const onTouchEnd = (e) => {
    if (touch.current.locked !== "x") return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    if (dx <= -SWIPE_THRESHOLD) next();
    else if (dx >= SWIPE_THRESHOLD) prev();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
  };

  // Preload the next image so advancing rarely waits, without fetching the whole gallery.
  useEffect(() => {
    const upcoming = slides[index + 1];
    if (upcoming) {
      const img = new Image();
      img.src = upcoming.url;
    }
  }, [index, slides]);

  const active = slides[index] ?? null;
  const hasMultiple = count > 1;

  return (
    <div
      className={cn("relative overflow-hidden bg-card-black select-none", className)}
      // Vertical panning stays with the browser; we only claim horizontal.
      style={{ touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
      tabIndex={hasMultiple ? 0 : -1}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      {active && (
        <img
          key={active.key}
          src={active.url}
          alt={`${ariaLabel} ${index + 1} of ${count}`}
          fetchPriority={index === 0 ? "high" : "auto"}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      )}

      {/* Tap zones — below the header so the left zone never steals a Back button. */}
      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={prev}
            disabled={index === 0}
            className="absolute left-0 bottom-0 z-10 w-2/5 disabled:pointer-events-none"
            style={{ top: headerOffset }}
          />
          <button
            type="button"
            aria-label="Next photo"
            onClick={next}
            disabled={index === count - 1}
            className="absolute right-0 bottom-0 z-10 w-3/5 disabled:pointer-events-none"
            style={{ top: headerOffset }}
          />

          {/* Desktop explicit controls */}
          <button
            type="button"
            aria-label="Previous photo"
            onClick={prev}
            disabled={index === 0}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-noir/50 backdrop-blur border border-white/10 text-ivory hover:border-rose-gold/50 transition disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={next}
            disabled={index === count - 1}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-noir/50 backdrop-blur border border-white/10 text-ivory hover:border-rose-gold/50 transition disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </button>

          {/* Indicators — one per real image. */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-20 flex gap-1.5",
              indicatorPosition === "top" ? "top-3" : "bottom-3"
            )}
          >
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === index ? "w-6 bg-rose-gold" : "w-2 bg-ivory/40 hover:bg-ivory/70"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Overlay content (summary, header) supplied by the caller. */}
      {children}

      <div aria-live="polite" className="sr-only">
        {count > 0 ? `Photo ${index + 1} of ${count}` : "No photographs"}
      </div>
    </div>
  );
}
