import React, { useState } from "react";
import { Plus, Trash2, Tag, Globe, Sparkles, MapPin } from "lucide-react";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { Input } from "@/components/ui/input";

const SEED = {
  "Talent Categories": ["Event Companion", "Brand Ambassador", "Performer", "Travel Host", "Gala Host"],
  "Engagement Types": ["Private Dinner", "Brand Event", "Gala Hosting", "Wine Tasting", "Private Performance", "Weekend Escape"],
  "Skills": ["Conversation", "Wine Pairing", "Public Speaking", "Languages", "Hosting"],
  "Interests": ["Art", "Opera", "Cuisine", "Travel", "Fashion", "Literature"],
  "Languages": ["English", "French", "Italian", "Spanish", "German", "Portuguese"],
  "Personality Tags": ["Warm", "Discreet", "Charismatic", "Sophisticated", "Calm"],
  "Cities": ["New York", "Paris", "London", "Milan", "Rome", "Monaco", "Vienna", "Madrid"],
  "Venue Types": ["Private Residence", "Hotel Suite", "Gallery", "Restaurant", "Yacht", "Vineyard"],
};

const inputCls =
  "bg-deep-black/60 border-white/[0.08] text-ivory placeholder:text-muted-grey/60 focus:border-rose-gold/50";

const ICONS = {
  "Talent Categories": Tag,
  "Engagement Types": Sparkles,
  "Skills": Sparkles,
  "Interests": Sparkles,
  "Languages": Globe,
  "Personality Tags": Sparkles,
  "Cities": MapPin,
  "Venue Types": MapPin,
};

export default function AdminPlatform() {
  const [data, setData] = useState(SEED);
  const [drafts, setDrafts] = useState({});

  const add = (category) => {
    const val = (drafts[category] || "").trim();
    if (!val) return;
    setData((d) => ({ ...d, [category]: [...d[category], val] }));
    setDrafts((p) => ({ ...p, [category]: "" }));
  };
  const remove = (category, item) =>
    setData((d) => ({ ...d, [category]: d[category].filter((x) => x !== item) }));

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Eyebrow>Administrator</Eyebrow>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">Platform Taxonomy</h1>
        <p className="font-body text-sm text-muted-grey mt-2">
          Manage the controlled vocabularies that power discovery, filtering, and onboarding.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {Object.entries(data).map(([category, items]) => {
          const Icon = ICONS[category] || Tag;
          return (
            <Card key={category} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-rose-gold/70" strokeWidth={1.2} />
                <Eyebrow>{category}</Eyebrow>
                <span className="ml-auto text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">{items.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {items.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 text-[0.6rem] tracking-wide-luxe uppercase px-2.5 py-1 border border-white/10 text-soft-ivory/80 rounded-full font-body"
                  >
                    {item}
                    <button
                      onClick={() => remove(category, item)}
                      className="text-muted-grey hover:text-error transition"
                      aria-label={`Remove ${item}`}
                    >
                      <Trash2 className="w-2.5 h-2.5" strokeWidth={1.5} />
                    </button>
                  </span>
                ))}
                {items.length === 0 && (
                  <p className="text-[0.6rem] text-muted-grey/60 font-body py-1">No items.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={drafts[category] || ""}
                  onChange={(e) => setDrafts((p) => ({ ...p, [category]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && add(category)}
                  placeholder={`Add ${category.toLowerCase()}…`}
                  className={inputCls}
                />
                <button
                  onClick={() => add(category)}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-sm border border-rose-gold/40 text-rose-gold hover:bg-rose-gold/10 transition"
                  aria-label="Add"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.2} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 mt-5">
        <Eyebrow>CMS Pages</Eyebrow>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {["About", "How It Works", "Privacy", "Terms", "Safety", "FAQ"].map((p) => (
            <button
              key={p}
              className="text-left p-3 rounded-sm border border-white/[0.06] bg-deep-black/40 hover:border-rose-gold/40 transition"
            >
              <p className="font-body text-xs text-soft-ivory/80">{p}</p>
              <p className="font-body text-[0.55rem] text-muted-grey mt-1">Published</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}