import React from "react";
import { Heart } from "lucide-react";
import { Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import TalentCard from "@/components/lustra/TalentCard";
import { useSavedTalent } from "@/layouts/AppShell";
import { getTalent } from "@/mocks/talent";
import { Link } from "react-router-dom";

export default function Saved() {
  const { saved, toggle, isSaved } = useSavedTalent();
  const list = saved.map(getTalent).filter(Boolean);

  return (
    <div className="px-5 pt-6">
      <Eyebrow>Your Collection</Eyebrow>
      <h1 className="font-heading font-light text-3xl text-ivory mt-1">Saved</h1>

      {list.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          body="Tap the heart on any profile to keep it in your private collection."
          action={
            <Link to="/app/discover" className="text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition">
              Discover Talent
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-5">
          {list.map((t) => (
            <TalentCard key={t.id} talent={t} saved={isSaved(t.id)} onToggleSave={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}