import React, { useRef, useState } from "react";
import { MapPin, Navigation, Search, X, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiscoveryUiStore, RADIUS_OPTIONS_KM } from "@/stores/discoveryUiStore";
import {
  createPlacesSessionToken, fetchAddressSuggestions, fetchPlaceDetails, isGoogleMapsConfigured,
} from "@/services/googlePlaces";
import { requestCurrentPosition, geolocationMessage } from "@/features/discovery/geolocation";
import { SA_PROVINCES } from "@/features/discovery/saGeography";

/**
 * One compact location control for discovery, replacing the old wall of city pills, the duplicated
 * "Resolve my city" button and the repeated permission text.
 *
 * The trigger shows the current state (Near me / a chosen area / "Choose location"). Opening it
 * reveals a single sheet with exactly three ways to set an area:
 *   1. Use my current location (geolocation — only on this explicit press).
 *   2. Search an area with Google Places (the shared loader; degrades gracefully when unavailable).
 *   3. Province → locality fallback (the SA seed), for when Google is missing or fails.
 *
 * PRIVACY: coordinates (from the device or a Google place) are the VISITOR's own, used once for a
 * nearby search and held only in query state. The province/locality fallback carries no
 * coordinates — it is a soft area label ("Based in Soweto"), never a live position.
 */
export default function DiscoveryLocation({ variant = "bar" }) {
  const configured = isGoogleMapsConfigured();
  const filters = useDiscoveryUiStore((s) => s.appliedFilters);
  const cityName = useDiscoveryUiStore((s) => s.location.cityName);
  const setNearbyPoint = useDiscoveryUiStore((s) => s.setNearbyPoint);
  const setRadiusKm = useDiscoveryUiStore((s) => s.setRadiusKm);
  const clearNearby = useDiscoveryUiStore((s) => s.clearNearby);
  const setLocation = useDiscoveryUiStore((s) => s.setLocation);

  const active = filters.latitude != null && filters.longitude != null;
  const label = active ? cityName || "Near you" : cityName || null;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null);
  const [province, setProvince] = useState(null);

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
      return;
    }
    if (!sessionRef.current) sessionRef.current = createPlacesSessionToken();
    debounceRef.current = setTimeout(() => {
      const seq = ++seqRef.current;
      fetchAddressSuggestions(q, { sessionToken: sessionRef.current ?? undefined })
        .then((results) => seq === seqRef.current && setSuggestions(results))
        .catch(() => seq === seqRef.current && setSuggestions([]));
    }, 250);
  };

  const pickPlace = async (suggestion) => {
    seqRef.current++;
    setSuggestions([]);
    setBusy(true);
    try {
      const place = await fetchPlaceDetails(suggestion.placeId, { sessionToken: sessionRef.current ?? undefined });
      if (place.location) {
        setNearbyPoint({ latitude: place.location.lat, longitude: place.location.lng, cityName: suggestion.primaryText });
        setSearch("");
        setGeoStatus(null);
        setOpen(false);
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
      setOpen(false);
    } else {
      setGeoStatus(outcome.status);
    }
  };

  // The province/locality fallback has no coordinates — it sets a soft area label only.
  const pickLocality = (locality) => {
    clearNearby();
    setLocation({ cityId: null, cityName: locality, regionId: null, countryId: null, source: "explicit" });
    setOpen(false);
    setProvince(null);
  };

  const clearAll = () => {
    clearNearby();
    setLocation({ cityId: null, cityName: null, regionId: null, countryId: null, source: "none" });
  };

  const message = geoStatus && geoStatus !== "requesting" ? geolocationMessage(geoStatus) : null;

  return (
    <div className={cn("relative", variant === "bar" ? "" : "w-full")}>
      {/* Trigger */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/10 bg-deep-black/40 text-soft-ivory/85 font-body text-[0.65rem] tracking-wide-luxe uppercase hover:border-rose-gold/40 transition"
        >
          {active ? <Navigation className="w-3.5 h-3.5 text-rose-gold" strokeWidth={1.5} /> : <MapPin className="w-3.5 h-3.5" strokeWidth={1.4} />}
          <span className="max-w-[10rem] truncate">{label || "Choose location"}</span>
        </button>
        {(active || cityName) && (
          <button type="button" onClick={clearAll} aria-label="Clear location" className="text-muted-grey hover:text-ivory">
            <X className="w-3.5 h-3.5" strokeWidth={1.4} />
          </button>
        )}
      </div>

      {/* Sheet — high z so it is never clipped by the immersive stage's overflow. */}
      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Choose location"
            className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-elevated-black p-5 space-y-4 sm:inset-x-auto sm:right-4 sm:bottom-auto sm:top-20 sm:w-96 sm:rounded-2xl sm:border"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg text-ivory">Choose location</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-muted-grey hover:text-ivory">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Current location */}
            <button
              type="button"
              onClick={useMyLocation}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-rose-gold/40 text-rose-gold font-body text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition disabled:opacity-60"
            >
              {geoStatus === "requesting" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" strokeWidth={1.4} />}
              Use my current location
            </button>
            {message && <p role="status" className="font-body text-[0.6rem] text-muted-grey text-center">{message}</p>}

            {/* 2. Google Places search */}
            {configured && (
              <div>
                <p className="font-body text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey mb-1.5">Search an area</p>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-grey">
                    {busy && geoStatus !== "requesting" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  </div>
                  <input
                    type="text"
                    role="combobox"
                    aria-expanded={suggestions.length > 0}
                    aria-label="Search a suburb, city or area"
                    autoComplete="off"
                    value={search}
                    onChange={onSearchChange}
                    placeholder="Suburb, city or area…"
                    className="w-full bg-deep-black/60 border border-white/10 rounded-full pl-9 pr-3 py-2.5 font-body text-base text-ivory placeholder:text-muted-grey/70 focus:outline-none focus:border-rose-gold/50"
                  />
                </div>
                {suggestions.length > 0 && (
                  <ul role="listbox" className="mt-1 max-h-52 overflow-auto rounded-lg border border-white/10 bg-deep-black/60">
                    {suggestions.map((s) => (
                      <li
                        key={s.placeId}
                        role="option"
                        aria-selected={false}
                        onMouseDown={(e) => { e.preventDefault(); pickPlace(s); }}
                        className="cursor-pointer px-3 py-2.5 flex items-start gap-2 hover:bg-rose-gold/10"
                      >
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-gold/70" />
                        <span className="min-w-0">
                          <span className="block font-body text-base text-ivory truncate">{s.primaryText}</span>
                          {s.secondaryText && <span className="block font-body text-meta text-muted-grey truncate">{s.secondaryText}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 3. Province → locality fallback */}
            <div>
              <p className="font-body text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey mb-1.5">
                {configured ? "Or pick an area" : "Pick an area"}
              </p>
              {province === null ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {SA_PROVINCES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvince(p)}
                      className="inline-flex items-center justify-between px-3 py-2 rounded-lg border border-white/[0.08] text-soft-ivory/80 font-body text-[0.6rem] hover:border-rose-gold/40"
                    >
                      {p.name} <ChevronRight className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <button type="button" onClick={() => setProvince(null)} className="font-body text-[0.55rem] tracking-luxe uppercase text-rose-gold mb-2">
                    ← {province.name}
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {province.localities.map((locality) => (
                      <button
                        key={locality}
                        type="button"
                        onClick={() => pickLocality(locality)}
                        className="px-3 py-1.5 rounded-full border border-white/[0.08] text-soft-ivory/80 font-body text-[0.6rem] hover:border-rose-gold/40 hover:text-ivory"
                      >
                        {locality}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Radius, when a coordinate search is active */}
            {active && (
              <div className="pt-1">
                <p className="font-body text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey mb-1.5">Within</p>
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
