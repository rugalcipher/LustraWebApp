import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowLeft, Loader2 } from "lucide-react";
import { Eyebrow } from "@/components/lustra/Primitives";
import { StarDivider } from "@/lib/lustra/Brand";
import TalentCard from "@/components/lustra/TalentCard";
import DiscoveryGate from "@/components/lustra/immersive/DiscoveryGate";
import LocationPicker from "@/components/lustra/immersive/LocationPicker";
import { useSavedTalent } from "@/layouts/AppShell";
import { useDiscoverySearch, useCities } from "@/features/discovery/hooks";
import { useDiscoveryUiStore } from "@/stores/discoveryUiStore";
import { toUserMessage } from "@/api/problemDetails";

/**
 * The public roster grid. Guests may browse without signing in; the server decides how
 * much of the roster they see, and returns a structured gate when a policy applies.
 */
export default function BrowseTalent() {
  const { isSaved, toggle } = useSavedTalent();
  const { data: cities = [] } = useCities();

  const appliedFilters = useDiscoveryUiStore((s) => s.appliedFilters);
  const setQuery = useDiscoveryUiStore((s) => s.setQuery);
  const setDraftFilters = useDiscoveryUiStore((s) => s.setDraftFilters);
  const applyFilters = useDiscoveryUiStore((s) => s.applyFilters);

  // Local mirror so typing feels instant; the store (and the query) is debounced.
  const [queryText, setQueryText] = useState(appliedFilters.query);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(queryText), 200);
    return () => clearTimeout(timer);
  }, [queryText, setQuery]);

  const search = useDiscoverySearch({ pageSize: 48 });

  const onCityChange = (cityId) => {
    setDraftFilters({ cityId: cityId || null });
    applyFilters();
  };

  return (
    <div className="lustra-marble min-h-screen">
      <header className="sticky top-0 z-40 bg-noir/85 backdrop-blur-md border-b border-white/[0.05] safe-top">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="text-ivory" aria-label="Home">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.4} />
          </Link>
          <span className="font-heading text-lg text-ivory">Browse Talent</span>
          <span className="w-5" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="text-center mb-8">
          <Eyebrow>Curated Roster</Eyebrow>
          <h1 className="font-heading font-light text-4xl text-ivory mt-2">Discover Talent</h1>
          <div className="mt-5 max-w-xs mx-auto">
            <StarDivider />
          </div>
        </div>

        {search.gate ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <DiscoveryGate gate={search.gate} />
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-grey"
                  strokeWidth={1.2}
                />
                <input
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Search by name, headline or city"
                  className="w-full bg-card-black border border-white/[0.08] rounded-sm pl-9 pr-3 py-2.5 text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/40"
                />
              </div>
              <select
                value={appliedFilters.cityId ?? ""}
                onChange={(e) => onCityChange(e.target.value)}
                className="bg-card-black border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-soft-ivory/80 focus:outline-none focus:border-rose-gold/40 [color-scheme:dark]"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-8">
              <LocationPicker compact />
            </div>

            {search.isLoading ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
              </div>
            ) : search.isError ? (
              <p className="py-24 text-center font-body text-sm text-muted-grey">
                {toUserMessage(search.error)}
              </p>
            ) : search.talent.length === 0 ? (
              <p className="py-24 text-center font-body text-sm text-muted-grey">
                No talent matches those filters yet.
              </p>
            ) : (
              <>
                <p className="mb-4 font-body text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">
                  {search.totalCount} {search.totalCount === 1 ? "profile" : "profiles"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {search.talent.map((t) => (
                    <TalentCard
                      key={t.id}
                      talent={t}
                      saved={isSaved(t.talentProfileId)}
                      onToggleSave={toggle}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
