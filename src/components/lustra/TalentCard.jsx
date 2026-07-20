import React from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRate } from "@/domain/talent";
import { AvailabilityPill } from "./Primitives";

/** A neutral placeholder while a talent has no approved public cover image. */
const COVER_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='1200'>
       <rect width='100%' height='100%' fill='#141013'/>
       <path d='M450 520 L520 590 L450 660 L380 590 Z' fill='none' stroke='#B8876B' stroke-width='1.5' opacity='0.5'/>
     </svg>`
  );

/**
 * @param {{
 *   talent: any;
 *   saved?: boolean;
 *   onToggleSave?: (id: string) => void;
 *   variant?: "editorial" | "compact";
 * }} props
 */
export default function TalentCard({ talent, saved, onToggleSave, variant = "editorial" }) {
  return (
    <Link
      to={`/talent/${talent.id}`}
      className="group block relative overflow-hidden rounded-lg border border-white/[0.06] bg-card-black"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={talent.cover || COVER_PLACEHOLDER}
          alt={talent.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover grayscale-[0.15] transition-all duration-700 group-hover:scale-[1.03] group-hover:grayscale-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/20 to-transparent" />

        {talent.featured && (
          <span className="absolute top-3 left-3 text-[0.5rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-2 py-1 bg-noir/60 backdrop-blur-sm rounded-sm">
            Featured
          </span>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            // Pass the whole talent: the save action needs the profile id, while the
            // card routes on the slug.
            onToggleSave?.(talent);
          }}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-noir/50 backdrop-blur-sm border border-white/10 hover:border-rose-gold/50 transition"
          aria-label={saved ? "Remove from saved" : "Save talent"}
        >
          <Heart
            className={cn("w-4 h-4 transition", saved ? "fill-rose-gold text-rose-gold" : "text-ivory/70")}
            strokeWidth={1.2}
          />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="font-heading text-2xl text-ivory leading-none">
                {talent.name}
                {talent.age && <span className="text-soft-ivory/60 text-lg">, {talent.age}</span>}
              </p>
              <p className="font-body text-[0.65rem] tracking-wide-luxe uppercase text-soft-ivory/70 mt-1.5">
                {talent.headline}
              </p>
            </div>
            {talent.rating >= 4.8 && (
              <div className="flex items-center gap-1 text-rose-gold shrink-0">
                <Star className="w-3 h-3 fill-rose-gold" />
                <span className="text-xs font-body">{talent.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="inline-flex items-center gap-1 text-[0.6rem] text-muted-grey font-body">
              <MapPin className="w-3 h-3" strokeWidth={1.2} />
              {talent.city}
            </span>
            <AvailabilityPill status={talent.availability} />
          </div>
        </div>
      </div>

      {variant === "editorial" && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-white/[0.04]">
          <span className="text-[0.55rem] tracking-luxe uppercase text-muted-grey font-body">
            Starting
          </span>
          {/* Never fabricate a price: talent with no published public rate show
              "On request", which is what management will quote against. */}
          <span className="font-heading text-lg text-light-rose-gold">
            {formatRate(talent.startingRate, talent.startingRateCurrency)}
          </span>
        </div>
      )}
    </Link>
  );
}