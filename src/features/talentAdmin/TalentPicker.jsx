import React, { useState } from "react";
import { Search, Loader2, Check, UserRound, X, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { useBookingTalentOptions } from "@/features/appointments/hooks";

/**
 * Choose a talent for an appointment by searching for them.
 *
 * This exists to remove the last place an operator had to paste a GUID. A profile
 * id is not something a person can verify by eye: mistyping one digit silently
 * reassigns an appointment to a different human being, and there is no
 * confirmation step that would catch it. Searching by name and seeing a face makes
 * the mistake visible before it is made.
 *
 * **Reads the booking-scoped endpoint, not the talent roster.** Choosing who to
 * schedule needs only `Bookings.Manage`; the administration roster needs
 * `Talent.View` because it exposes legal names, contact details and account
 * security. A booker filling in a date has no business holding that, so this
 * component must never be pointed back at `/management/talents`.
 *
 * Only the selected `talentProfileId` is submitted; the rest is display.
 *
 * @param {{
 *   value: string | null,
 *   onChange: (talentProfileId: string | null, talent?: object) => void,
 *   label?: string,
 *   excludeProfileId?: string | null,
 *   required?: boolean,
 * }} props
 */
export default function TalentPicker({
  value,
  onChange,
  label = "Talent",
  excludeProfileId = null,
  required = false,
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  // Only search once there is something to search for: an empty query would pull
  // the whole roster into a dropdown nobody asked for.
  const trimmed = query.trim();
  const options = useBookingTalentOptions(
    { query: trimmed || null, pageSize: 10 },
    trimmed.length > 0
  );

  const rows = (options.data?.items ?? []).filter(
    (t) => t.talentProfileId !== excludeProfileId
  );

  // Unavailable talent are hidden by the endpoint's default, but a row that arrives
  // marked non-selectable is still refused here — the server computes assignability
  // from the same rule the booking command enforces, and the UI must not offer a
  // choice that would then be rejected.
  const choose = (talent) => {
    if (!talent.canReceiveNewBooking) return;
    setSelected(talent);
    setQuery("");
    onChange(talent.talentProfileId, talent);
  };

  const clear = () => {
    setSelected(null);
    setQuery("");
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="talent-picker"
        className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey"
      >
        {label}
        {required && <span className="text-rose-gold"> *</span>}
      </label>

      {selected && value ? (
        <div className="flex items-center gap-3 rounded-sm border border-rose-gold/40 bg-rose-gold/[0.06] p-2.5">
          <TalentAvatar talent={selected} />
          <div className="min-w-0 flex-1">
            <p className="font-body text-helper text-ivory truncate">{selected.displayName}</p>
            <p className="font-body text-meta text-muted-grey truncate">
              {describe(selected)}
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            aria-label={`Clear ${selected.displayName}`}
            className="text-muted-grey hover:text-rose-gold shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-grey"
              strokeWidth={1.2}
              aria-hidden="true"
            />
            <input
              id="talent-picker"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              autoComplete="off"
              className="w-full bg-deep-black/60 border border-white/10 rounded-sm pl-9 pr-3 py-2.5 font-body text-body text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50"
            />
          </div>

          {trimmed.length > 0 && (
            <div
              role="listbox"
              aria-label="Matching talent"
              className="max-h-64 overflow-y-auto rounded-sm border border-white/10 divide-y divide-white/[0.06]"
            >
              {options.isPending && (
                <p className="flex items-center gap-2 p-3 font-body text-meta text-muted-grey">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Searching…
                </p>
              )}

              {options.isError && (
                <p className="p-3 font-body text-meta text-destructive" role="alert">
                  {toUserMessage(options.error)}
                </p>
              )}

              {options.isSuccess && rows.length === 0 && (
                <p className="p-3 font-body text-meta text-muted-grey">No talent matches.</p>
              )}

              {rows.map((talent) => {
                const selectable = talent.canReceiveNewBooking;
                return (
                  <button
                    key={talent.talentProfileId}
                    type="button"
                    role="option"
                    aria-selected={value === talent.talentProfileId}
                    aria-disabled={!selectable}
                    disabled={!selectable}
                    onClick={() => choose(talent)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 text-left transition",
                      selectable
                        ? "hover:bg-white/[0.04] focus:outline-none focus-visible:bg-white/[0.06]"
                        : "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <TalentAvatar talent={talent} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-body text-helper text-ivory truncate">
                        {talent.displayName}
                      </span>
                      <span className="block font-body text-meta text-muted-grey truncate">
                        {describe(talent)}
                      </span>
                      {/* The server's own words for why not, rather than a guess. */}
                      {!selectable && talent.unavailableReason && (
                        <span className="mt-0.5 flex items-center gap-1 font-body text-meta text-warning">
                          <Ban className="w-3 h-3 shrink-0" aria-hidden="true" />
                          {talent.unavailableReason}
                        </span>
                      )}
                    </span>
                    {value === talent.talentProfileId && (
                      <Check className="w-4 h-4 text-rose-gold shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The talent's approved public cover, or a neutral placeholder.
 *
 * A missing cover is ordinary — an unpublished talent may have no approved public
 * photograph at all — so it renders an icon rather than a broken image.
 */
function TalentAvatar({ talent }) {
  if (!talent.coverImage?.url) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-white/[0.06]">
        <UserRound className="w-4 h-4 text-muted-grey" aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={talent.coverImage.url}
      srcSet={talent.coverImage.srcSet ?? undefined}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className="h-9 w-9 shrink-0 rounded-sm object-cover"
    />
  );
}

/** The one-line summary under a name. Public marketing state only. */
function describe(talent) {
  return [
    talent.cityName,
    talent.profileStatus,
    talent.isPublished ? "Published" : "Not published",
  ]
    .filter(Boolean)
    .join(" · ");
}
