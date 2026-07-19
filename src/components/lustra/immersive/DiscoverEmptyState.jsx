import React from "react";
import { SearchX } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import Monogram from "@/lib/lustra/Monogram";

/**
 * Elegant Lustra empty state when no talent matches the current filters.
 */
export default function DiscoverEmptyState({ onAdjust, onReset, onBrowse }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-deep-black">
      <div className="opacity-10 mb-6">
        <Monogram size={64} />
      </div>
      <SearchX className="w-7 h-7 text-rose-gold/40 mb-4" strokeWidth={1} />
      <p className="font-heading text-2xl text-ivory/90 mb-2">No talent matches these preferences</p>
      <p className="font-body text-sm text-muted-grey max-w-xs mb-8 leading-relaxed">
        Adjust your filters or explore our featured roster.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <LustraButton onClick={onAdjust} variant="outline" size="sm">
          Adjust Filters
        </LustraButton>
        <LustraButton onClick={onReset} variant="solid" size="sm">
          Reset Filters
        </LustraButton>
        <LustraButton onClick={onBrowse} variant="gold" size="sm">
          Browse Featured Talent
        </LustraButton>
      </div>
    </div>
  );
}