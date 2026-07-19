import React from "react";
import Monogram from "@/lib/lustra/Monogram";

/**
 * Full-screen cinematic loading skeleton — dark image placeholder with
 * animated profile-text lines and a rose-gold monogram.
 */
export default function DiscoverSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-deep-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-card-black/40 via-deep-black to-noir" />
      <div className="relative flex flex-col items-center gap-5 animate-pulse">
        <Monogram size={56} />
        <div className="space-y-2.5 w-56">
          <div className="h-3 w-3/4 mx-auto bg-rose-gold/10 rounded-full" />
          <div className="h-2 w-1/2 mx-auto bg-white/5 rounded-full" />
        </div>
        <div className="w-40 h-1 bg-rose-gold/15 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-rose-gold/60 rounded-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
}