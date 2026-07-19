import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Plus, Check, MapPin } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { useRole } from "@/lib/roleStore";
import { UPCOMING_BOOKINGS } from "@/mocks/internal";
import { cn } from "@/lib/utils";

const SEED_PHOTOS = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=70",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=70",
  "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&q=70",
];

export default function TalentPortal() {
  const { user } = useRole();
  const [available, setAvailable] = useState(true);
  const [photos, setPhotos] = useState(SEED_PHOTOS);

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Talent Portal"
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Manage your availability, photography, and upcoming engagements."
      />
      <div className="max-w-luxe mx-auto px-5 py-6 space-y-6">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <Eyebrow>Status</Eyebrow>
            <p className="font-heading text-2xl text-ivory mt-1">
              {available ? "Available" : "By Request"}
            </p>
            <p className="font-body text-[0.65rem] text-muted-grey mt-1">
              Management sees your live status when reviewing inquiries.
            </p>
          </div>
          <button
            onClick={() => setAvailable((a) => !a)}
            className={cn(
              "relative w-14 h-7 rounded-full border transition",
              available ? "bg-rose-gold/30 border-rose-gold/50" : "bg-card-black border-white/10"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-6 h-6 rounded-full transition-all",
                available ? "left-7 bg-rose-gold" : "left-0.5 bg-muted-grey"
              )}
            />
          </button>
        </Card>

        <Card className="p-4">
          <Eyebrow>Photography</Eyebrow>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-sm overflow-hidden border border-white/[0.06] group">
                <img src={url} alt="" className="w-full h-full object-cover grayscale-[0.1]" />
                <div className="absolute inset-0 bg-noir/0 group-hover:bg-noir/30 transition flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-[0.5rem] tracking-luxe uppercase text-rose-gold">
                    Replace
                  </span>
                </div>
              </div>
            ))}
            <button
              onClick={() => setPhotos((p) => [...p, "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=70"])}
              className="aspect-[3/4] rounded-sm border border-dashed border-white/15 flex flex-col items-center justify-center gap-2 text-muted-grey hover:border-rose-gold/40 hover:text-rose-gold transition"
            >
              <Plus className="w-5 h-5" strokeWidth={1.2} />
              <span className="text-[0.5rem] tracking-luxe uppercase">Upload</span>
            </button>
          </div>
          <p className="font-body text-[0.6rem] text-muted-grey mt-3">
            Uploads enter the <span className="text-rose-gold/80">media library</span> for approval before publishing.
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>Upcoming Engagements</Eyebrow>
            <Link
              to="/app/bookings"
              className="inline-flex items-center gap-1 text-[0.6rem] tracking-luxe uppercase text-rose-gold/80"
            >
              <Calendar className="w-3 h-3" /> All
            </Link>
          </div>
          <div className="space-y-2">
            {UPCOMING_BOOKINGS.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="font-body text-sm text-ivory">{b.engagement}</p>
                  <p className="font-body text-[0.65rem] text-muted-grey mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" strokeWidth={1.2} /> {b.city} · {b.date} · {b.time}
                  </p>
                  <p className="font-body text-[0.6rem] text-muted-grey mt-0.5">Client: {b.client}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-lg text-light-rose-gold">${b.rate.toLocaleString()}</p>
                  <span className="inline-flex items-center gap-1 text-[0.5rem] tracking-wide-luxe uppercase text-success mt-1">
                    <Check className="w-3 h-3" /> Confirmed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}