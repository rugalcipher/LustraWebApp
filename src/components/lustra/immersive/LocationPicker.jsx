import React from "react";
import { MapPin, Loader2, Navigation, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiscoveryUiStore } from "@/stores/discoveryUiStore";
import { useCities, useResolveMyLocation, useSelectCity } from "@/features/discovery/hooks";
import NearbyLocation from "@/features/discovery/NearbyLocation";

/**
 * City selection for location-aware discovery.
 *
 * PRIVACY: precise location is never requested on page load. "Use my location" is a
 * deliberate action; the coordinates are sent once to the resolve endpoint and
 * discarded — only the resolved CITY is kept, and it is never written to the client's
 * profile or exposed to talent. Denying permission is a normal outcome: the manual
 * picker below always works and discovery is never blocked.
 */
export default function LocationPicker({ compact = false }) {
  const location = useDiscoveryUiStore((s) => s.location);
  const { data: cities = [], isPending } = useCities();
  const selectCity = useSelectCity();
  const { request, state, isResolving } = useResolveMyLocation();

  const message = {
    denied: "Location permission was declined — choose a city instead.",
    unsupported: "This browser can't share a location — choose a city instead.",
    failed: "We couldn't determine your location. Choose a city instead.",
    idle: null,
    requesting: null,
  }[state];

  return (
    <div className="space-y-3">
      {/* Distance search: a precise nearby search over the visitor's own point. */}
      <NearbyLocation />

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-white/[0.06]" />
        <span className="font-body text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey">or choose a city</span>
        <span className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <button
        type="button"
        onClick={request}
        disabled={isResolving}
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-rose-gold/30 text-rose-gold font-body text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition disabled:opacity-60"
      >
        {isResolving ? (
          <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.4} />
        ) : (
          <Navigation className="w-3 h-3" strokeWidth={1.4} />
        )}
        Resolve my city
      </button>

      {message && (
        <p role="status" className="font-body text-[0.6rem] text-muted-grey text-center">
          {message}
        </p>
      )}

      {location.cityId && (
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-gold/40 bg-rose-gold/5 text-rose-gold font-body text-[0.6rem] tracking-wide-luxe uppercase">
            <MapPin className="w-3 h-3" strokeWidth={1.4} />
            {location.cityName}
          </span>
          <button
            type="button"
            onClick={() => selectCity(null)}
            aria-label="Clear location"
            className="text-muted-grey hover:text-ivory"
          >
            <X className="w-3 h-3" strokeWidth={1.4} />
          </button>
        </div>
      )}

      {isPending ? (
        <p className="font-body text-[0.6rem] text-muted-grey text-center">Loading cities…</p>
      ) : (
        <div className={cn("flex flex-wrap gap-2", compact ? "justify-start" : "justify-center")}>
          {cities.map((city) => {
            const active = location.cityId === city.id;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => selectCity(active ? null : city)}
                className={cn(
                  "text-[0.6rem] tracking-wide-luxe uppercase px-3 py-1.5 rounded-full border font-body transition",
                  active
                    ? "border-rose-gold/50 text-rose-gold bg-rose-gold/5"
                    : "border-white/[0.08] text-soft-ivory/70 hover:text-ivory"
                )}
              >
                {city.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
