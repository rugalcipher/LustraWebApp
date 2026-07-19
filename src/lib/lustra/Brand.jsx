import React from "react";
import { cn } from "@/lib/utils";
import Monogram from "./Monogram";

export { Monogram };

/**
 * LUSTRA wordmark in high-contrast serif with gold gradient.
 * @param {{ size?: string; className?: string }} props
 */
export function Wordmark({ size = "text-3xl", className }) {
  return (
    <span
      className={cn(
        "font-heading font-light tracking-luxe lustra-text-gradient leading-none",
        size,
        className
      )}
    >
      LUSTRA
    </span>
  );
}

/**
 * Locked-up logo: monogram above wordmark.
 * @param {{ monogramSize?: number; wordmarkSize?: string; className?: string }} props
 */
export function LogoLockup({ monogramSize = 44, wordmarkSize = "text-2xl", className }) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Monogram size={monogramSize} />
      <Wordmark size={wordmarkSize} />
    </div>
  );
}

/**
 * Four-pointed sparkle star used as a refined separator.
 * @param {{ size?: number; className?: string }} props
 */
export function Sparkle({ size = 14, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      <path
        d="M12 0 C12.8 6 18 11.2 24 12 C18 12.8 12.8 18 12 24 C11.2 18 6 12.8 0 12 C6 11.2 11.2 6 12 0 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Thin line — sparkle — thin line divider.
 * @param {{ className?: string; label?: import("react").ReactNode }} props
 */
export function StarDivider({ className, label }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 text-rose-gold", className)}>
      <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-rose-gold/60" />
      <Sparkle size={12} className="text-rose-gold" />
      {label && (
        <span className="font-body text-[0.6rem] tracking-luxe text-soft-ivory/70 uppercase">
          {label}
        </span>
      )}
      <Sparkle size={12} className="text-rose-gold" />
      <span className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-rose-gold/60" />
    </div>
  );
}

/**
 * Low-opacity diamond monogram + wordmark watermark layered over imagery.
 * @param {{ className?: string }} props
 */
export function Watermark({ className }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center select-none",
        className
      )}
      aria-hidden="true"
    >
      <div className="opacity-[0.06] flex flex-col items-center gap-4">
        <Monogram size={220} />
        <Wordmark size="text-5xl" />
      </div>
    </div>
  );
}

/**
 * Small "MEMBERS ONLY" circular seal around the monogram.
 * @param {{ size?: number; className?: string }} props
 */
export function MonogramSeal({ size = 96, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={cn("inline-block", className)}
      aria-label="Lustra members seal"
    >
      <defs>
        <path id="lustra-seal-top" d="M18 60 A42 42 0 0 1 102 60" />
        <path id="lustra-seal-bottom" d="M102 60 A42 42 0 0 1 18 60" />
      </defs>
      <circle cx="60" cy="60" r="56" stroke="#B8876B" strokeWidth="0.6" fill="none" opacity="0.5" />
      <circle cx="60" cy="60" r="50" stroke="#B8876B" strokeWidth="0.4" fill="none" opacity="0.3" />
      <text fill="#B8876B" fontSize="6.5" letterSpacing="2.5" fontFamily="Jost, sans-serif" fontWeight="300">
        <textPath href="#lustra-seal-top" startOffset="50%" textAnchor="middle">
          L U S T R A
        </textPath>
      </text>
      <text fill="#B8876B" fontSize="5" letterSpacing="3" fontFamily="Jost, sans-serif" fontWeight="300">
        <textPath href="#lustra-seal-bottom" startOffset="50%" textAnchor="middle">
          MEMBERS ONLY
        </textPath>
      </text>
      <g transform="translate(60,60) scale(0.42) translate(-60,-60)">
        <path d="M60 10 L104 60 L60 110 L16 60 Z" stroke="#B8876B" strokeWidth="2" fill="none" />
        <line x1="48" y1="38" x2="48" y2="78" stroke="#B8876B" strokeWidth="5" strokeLinecap="round" />
        <line x1="48" y1="78" x2="74" y2="78" stroke="#B8876B" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}