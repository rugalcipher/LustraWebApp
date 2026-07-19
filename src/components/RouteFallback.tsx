import React from "react";
import Monogram from "@/lib/lustra/Monogram";

/** On-brand fallback shown while a lazy route chunk loads. */
export default function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <Monogram size={30} />
      <div className="mt-5 h-4 w-4 border-2 border-rose-gold/25 border-t-rose-gold rounded-full animate-spin" />
    </div>
  );
}
