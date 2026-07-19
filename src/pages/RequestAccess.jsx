import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import PublicPageLayout from "@/components/lustra/public/PublicPageLayout";
import { MarketingIntro } from "@/components/lustra/public/MarketingBlocks";
import { PUBLIC_IMAGES } from "@/components/lustra/public/publicImages";

/**
 * Membership / Request Access — a premium invitation experience. The form is
 * embedded in the shared cinematic PublicPageLayout (image-led, public header)
 * rather than sitting raw on a dark background.
 */
export default function RequestAccess() {
  const [form, setForm] = useState({ name: "", email: "", city: "", referral: "", agree: false });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.agree || !form.email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1100);
  };

  return (
    <PublicPageLayout image={PUBLIC_IMAGES.membership} footerNote="Private by Design">
      {submitted ? (
        <div className="max-w-md">
          <div className="w-16 h-16 rounded-full border border-rose-gold/40 flex items-center justify-center">
            <Check className="w-7 h-7 text-rose-gold" strokeWidth={1.2} />
          </div>
          <h1 className="font-heading font-light text-4xl text-ivory mt-6">Application Received</h1>
          <p className="font-body text-sm text-soft-ivory/70 mt-4 leading-relaxed">
            Thank you, {form.name || "guest"}. Our membership team reviews each application personally. If your
            request is approved, you will receive an invitation to complete your registration.
          </p>
          <div className="mt-6 p-4 bg-card-black/60 border border-rose-gold/20 rounded-md">
            <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">Reference</p>
            <p className="font-heading text-lg text-light-rose-gold mt-1">
              LUSTRA-{Math.random().toString(36).slice(2, 8).toUpperCase()}
            </p>
          </div>
          <LustraButton as={Link} to="/" variant="outline" size="md" className="mt-8">
            Return Home
          </LustraButton>
        </div>
      ) : (
        <>
          <MarketingIntro eyebrow="By Invitation" title="Membership by Invitation" />
          <p className="mt-6 font-body text-base text-soft-ivory/75 leading-relaxed max-w-xl">
            Lustra is a private network of exceptional individuals. Submit your request and our team will respond
            discreetly.
          </p>

          <form onSubmit={submit} className="mt-9 max-w-md space-y-4">
            <Input label="Full Name" value={form.name} onChange={(v) => set("name", v)} placeholder="Your full name" />
            <Input label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@email.com" required />
            <Input label="City" value={form.city} onChange={(v) => set("city", v)} placeholder="Your city" />
            <div>
              <label className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-1.5 block">Referral (optional)</label>
              <textarea
                value={form.referral}
                onChange={(e) => set("referral", e.target.value)}
                rows={2}
                placeholder="How did you hear about Lustra?"
                className="w-full bg-card-black border border-white/[0.08] rounded-sm px-3.5 py-3 text-sm text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 resize-none transition"
              />
            </div>

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} className="accent-rose-gold w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-[0.65rem] text-muted-grey leading-relaxed">
                I confirm I am over 21 and agree to be contacted regarding membership. I understand exclusivity is at
                our discretion.
              </span>
            </label>

            <LustraButton type="submit" disabled={!form.agree || loading} size="lg" className="w-full">
              {loading ? "Submitting…" : "Request Access"}
            </LustraButton>
          </form>
        </>
      )}
    </PublicPageLayout>
  );
}

/** @param {{ label?: string; value?: string; onChange?: (v: string) => void; placeholder?: string; type?: string; required?: boolean }} props */
function Input({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div>
      <label className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-card-black border border-white/[0.08] rounded-sm px-3.5 py-3 text-sm text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 transition"
      />
    </div>
  );
}
