import React, { useRef, useState } from "react";
import { MapPin, Navigation, Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDiscoveryUiStore, RADIUS_OPTIONS_KM,
} from "@/stores/discoveryUiStore";
import {
  createPlacesSessionToken, fetchAddressSuggestions, fetchPlaceDetails, isGoogleMapsConfigured,
} from "@/services/googlePlaces";
import { requestCurrentPosition, geolocationMessage } from "@/features/discovery/geolocation";

/**
 * Nearby discovery: search a place or use the current device location to find talent by distance.
 *
 * PRIVACY: the device location is requested only when the visitor presses the action — never on
 * load — and the coordinates are used once to run a search, then held only in the browser's own
 * query state. No talent coordinate is ever shown; results carry a coarse distance band. Google
 * loading failing or the key being absent never blocks discovery — the place search simply hides
 * and the manual city picker (elsewhere) still works.
 */
export default function NearbyLocation() {
  const configured = isGoogleMapsConfigured();
  const filters = useDiscoveryUiStore((s) => s.appliedFilters);
  const cityName = useDiscoveryUiStore((s) => s.location.cityName);
  const setNearbyPoint = useDiscoveryUiStore((s) => s.setNearbyPoint);
  const setRadiusKm = useDiscoveryUiStore((s) => s.setRadiusKm);
  const clearNearby = useDiscoveryUiStore((s) => s.clearNearby);

  const active = filters.latitude != null && filters.longitude != null;

  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null);

  const sessionRef = useRef(null);
  const debounceRef = useRef(null);
  const seqRef = useRef(0);

  const onSearchChange = (event) => {
    const next = event.target.value;
    setSearch(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = next.trim();
    if (q.length < 3) {
      seqRef.current++;
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (!sessionRef.current) sessionRef.current = createPlacesSessionToken();
    debounceRef.current = setTimeout(() => {
      const seq = ++seqRef.current;
      fetchAddressSuggestions(q, { sessionToken: sessionRef.current ?? undefined })
        .then((results) => {
          if (seq !== seqRef.current) return;
          setSuggestions(results);
          setOpen(results.length > 0);
        })
        .catch(() => {
          if (seq !== seqRef.current) return;
          setSuggestions([]);
          setOpen(false);
        });
    }, 250);
  };

  const pick = async (suggestion) => {
    seqRef.current++;
    setOpen(false);
    setBusy(true);
    try {
      const place = await fetchPlaceDetails(suggestion.placeId, { sessionToken: sessionRef.current ?? undefined });
      if (place.location) {
        setNearbyPoint({
          latitude: place.location.lat,
          longitude: place.location.lng,
          cityName: suggestion.primaryText,
        });
        setSearch("");
        setGeoStatus(null);
      }
    } catch {
      /* a failed lookup leaves discovery unchanged */
    } finally {
      sessionRef.current = null;
      setBusy(false);
    }
  };

  const useMyLocation = async () => {
    setGeoStatus("requesting");
    setBusy(true);
    const outcome = await requestCurrentPosition();
    setBusy(false);
    if (outcome.status === "granted") {
      setNearbyPoint({ latitude: outcome.latitude, longitude: outcome.longitude, cityName: "Near you" });
      setGeoStatus(null);
    } else {
      setGeoStatus(outcome.status);
    }
  };

  const message = geoStatus && geoStatus !== "requesting" ? geolocationMessage(geoStatus) : null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={useMyLocation}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-rose-gold/30 text-rose-gold font-body text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition disabled:opacity-60"
      >
        {geoStatus === "requesting" ? (
          <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.4} />
        ) : (
          <Navigation className="w-3 h-3" strokeWidth={1.4} />
        )}
        Use my current location
      </button>

      {configured && (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-grey">
            {busy && geoStatus !== "requesting" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </div>
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-label="Search a place to find talent nearby"
            autoComplete="off"
            value={search}
            onChange={onSearchChange}
            placeholder="Search a suburb, city or address…"
            className="w-full bg-deep-black/60 border border-white/10 rounded-full pl-9 pr-3 py-2.5 font-body text-body text-ivory placeholder:text-muted-grey/70 focus:outline-none focus:border-rose-gold/50"
          />
          {open && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-sm border border-white/10 bg-elevated-black shadow-xl"
            >
              {suggestions.map((s) => (
                <li
                  key={s.placeId}
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  className="cursor-pointer px-3 py-2.5 flex items-start gap-2 hover:bg-rose-gold/10"
                >
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-gold/70" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-body text-body text-ivory truncate">{s.primaryText}</span>
                    {s.secondaryText && (
                      <span className="block font-body text-meta text-muted-grey truncate">{s.secondaryText}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {message && (
        <p role="status" className="font-body text-[0.6rem] text-muted-grey text-center">
          {message}
        </p>
      )}

      {active && (
        <div className="space-y-3 rounded-lg border border-rose-gold/20 bg-rose-gold/[0.03] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-body text-[0.6rem] tracking-wide-luxe uppercase text-rose-gold">
              <MapPin className="w-3 h-3" strokeWidth={1.4} />
              {cityName || "Near your location"}
            </span>
            <button
              type="button"
              onClick={clearNearby}
              aria-label="Clear location"
              className="inline-flex items-center gap-1 text-muted-grey hover:text-ivory font-body text-[0.55rem] tracking-luxe uppercase"
            >
              <X className="w-3 h-3" strokeWidth={1.4} /> Clear
            </button>
          </div>

          <div>
            <p className="font-body text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey mb-1.5">
              Within
            </p>
            <div className="flex flex-wrap gap-1.5">
              {RADIUS_OPTIONS_KM.map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setRadiusKm(km)}
                  className={cn(
                    "px-3 py-1 rounded-full border font-body text-[0.55rem] tracking-wide-luxe uppercase transition",
                    filters.radiusKm === km
                      ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                      : "border-white/[0.08] text-soft-ivory/70 hover:text-ivory"
                  )}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A privacy-safe distance label for a talent card. Bands the value; never shows coordinates. */
export function formatDistanceBand(distanceKm) {
  if (distanceKm == null) return null;
  if (distanceKm < 1) return "Under 1 km away";
  if (distanceKm < 10) return `${Math.round(distanceKm)} km away`;
  return `${Math.round(distanceKm / 5) * 5} km away`;
}
