import React, { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ENGAGEMENT_CATEGORIES, CITIES } from "@/mocks/talent";

const inputCls =
  "bg-deep-black/60 border-white/[0.08] text-ivory placeholder:text-muted-grey/60 focus:border-rose-gold/50";
const selectCls = `${inputCls} w-full`;

export default function TalentOnboarding() {
  const [engagements, setEngagements] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleEng = (e) =>
    setEngagements((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  if (submitted) {
    return (
      <div className="lustra-marble min-h-screen pb-16">
        <InternalHeader eyebrow="Administration" title="Talent Onboarding" />
        <div className="max-w-luxe mx-auto px-5 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full border border-rose-gold/40 flex items-center justify-center mb-5">
            <Check className="w-6 h-6 text-rose-gold" strokeWidth={1.2} />
          </div>
          <p className="font-heading text-2xl text-ivory">Talent registered</p>
          <p className="font-body text-sm text-muted-grey mt-2 max-w-xs">
            The new talent member has been onboarded and added to the moderation queue for profile review.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-6 text-[0.7rem] tracking-luxe uppercase text-rose-gold/90 hover:text-light-rose-gold font-body"
          >
            Onboard another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Administration"
        title="Talent Onboarding"
        subtitle="Register a new talent member into the Lustra roster."
      />
      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        <Card className="p-4">
          <Eyebrow>Personal</Eyebrow>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Full name</Label>
              <Input placeholder="e.g. Clara Voss" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Age</Label>
              <Input type="number" placeholder="25" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Base city</Label>
              <select className={selectCls + " rounded-sm px-3 py-2.5 font-body text-sm"}>
                {CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Languages</Label>
              <Input placeholder="English, French, Italian" className={inputCls} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow>Professional</Eyebrow>
          <div className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Headline</Label>
              <Input placeholder="e.g. Art Curator · Private Companion" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Category</Label>
              <select className={selectCls + " rounded-sm px-3 py-2.5 font-body text-sm"}>
                {["Event Companion", "Brand Ambassador", "Performer", "Travel Host"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Starting rate (USD)</Label>
              <Input type="number" placeholder="1200" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Biography</Label>
              <Textarea placeholder="A refined summary of background, experience, and presence…" rows={4} className={inputCls} />
            </div>
            <div>
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey mb-2 block">Engagement types</Label>
              <div className="flex flex-wrap gap-2">
                {ENGAGEMENT_CATEGORIES.map((e) => {
                  const on = engagements.includes(e);
                  return (
                    <button
                      key={e}
                      onClick={() => toggleEng(e)}
                      className={`text-[0.6rem] tracking-wide-luxe uppercase px-3 py-1.5 rounded-full border transition font-body ${
                        on ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10" : "border-white/10 text-muted-grey hover:text-soft-ivory"
                      }`}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow>Verification</Eyebrow>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">ID document</Label>
              <button className="w-full border border-dashed border-white/15 rounded-sm py-4 text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey hover:border-rose-gold/40 hover:text-rose-gold transition">
                Upload
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">References</Label>
              <Input type="number" placeholder="2" className={inputCls} />
            </div>
          </div>
        </Card>

        <button
          onClick={() => setSubmitted(true)}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body uppercase text-[0.7rem] tracking-luxe py-3.5 rounded-sm hover:opacity-90 transition"
        >
          <UserPlus className="w-3.5 h-3.5" /> Register talent
        </button>
      </div>
    </div>
  );
}