import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDiscoveryFilterOptions } from "@/features/discovery/hooks";

/**
 * Bottom-sheet filter modal for refining the talent roster.
 *
 * Options come from the real reference-data endpoints (cities, engagement categories),
 * so a city added in the Admin portal appears here without a frontend deploy.
 */
export default function TalentFilterSheet({ open, onClose, filters, onChange, onReset, reduced }) {
  const { cities, engagementCategories, isLoading } = useDiscoveryFilterOptions();
  const cityNames = cities.map((c) => c.name);
  const engagementNames = engagementCategories.map((e) => e.name);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-noir/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.3 }}
          />
          <motion.div
            className="relative w-full max-w-luxe bg-elevated-black border-t border-rose-gold/20 rounded-t-2xl sm:rounded-lg p-6 max-h-[80vh] overflow-y-auto lustra-scroll-hide"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: reduced ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-xl text-ivory">Refine</h3>
              <button onClick={onClose} className="text-muted-grey hover:text-ivory">
                <X className="w-5 h-5" strokeWidth={1.2} />
              </button>
            </div>

            {isLoading && (
              <p className="mb-6 text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">
                Loading options…
              </p>
            )}

            <FilterGroup
              label="City"
              value={filters.city}
              options={cityNames}
              onChange={(v) => onChange({ ...filters, city: filters.city === v ? "" : v })}
            />
            <FilterGroup
              label="Engagement"
              value={filters.category}
              options={engagementNames}
              onChange={(v) =>
                onChange({ ...filters, category: filters.category === v ? "" : v })
              }
            />
            <FilterGroup
              label="Travels"
              value={filters.travel}
              options={[{ value: "yes", label: "Available to travel" }]}
              onChange={() =>
                onChange({ ...filters, travel: filters.travel === "yes" ? "" : "yes" })
              }
            />

            <div className="flex gap-3 mt-8">
              <button
                onClick={onReset}
                className="flex-1 py-3 text-[0.65rem] tracking-luxe uppercase border border-white/10 rounded-sm text-muted-grey hover:text-ivory transition"
              >
                Clear
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 text-[0.65rem] tracking-luxe uppercase bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir rounded-sm"
              >
                Apply
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FilterGroup({ label, value, options, onChange }) {
  return (
    <div className="mb-6">
      <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lbl = typeof o === "string" ? o : o.label;
          const active = value === val;
          return (
            <button
              key={val}
              onClick={() => onChange(val)}
              className={cn(
                "text-[0.65rem] tracking-wide-luxe uppercase px-3 py-1.5 rounded-full border transition",
                active
                  ? "border-rose-gold/50 text-rose-gold bg-rose-gold/5"
                  : "border-white/[0.08] text-soft-ivory/70 hover:text-ivory"
              )}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}