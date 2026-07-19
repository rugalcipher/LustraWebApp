import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Lock, Calendar, Clock, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarDivider } from "@/lib/lustra/Brand";
import { Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { getTalent, ENGAGEMENT_CATEGORIES } from "@/mocks/talent";

export default function Inquiry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const talent = getTalent(id);
  const [form, setForm] = useState({
    engagement: talent?.engagements[0] || ENGAGEMENT_CATEGORIES[0],
    date: "",
    altDate: "",
    time: "",
    duration: "",
    city: talent?.city || "",
    venue: "",
    attendees: "",
    travel: false,
    message: "",
    agree: false,
  });
  const [submitting, setSubmitting] = useState(false);

  if (!talent) {
    return (
      <div className="px-6 py-32 text-center">
        <p className="font-heading text-2xl text-ivory">Talent not found</p>
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.agree) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      navigate("/app/messages", { state: { newInquiry: { talent, ...form } } });
    }, 900);
  };

  return (
    <div className="lustra-marble min-h-screen">
      <header className="sticky top-0 z-40 bg-noir/85 backdrop-blur-md border-b border-white/[0.05] safe-top">
        <div className="max-w-luxe mx-auto px-5 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-ivory">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.4} />
          </button>
          <span className="font-heading text-lg text-ivory">Booking Inquiry</span>
          <span className="w-5" />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-luxe mx-auto px-5 py-6 pb-32">
        {/* Talent summary */}
        <div className="flex items-center gap-3 mb-6">
          <img src={talent.cover} alt={talent.name} className="w-14 h-14 rounded-full object-cover border border-rose-gold/30" />
          <div>
            <p className="font-heading text-xl text-ivory leading-none">{talent.name}</p>
            <p className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey mt-1">{talent.headline}</p>
          </div>
        </div>

        <StarDivider label="Inquiry Details" />

        {/* Engagement */}
        <div className="mt-6">
          <Eyebrow>Engagement Type</Eyebrow>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {talent.engagements.map((eng) => (
              <button
                key={eng}
                type="button"
                onClick={() => set("engagement", eng)}
                className={cn(
                  "py-2.5 px-3 text-[0.6rem] tracking-wide-luxe uppercase rounded-sm border transition text-left",
                  form.engagement === eng ? "border-rose-gold/50 text-rose-gold bg-rose-gold/5" : "border-white/[0.08] text-soft-ivory/70"
                )}
              >
                {eng}
              </button>
            ))}
          </div>
        </div>

        {/* Date / time */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Field label="Preferred Date" icon={Calendar}>
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Preferred Time" icon={Clock}>
            <input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Alternative Date" icon={Calendar}>
            <input type="date" value={form.altDate} onChange={(e) => set("altDate", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Est. Duration" icon={Clock}>
            <input value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="e.g. 4 hours" className={inputCls} />
          </Field>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="City" icon={MapPin}>
            <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" className={inputCls} />
          </Field>
          <Field label="Venue Type" icon={MapPin}>
            <input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. Private residence" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Attendees" icon={Users}>
            <input type="number" min="1" value={form.attendees} onChange={(e) => set("attendees", e.target.value)} placeholder="Optional" className={inputCls} />
          </Field>
          <div className="flex items-end">
            <label className={cn("flex items-center gap-2 text-[0.65rem] tracking-wide-luxe uppercase cursor-pointer py-2.5", form.travel ? "text-rose-gold" : "text-soft-ivory/70")}>
              <input type="checkbox" checked={form.travel} onChange={(e) => set("travel", e.target.checked)} className="accent-rose-gold w-3.5 h-3.5" />
              Travel required
            </label>
          </div>
        </div>

        {/* Message */}
        <div className="mt-5">
          <Eyebrow>Your Message to Management</Eyebrow>
          <textarea
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            rows={4}
            placeholder="Share the nature of your engagement, tone, and any specific requests…"
            className="w-full mt-3 bg-card-black border border-white/[0.08] rounded-sm px-3 py-3 text-sm font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 resize-none transition"
          />
        </div>

        {/* Agreement */}
        <label className="flex items-start gap-2.5 mt-5 cursor-pointer">
          <input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} className="accent-rose-gold w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-[0.65rem] text-muted-grey leading-relaxed font-body">
            I understand this is an inquiry, not a confirmed booking. All arrangements are handled discreetly by Lustra management. I agree to the{" "}
            <Link to="/terms" className="text-rose-gold underline">Terms</Link> and{" "}
            <Link to="/privacy" className="text-rose-gold underline">Privacy Policy</Link>.
          </span>
        </label>

        <p className="text-[0.6rem] text-muted-grey flex items-center gap-1.5 mt-5">
          <Lock className="w-3 h-3" strokeWidth={1.2} /> All interactions are private and discreet.
        </p>
      </form>

      {/* Submit bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-noir/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom">
        <div className="max-w-luxe mx-auto px-5 py-3">
          <LustraButton
            onClick={handleSubmit}
            disabled={!form.agree || submitting}
            size="lg"
            className="w-full"
          >
            {submitting ? "Sending…" : "Send Inquiry"}
          </LustraButton>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-card-black border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 transition [color-scheme:dark]";

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-1.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" strokeWidth={1.2} />} {label}
      </label>
      {children}
    </div>
  );
}