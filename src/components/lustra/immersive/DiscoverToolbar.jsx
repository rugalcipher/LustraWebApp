import React from "react";
import { Search, SlidersHorizontal, X, LayoutGrid, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sort options. `value` is the canonical token shared with the discovery store and
 * mapped to the backend's `TalentSortOption` in `discoveryService` — the label is
 * presentation only, so the two can never drift apart.
 */
const SORTS = [
  { value: "Featured", label: "Featured" },
  { value: "Newest", label: "Newest" },
  { value: "Rating", label: "Top Rated" },
  { value: "RateAsc", label: "Rate: Low to High" },
  { value: "RateDesc", label: "Rate: High to Low" },
];

/**
 * Compact toolbar above the immersive stage — search, filter, sort, result
 * count, active-filter chips, reset, and the Immersive / Browse-All toggle.
 */
export default function DiscoverToolbar({
  query,
  onQuery,
  sort,
  onSort,
  onOpenFilters,
  activeFilterCount,
  resultCount,
  currentFilterLabel,
  onReset,
  mode,
  onModeChange,
}) {
  return (
    <div className="shrink-0 px-4 pt-3 pb-2 space-y-2.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-grey"
            strokeWidth={1.2}
          />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search talent, city, category"
            className="w-full bg-card-black/80 border border-white/[0.08] rounded-full pl-9 pr-3 py-2 text-xs font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 transition"
          />
        </div>
        <button
          onClick={onOpenFilters}
          className="relative px-3 border border-white/[0.08] rounded-full text-soft-ivory hover:border-rose-gold/40 transition"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.2} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-gold text-noir text-[0.5rem] flex items-center justify-center font-body">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        {/* Sort + result count */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5 overflow-x-auto lustra-scroll-hide -mx-1 px-1">
            {/* "Nearest" appears only while a nearby search is active (sort === Distance), so it
                is never selectable without a search point — which the API would reject. */}
            {(sort === "Distance" ? [{ value: "Distance", label: "Nearest" }, ...SORTS] : SORTS).map((s) => (
              <button
                key={s.value}
                onClick={() => onSort(s.value)}
                className={cn(
                  "shrink-0 text-[0.5rem] tracking-wide-luxe uppercase px-2.5 py-1 rounded-full border font-body transition",
                  sort === s.value
                    ? "border-rose-gold/50 text-rose-gold bg-rose-gold/5"
                    : "border-white/[0.06] text-muted-grey hover:text-soft-ivory"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div className="shrink-0 flex items-center bg-card-black/80 border border-white/[0.06] rounded-full p-0.5">
          <button
            onClick={() => onModeChange("immersive")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.5rem] tracking-luxe uppercase transition",
              mode === "immersive"
                ? "bg-rose-gold/15 text-rose-gold"
                : "text-muted-grey hover:text-soft-ivory"
            )}
          >
            <Maximize className="w-3 h-3" strokeWidth={1.2} /> Immersive
          </button>
          <button
            onClick={() => onModeChange("grid")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.5rem] tracking-luxe uppercase transition",
              mode === "grid"
                ? "bg-rose-gold/15 text-rose-gold"
                : "text-muted-grey hover:text-soft-ivory"
            )}
          >
            <LayoutGrid className="w-3 h-3" strokeWidth={1.2} /> Browse All
          </button>
        </div>
      </div>

      {/* Active filter row */}
      <div className="flex items-center justify-between">
        <p className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey font-body">
          {resultCount} {resultCount === 1 ? "profile" : "profiles"}
          {currentFilterLabel && (
            <span className="ml-1.5 text-soft-ivory/40">· {currentFilterLabel}</span>
          )}
        </p>
        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[0.5rem] tracking-luxe uppercase text-rose-gold/70 hover:text-rose-gold transition"
          >
            <X className="w-2.5 h-2.5" strokeWidth={1.4} /> Reset
          </button>
        )}
      </div>
    </div>
  );
}