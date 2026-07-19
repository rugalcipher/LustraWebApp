import React, { useState } from "react";
import { Upload, Check, Image as ImageIcon, Crown, Globe } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card } from "@/components/lustra/Primitives";
import { MEDIA_ITEMS } from "@/mocks/internal";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Portrait", "Editorial", "Lifestyle"];

const STATUS = {
  approved: "text-success border-success/30",
  pending: "text-warning border-warning/30",
};

export default function TalentMediaLibrary() {
  const [items, setItems] = useState(MEDIA_ITEMS);
  const [filter, setFilter] = useState("All");

  const visible = items.filter((i) => filter === "All" || i.category === filter);
  const approve = (id) => setItems((p) => p.map((i) => (i.id === id ? { ...i, status: "approved" } : i)));

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Admin"
        title="Talent Media Library"
        subtitle="Upload, categorize, and approve photography for talent profiles."
      />
      <div className="w-full px-5 lg:px-8 py-6 space-y-5">
        <Card className="p-5 border-dashed border-white/15">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full border border-rose-gold/40 flex items-center justify-center">
              <Upload className="w-4 h-4 text-rose-gold" strokeWidth={1.2} />
            </div>
            <p className="font-heading text-lg text-ivory">Upload media</p>
            <p className="font-body text-[0.65rem] text-muted-grey max-w-xs">
              Drag photographs here or browse. Uploaded items enter pending review before publishing.
            </p>
            <button
              onClick={() =>
                setItems((p) => [
                  { id: `med-${Date.now()}`, talent: "Isabelle", url: "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&q=70", category: "Editorial", status: "pending", visibility: "Public" },
                  ...p,
                ])
              }
              className="mt-2 inline-flex items-center gap-2 text-[0.6rem] tracking-luxe uppercase text-rose-gold/90 hover:text-light-rose-gold font-body"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Browse files
            </button>
          </div>
        </Card>

        <div className="flex items-center gap-2 overflow-x-auto lustra-scroll-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full border text-[0.6rem] tracking-wide-luxe uppercase font-body transition",
                filter === c ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10" : "border-white/10 text-muted-grey hover:text-soft-ivory"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map((m) => (
            <div key={m.id} className="relative aspect-[3/4] rounded-md overflow-hidden border border-white/[0.06] group">
              <img src={m.url} alt="" className="w-full h-full object-cover grayscale-[0.1]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-noir/90 via-transparent to-transparent" />
              <div className="absolute top-2 left-2">
                <span className={cn("text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full bg-noir/70 backdrop-blur-sm", STATUS[m.status])}>
                  {m.status}
                </span>
              </div>
              <div className="absolute top-2 right-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full bg-noir/70 backdrop-blur-sm",
                    m.visibility === "VIPOnly" ? "text-rose-gold border-rose-gold/40" : "text-soft-ivory/70 border-white/15"
                  )}
                >
                  {m.visibility === "VIPOnly" ? (
                    <><Crown className="w-2.5 h-2.5" strokeWidth={1.6} /> VIP</>
                  ) : (
                    <><Globe className="w-2.5 h-2.5" strokeWidth={1.6} /> Public</>
                  )}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-body text-xs text-ivory">{m.talent}</p>
                <p className="font-body text-[0.55rem] tracking-wide-luxe uppercase text-soft-ivory/60 mt-0.5">{m.category}</p>
                {m.status === "pending" && (
                  <button
                    onClick={() => approve(m.id)}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[0.55rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 rounded-sm py-1.5 hover:bg-rose-gold/10 transition"
                  >
                    <Check className="w-3 h-3" /> Approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}