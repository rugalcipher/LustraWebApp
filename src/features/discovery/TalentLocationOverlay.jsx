import React from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { publicLocationLabel } from "@/domain/talent";

/**
 * A tasteful, privacy-safe location overlay for talent imagery.
 *
 * Shows only the public operating location — "Province · City" (e.g. "Gauteng · Soweto") — where
 * the talent is BASED. It NEVER shows a street address, building/unit, postal code, place id,
 * coordinates, the private base address or a live position; it reads exclusively from the safe
 * public region/city the discovery API exposes.
 *
 * Placed lower-left with comfortable padding (never hugging the edge), it is pointer-events-none so
 * taps fall through to the gallery navigation, and it carries its own dark gradient/glass so it
 * stays readable over light or dark photographs. Renders nothing when no public location is set.
 */
export default function TalentLocationOverlay({ talent, className }) {
  const label = talent ? publicLocationLabel(talent) : null;
  if (!label) return null;

  return (
    <div
      data-testid="talent-location-overlay"
      className={cn(
        "pointer-events-none absolute left-4 bottom-12 z-20 max-w-[80%]",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-3",
          "bg-noir/55 backdrop-blur-md border border-white/10",
          "font-body text-[0.65rem] tracking-wide-luxe text-ivory",
          // A soft shadow so it reads over a bright photo too.
          "shadow-[0_1px_10px_rgba(0,0,0,0.35)]"
        )}
      >
        <MapPin className="w-3 h-3 text-rose-gold/90 shrink-0" strokeWidth={1.6} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
    </div>
  );
}
