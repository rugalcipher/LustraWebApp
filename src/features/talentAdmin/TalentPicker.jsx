import React, { useState } from "react";
import { Search, Loader2, Check, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { useTalentRoster, useTalentAdminPermissions } from "@/features/talentAdmin/hooks";

/**
 * Choose a talent by searching for them.
 *
 * This exists to remove the last place an operator had to paste a GUID. A
 * profile id is not something a person can verify by eye: mistyping one digit
 * silently reassigns an appointment to a different human being, and there is no
 * confirmation step that would catch it. Searching by name and seeing a face
 * makes the mistake visible before it is made.
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
  const { canView } = useTalentAdminPermissions();

  // Only search once there is something to search for: an empty query would pull
  // the whole roster into a dropdown nobody asked for.
  const roster = useTalentRoster({ query: query.trim() || null, pageSize: 10 }, query.trim().length > 0);

  const rows = (roster.data?.items ?? []).filter(
    (t) => t.talentProfileId !== excludeProfileId
  );

  const choose = (talent) => {
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
          <UserRound className="w-4 h-4 text-rose-gold shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-body text-helper text-ivory truncate">{selected.displayName}</p>
            <p className="font-body text-meta text-muted-grey truncate">
              {[selected.cityName, selected.profileStatus, selected.isPublic ? "Published" : "Not published"]
                .filter(Boolean)
                .join(" · ")}
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
      ) : !canView ? (
        // Searching the roster needs Talent.View, which the server enforces on
        // GET /management/talents. Say so rather than showing a box that
        // silently finds nothing.
        <p className="rounded-sm border border-warning/30 bg-warning/[0.06] p-3 font-body text-meta text-warning">
          You need permission to view talent before you can choose one here.
        </p>
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
              placeholder="Search by name, slug or email…"
              autoComplete="off"
              className="w-full bg-deep-black/60 border border-white/10 rounded-sm pl-9 pr-3 py-2.5 font-body text-body text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50"
            />
          </div>

          {query.trim().length > 0 && (
            <div
              role="listbox"
              aria-label="Matching talent"
              className="max-h-64 overflow-y-auto rounded-sm border border-white/10 divide-y divide-white/[0.06]"
            >
              {roster.isPending && (
                <p className="flex items-center gap-2 p-3 font-body text-meta text-muted-grey">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Searching…
                </p>
              )}

              {roster.isError && (
                <p className="p-3 font-body text-meta text-destructive" role="alert">
                  {toUserMessage(roster.error)}
                </p>
              )}

              {roster.isSuccess && rows.length === 0 && (
                <p className="p-3 font-body text-meta text-muted-grey">No talent matches.</p>
              )}

              {rows.map((talent) => (
                <button
                  key={talent.talentProfileId}
                  type="button"
                  role="option"
                  aria-selected={value === talent.talentProfileId}
                  onClick={() => choose(talent)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 text-left transition",
                    "hover:bg-white/[0.04] focus:outline-none focus-visible:bg-white/[0.06]"
                  )}
                >
                  <UserRound className="w-4 h-4 text-muted-grey shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-body text-helper text-ivory truncate">
                      {talent.displayName}
                    </span>
                    <span className="block font-body text-meta text-muted-grey truncate">
                      {[
                        talent.cityName,
                        talent.profileStatus,
                        talent.isPublic ? "Published" : "Not published",
                        talent.accountStatus,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {value === talent.talentProfileId && (
                    <Check className="w-4 h-4 text-rose-gold shrink-0" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
