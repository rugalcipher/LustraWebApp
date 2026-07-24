import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Search, X, Loader2, ChevronRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiscoveryUiStore, RADIUS_OPTIONS_KM } from "@/stores/discoveryUiStore";
import {
  createPlacesSessionToken, fetchAddressSuggestions, fetchPlaceDetails, isGoogleMapsConfigured,
} from "@/services/googlePlaces";
import {
  requestCurrentPosition, geolocationMessage,
  queryGeolocationPermission, isInsecureContext, platformLocationGuidance,
} from "@/features/discovery/geolocation";
import { SA_PROVINCES } from "@/features/discovery/saGeography";

// Statuses that mean location can't be used right now and the recovery guidance should show.
const BLOCKED_STATUSES = new Set(["denied", "insecure", "unsupported"]);

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

  const dialogRef = useRef(null);
  const headingRef = useRef(null);

  const closeSheet = () => setOpen(false);

  // Accessibility for the sheet: focus its heading on open, trap Tab within it, and let Escape
  // close it (the "Not now" outcome — discovery is never blocked on a location).
  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => headingRef.current?.focus(), 0);
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSheet();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    // Geolocation needs a secure context; on http it silently fails, so say so instead.
    if (isInsecureContext()) {
      setGeoStatus("insecure");
      return;
    }

    setGeoStatus("requesting");

    // Read the stored decision first. When it is already DENIED, calling getCurrentPosition shows
    // no prompt and fails instantly — the confusing "immediately declined" behaviour — so we skip
    // the call and show recovery guidance. "prompt"/"granted"/"unknown" proceed to the request
    // (the browser shows its own prompt on "prompt").
    const permission = await queryGeolocationPermission();
    if (permission === "denied") {
      setGeoStatus("denied");
      return;
    }

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

  // A blocked status shows the recovery panel; a soft failure (timeout/unavailable) shows a calm
  // one-line message. "requesting" shows neither.
  const blocked = Boolean(geoStatus) && BLOCKED_STATUSES.has(geoStatus);
  const softMessage =
    geoStatus && geoStatus !== "requesting" && !blocked ? geolocationMessage(geoStatus) : null;
  const guidance = blocked ? platformLocationGuidance() : null;

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
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="discovery-location-title"
            className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-elevated-black p-5 space-y-4 safe-bottom sm:inset-x-auto sm:right-4 sm:bottom-auto sm:top-20 sm:w-96 sm:rounded-2xl sm:border"
          >
            <div className="flex items-center justify-between">
              <h3
                id="discovery-location-title"
                ref={headingRef}
                tabIndex={-1}
                className="font-heading text-lg text-ivory outline-none"
              >
                {blocked ? "Allow location access" : "Choose location"}
              </h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-muted-grey hover:text-ivory">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Current location */}
            {!blocked && (
              <button
                type="button"
                onClick={useMyLocation}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-rose-gold/40 text-rose-gold font-body text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition disabled:opacity-60"
              >
                {geoStatus === "requesting" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" strokeWidth={1.4} />}
                {geoStatus === "requesting" ? "Requesting your location…" : "Use my current location"}
              </button>
            )}
            {softMessage && <p role="status" className="font-body text-[0.6rem] text-muted-grey text-center">{softMessage}</p>}

            {/*
              Recovery guidance when location is BLOCKED. We cannot reopen the browser's own prompt
              once it has stored a block, and we say so honestly. "Try again" re-reads the permission
              (so a user who has just allowed it in settings succeeds); the area picker below is the
              "Choose an area instead" path; Escape or "Not now" closes — discovery is never blocked.
            */}
            {blocked && guidance && (
              <div role="alert" className="rounded-xl border border-warning/25 bg-warning/[0.05] p-3.5 space-y-2.5">
                <p className="inline-flex items-center gap-1.5 font-body text-[0.7rem] text-warning">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  {geoStatus === "insecure"
                    ? "Location needs a secure (https) connection here."
                    : geoStatus === "unsupported"
                      ? "This browser can’t share a location."
                      : "Location access is currently blocked for Lustra."}
                </p>
                <p className="font-body text-[0.65rem] text-soft-ivory/80 leading-relaxed">
                  Enable it in your browser or site settings, then return and try again — or choose an
                  area below.
                </p>
                <div>
                  <p className="font-body text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey mb-1">
                    {guidance.platform}
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 font-body text-[0.62rem] text-soft-ivory/75 leading-relaxed">
                    {guidance.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={useMyLocation}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full border border-rose-gold/40 text-rose-gold font-body text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition"
                  >
                    <Navigation className="w-3 h-3" strokeWidth={1.5} /> Try again
                  </button>
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="px-3 py-2 rounded-full border border-white/10 text-soft-ivory/70 font-body text-[0.6rem] tracking-luxe uppercase hover:text-ivory transition"
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}

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
