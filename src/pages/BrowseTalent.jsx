import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";
import { Eyebrow } from "@/components/lustra/Primitives";
import { StarDivider } from "@/lib/lustra/Brand";
import TalentCard from "@/components/lustra/TalentCard";
import { useSavedTalent } from "@/layouts/AppShell";
import { TALENT, CITIES } from "@/mocks/talent";

export default function BrowseTalent() {
  const { isSaved, toggle } = useSavedTalent();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");

  const results = useMemo(() => {
    let list = [...TALENT];
    if (query) list = list.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
    if (city) list = list.filter((t) => t.city === city);
    return list;
  }, [query, city]);

  return (
    <div className="lustra-marble min-h-screen">
      <header className="sticky top-0 z-40 bg-noir/85 backdrop-blur-md border-b border-white/[0.05] safe-top">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="text-ivory"><ArrowLeft className="w-5 h-5" strokeWidth={1.4} /></Link>
          <span className="font-heading text-lg text-ivory">Browse Talent</span>
          <span className="w-5" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="text-center mb-8">
          <Eyebrow>Curated Roster</Eyebrow>
          <h1 className="font-heading font-light text-4xl text-ivory mt-2">Discover Talent</h1>
          <div className="mt-5 max-w-xs mx-auto"><StarDivider /></div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-grey" strokeWidth={1.2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="w-full bg-card-black border border-white/[0.08] rounded-sm pl-9 pr-3 py-2.5 text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/40"
            />
          </div>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-card-black border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-soft-ivory/80 focus:outline-none focus:border-rose-gold/40 [color-scheme:dark]"
          >
            <option value="">All cities</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((t) => (
            <TalentCard key={t.id} talent={t} saved={isSaved(t.id)} onToggleSave={toggle} />
          ))}
        </div>
      </div>
    </div>
  );
}