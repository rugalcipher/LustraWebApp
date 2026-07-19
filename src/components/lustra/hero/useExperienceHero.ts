import { useCallback, useEffect, useRef, useState } from "react";

/** Detect the user's reduced-motion preference (reactive). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

export interface ExperienceHeroState {
  index: number;
  count: number;
  /** 0..1 fill of the active progress segment. */
  progress: number;
  paused: boolean;
  reducedMotion: boolean;
  /** Indices whose images should be mounted (progressive loading). */
  loaded: Set<number>;
  setPaused: (p: boolean) => void;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
}

/**
 * Drives the Experience Hero: autoplay (rAF-based, pause-aware), progress fill,
 * reduced-motion fallback (no autoplay), and progressive image loading
 * (mount only the active slide + preload the next).
 */
export function useExperienceHero(count: number, autoplayMs: number): ExperienceHeroState {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set(count > 1 ? [0, 1] : [0]));

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count]
  );
  const next = useCallback(() => setIndex((p) => (p + 1) % count), [count]);
  const prev = useCallback(() => setIndex((p) => (p - 1 + count) % count), [count]);

  // Reset the autoplay timer whenever the slide changes (manual or auto).
  useEffect(() => {
    elapsedRef.current = 0;
    lastTsRef.current = null;
    setProgress(0);
  }, [index]);

  // Progressively mount images: current + next.
  useEffect(() => {
    setLoaded((prev) => {
      const n = new Set(prev);
      n.add(index);
      n.add((index + 1) % count);
      return n;
    });
  }, [index, count]);

  // Autoplay loop — frozen while paused or when reduced motion is preferred.
  useEffect(() => {
    if (paused || reducedMotion || count <= 1) return;
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      elapsedRef.current += dt;
      const p = Math.min(1, elapsedRef.current / autoplayMs);
      setProgress(p);
      if (p >= 1) {
        elapsedRef.current = 0;
        lastTsRef.current = null;
        setIndex((i) => (i + 1) % count);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [paused, reducedMotion, autoplayMs, count]);

  return { index, count, progress, paused, reducedMotion, loaded, setPaused, next, prev, goTo };
}
