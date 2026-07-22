import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";
import AddressFields from "@/components/address/AddressFields";
import {
  createPlacesSessionToken,
  extractStructuredAddress,
  fetchAddressSuggestions,
  fetchPlaceDetails,
  isGoogleMapsConfigured,
} from "@/services/googlePlaces";
import { EMPTY_ADDRESS_INPUT, formatAddressLine } from "@/domain/address";

/**
 * The one address selector used across every real address form.
 *
 * A Google Places search sits on top of the shared {@link AddressFields}. Picking a suggestion
 * fills the structured model and marks the address *verified* (a green tick). The manual detail
 * fields — line 2, building, unit, access instructions — always stay editable and are never
 * overwritten by a selection.
 *
 * A typed string is not a verified address. The moment the user edits the search text after a
 * selection, the Google place id and coordinates are cleared and the address reverts to
 * *unverified* — it is never silently submitted as the old pick. For workflows that must have a
 * real Google location, pass `requireVerified`; the parent disables submission via
 * {@link isAddressVerified}.
 *
 * Degrades safely: with no API key, or if the script/API fails, it falls back to full manual
 * entry (legacy addresses still display and remain editable) — a Google outage never destroys a
 * draft. Inputs inherit the app's ≥16px mobile sizing (no iOS zoom); the listbox is keyboard-
 * and screen-reader-navigable.
 *
 * @param {{
 *   value: import("@/domain/address").StructuredAddressInput,
 *   onChange: (next: import("@/domain/address").StructuredAddressInput) => void,
 *   label?: string,
 *   placeholder?: string,
 *   errors?: Record<string, string>,
 *   idPrefix?: string,
 *   requireVerified?: boolean,
 *   disabled?: boolean,
 * }} props
 */

/** True when the address is a confirmed Google selection (place id present). */
export function isAddressVerified(value) {
  return Boolean(value && value.googlePlaceId);
}

// Fields that describe *where* the place is. Editing any of them by hand no longer matches the
// Google selection, so verification (place id + coordinates) is dropped. The manual detail
// fields are deliberately absent — they never invalidate a verified selection.
const LOCATING_FIELDS = new Set(["addressLine1", "suburb", "city", "province", "postalCode", "countryCode"]);

const DEBOUNCE_MS = 250;

export default function AddressAutocomplete({
  value,
  onChange,
  label = "Address",
  placeholder = "Start typing an address…",
  errors = {},
  idPrefix = "addr",
  requireVerified = false,
  disabled = false,
}) {
  const configured = isGoogleMapsConfigured();
  const verified = isAddressVerified(value);
  const hasContent = useMemo(() => Boolean(formatAddressLine({ ...value, isGoogleVerified: verified })), [value, verified]);

  // When Google is unavailable, or the current value is an unverified legacy address with
  // content, open the manual fields so nothing is hidden or lost.
  const [manualOpen, setManualOpen] = useState(() => !configured || (hasContent && !verified));
  // `search` is what the user sees in the Google box. It tracks the selected address until they
  // start typing, at which point it becomes their free query.
  const [search, setSearch] = useState(() => (verified ? formatAddressLine({ ...value, isGoogleVerified: true }) : ""));
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | error | no-results
  const [activeIndex, setActiveIndex] = useState(-1);

  const sessionRef = useRef(null);
  const debounceRef = useRef(null);
  const seqRef = useRef(0);
  const listboxId = `${useId()}-listbox`;

  // Keep the search box in step when a verified value arrives from outside (e.g. an edit form
  // that finished loading). We only sync toward the formatted address on verification changes,
  // never clobbering what the user is actively typing.
  useEffect(() => {
    if (verified) setSearch(formatAddressLine({ ...value, isGoogleVerified: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.googlePlaceId]);

  const runSearch = useCallback(
    (query) => {
      const seq = ++seqRef.current;
      setStatus("loading");
      fetchAddressSuggestions(query, { sessionToken: sessionRef.current ?? undefined })
        .then((results) => {
          if (seq !== seqRef.current) return; // a newer keystroke won
          setSuggestions(results);
          setStatus(results.length === 0 ? "no-results" : "idle");
          setActiveIndex(-1);
          setOpen(true);
        })
        .catch(() => {
          if (seq !== seqRef.current) return;
          // Any failure (missing key, script error, API/auth failure) → manual entry, draft intact.
          setSuggestions([]);
          setStatus("error");
          setOpen(false);
          setManualOpen(true);
        });
    },
    []
  );

  const onSearchChange = (event) => {
    const next = event.target.value;
    setSearch(next);

    // Editing the search text invalidates any prior verified selection (Section 5). Manual
    // detail fields are preserved.
    if (verified) {
      onChange({ ...value, googlePlaceId: null, latitude: null, longitude: null });
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = next.trim();
    if (query.length < 3) {
      seqRef.current++; // cancel any in-flight result
      setSuggestions([]);
      setStatus("idle");
      setOpen(false);
      return;
    }
    if (!sessionRef.current) sessionRef.current = createPlacesSessionToken();
    debounceRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
  };

  const select = async (suggestion) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    seqRef.current++; // ignore any pending suggestion results
    setOpen(false);
    setStatus("loading");
    try {
      const place = await fetchPlaceDetails(suggestion.placeId, { sessionToken: sessionRef.current ?? undefined });
      const extracted = extractStructuredAddress(place);
      // Preserve the user's manual detail fields; take the located fields from Google.
      onChange({
        ...value,
        ...extracted,
        addressLine2: value.addressLine2 ?? null,
        buildingName: extracted.buildingName ?? value.buildingName ?? null,
        unitNumber: extracted.unitNumber ?? value.unitNumber ?? null,
        accessInstructions: value.accessInstructions ?? null,
      });
      setSearch(extracted.formattedAddress || suggestion.description);
      setStatus("idle");
    } catch {
      setStatus("error");
      setManualOpen(true);
    } finally {
      sessionRef.current = null; // one session per selection
    }
  };

  const clear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    seqRef.current++;
    setSearch("");
    setSuggestions([]);
    setStatus("idle");
    setOpen(false);
    sessionRef.current = null;
    onChange({ ...EMPTY_ADDRESS_INPUT });
  };

  const onKeyDown = (event) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      select(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  // Field-level manual edits from AddressFields. Editing a locating field drops verification.
  const onFieldChange = (field, val) => {
    const next = { ...value, [field]: val };
    if (LOCATING_FIELDS.has(field) && verified) {
      next.googlePlaceId = null;
      next.latitude = null;
      next.longitude = null;
    }
    onChange(next);
  };

  const inputId = `${idPrefix}-search`;
  const showRequiredHint = requireVerified && !verified && hasContent;

  return (
    <div className="space-y-3">
      {configured && (
        <div className="space-y-1.5">
          <label htmlFor={inputId} className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
            {label}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-grey">
              {status === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="w-4 h-4" aria-hidden="true" />
              )}
            </div>
            <input
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
              autoComplete="off"
              disabled={disabled}
              value={search}
              onChange={onSearchChange}
              onKeyDown={onKeyDown}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              placeholder={placeholder}
              className="w-full bg-deep-black/60 border border-white/10 rounded-sm pl-10 pr-10 py-2.5 font-body text-body text-ivory placeholder:text-muted-grey/70 focus:outline-none focus:border-rose-gold/50"
            />
            {(search || verified) && (
              <button
                type="button"
                onClick={clear}
                aria-label="Clear address"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-grey hover:text-ivory"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}

            {open && suggestions.length > 0 && (
              <ul
                id={listboxId}
                role="listbox"
                className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-sm border border-white/10 bg-elevated-black shadow-xl"
              >
                {suggestions.map((s, i) => (
                  <li
                    key={s.placeId}
                    id={`${listboxId}-opt-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(s);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`cursor-pointer px-3 py-2.5 flex items-start gap-2 ${
                      i === activeIndex ? "bg-rose-gold/15" : "hover:bg-white/[0.04]"
                    }`}
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

          {/* Verified / unverified state, and the safe fallbacks. */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p aria-live="polite" className="font-body text-meta">
              {verified ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Verified address
                </span>
              ) : hasContent ? (
                <span className="text-warning">Unverified — select a suggestion to confirm</span>
              ) : status === "no-results" ? (
                <span className="text-muted-grey">No matches — enter it manually below</span>
              ) : status === "error" ? (
                <span className="text-warning">Address search is unavailable — enter it manually below</span>
              ) : (
                <span className="text-muted-grey">Search, or enter the address manually</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setManualOpen((o) => !o)}
              className="font-body text-meta tracking-luxe uppercase text-rose-gold/80 hover:text-rose-gold"
            >
              {manualOpen ? "Hide manual entry" : "Enter manually"}
            </button>
          </div>

          {showRequiredHint && (
            <p role="alert" className="font-body text-meta text-error">
              Please select an address from the suggestions.
            </p>
          )}
        </div>
      )}

      {!configured && (
        <p className="font-body text-meta text-muted-grey">
          Enter the address below.
        </p>
      )}

      {/* Manual entry: the full structured form when open (fallback / legacy / "edit manually"),
          otherwise just the detail fields that Google never fills. */}
      <AddressFields
        value={value}
        onChange={onFieldChange}
        errors={errors}
        idPrefix={idPrefix}
        variant={manualOpen ? "full" : "details"}
      />
    </div>
  );
}
