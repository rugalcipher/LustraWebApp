import React from "react";
import { cn } from "@/lib/utils";

/**
 * The Lustra diamond "L" monogram — the canonical brand mark.
 * A serif "L" inside a thin-line diamond with a metallic highlight at the top vertex.
 * @param {{ size?: number; className?: string }} props
 */
export default function Monogram({ size = 40, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      aria-label="Lustra monogram"
    >
      <defs>
        <linearGradient id="lustra-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D8AB91" />
          <stop offset="45%" stopColor="#B8876B" />
          <stop offset="100%" stopColor="#8A5E44" />
        </linearGradient>
        <linearGradient id="lustra-gold-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8C9B4" />
          <stop offset="50%" stopColor="#B8876B" />
          <stop offset="100%" stopColor="#7A4E38" />
        </linearGradient>
      </defs>

      {/* Diamond outline */}
      <path
        d="M50 4 L96 50 L50 96 L4 50 Z"
        stroke="url(#lustra-gold)"
        strokeWidth="1.2"
        fill="none"
      />
      {/* Inner diamond hint */}
      <path
        d="M50 14 L86 50 L50 86 L14 50 Z"
        stroke="url(#lustra-gold)"
        strokeWidth="0.5"
        fill="none"
        opacity="0.35"
      />
      {/* Top vertex highlight */}
      <circle cx="50" cy="4" r="1.6" fill="#E8C9B4" />

      {/* Serif "L" */}
      <g stroke="url(#lustra-gold-v)" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <line x1="38" y1="28" x2="38" y2="68" />
        <line x1="38" y1="68" x2="64" y2="68" />
      </g>
      {/* Serif terminals */}
      <g fill="url(#lustra-gold)">
        <rect x="35.5" y="26" width="5" height="2.4" rx="1" />
        <rect x="62" y="65.5" width="2.4" height="5" rx="1" />
      </g>
    </svg>
  );
}