import React from "react";
import { Link } from "react-router-dom";
import { Sparkle, ArrowRight, Lock, Shield, Users, Wand2 } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import { StarDivider, MonogramSeal } from "@/lib/lustra/Brand";
import { LustraVerticalLogo } from "@/components/lustra/BrandLogo";
import ExperienceHero from "@/components/lustra/hero/ExperienceHero";
import { marketingAsset } from "@/components/lustra/public/publicImages";
import { Eyebrow, Heading } from "@/components/lustra/Primitives";
import TalentCard from "@/components/lustra/TalentCard";
import { useSavedTalent } from "@/layouts/AppShell";
import { useFeaturedTalent } from "@/features/discovery/hooks";

const PILLARS = [
  { title: "Members Only", sub: "Exclusive access", icon: Lock },
  { title: "Private Bookings", sub: "Curated companions", icon: Users },
  { title: "Discreet Concierge", sub: "Tailored to you", icon: Wand2 },
];

const STEPS = [
  { n: "I", title: "Browse", body: "Explore a curated roster of approved talent, each represented exclusively by Lustra." },
  { n: "II", title: "Inquire", body: "Submit a private booking inquiry. A dedicated concierge conversation begins immediately." },
  { n: "III", title: "Confirm", body: "Management confirms availability, discusses details, and issues a structured booking summary." },
  { n: "IV", title: "Experience", body: "Your confirmed engagement appears in your calendar. Discretion is assured throughout." },
];

const FAQS = [
  { q: "How do I become a member?", a: "Membership is by invitation. Submit a request for access and our team will review your application personally." },
  { q: "Can I book talent directly?", a: "No. All bookings flow through Lustra management. You inquire, we handle availability, details, and confirmation." },
  { q: "Are displayed rates final?", a: "Displayed rates are starting estimates. Final pricing and availability are confirmed by Lustra management for each engagement." },
  { q: "How is my privacy protected?", a: "Discretion is foundational. No private contact details are exchanged between clients and talent. All communication runs through Lustra." },
];

export default function Landing() {
  const { isSaved, toggle } = useSavedTalent();
  const { talent: featured, isLoading: featuredLoading } = useFeaturedTalent(3);

  return (
    <div className="lustra-marble min-h-screen">
      {/* ---------- Experience Hero (cinematic carousel) ---------- */}
      <ExperienceHero />

      {/* ---------- Pillars ---------- */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex flex-col items-center text-center">
              <Sparkle size={16} className="text-rose-gold mb-4" />
              <p className="font-body text-[0.65rem] tracking-luxe uppercase text-ivory">{p.title}</p>
              <p className="font-body text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey mt-1.5">
                {p.sub}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Featured talent ---------- */}
      <section className="py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <Eyebrow>Curated Talent</Eyebrow>
            <Heading className="mt-3">A Roster, Hand-Selected</Heading>
            <div className="mt-6 max-w-xs mx-auto">
              <StarDivider />
            </div>
          </div>
          {featuredLoading ? (
            // Reserve the grid's height so the page doesn't jump when cards arrive.
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-lg border border-white/[0.06] bg-card-black animate-pulse"
                />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <p className="text-center font-body text-sm text-muted-grey">
              Our roster is being curated. Please check back shortly.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((t) => (
                <TalentCard
                  key={t.id}
                  talent={t}
                  saved={isSaved(t.talentProfileId)}
                  onToggleSave={toggle}
                />
              ))}
            </div>
          )}
          <div className="text-center mt-10">
            <LustraButton as={Link} to="/talent" variant="outline" size="md">
              Browse All Talent <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.2} />
            </LustraButton>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="py-20 px-6 bg-deep-black">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Eyebrow>The Process</Eyebrow>
            <Heading className="mt-3">How Lustra Works</Heading>
          </div>
          <div className="space-y-8">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-5 items-start">
                <span className="font-heading text-2xl text-rose-gold/70 w-8 shrink-0">{s.n}</span>
                <div>
                  <p className="font-body text-sm tracking-wide-luxe uppercase text-ivory">{s.title}</p>
                  <p className="font-body text-sm text-muted-grey mt-1.5 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Discretion ---------- */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img
            src={marketingAsset("safety", 1200)}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-noir/70" />
        </div>
        <div className="relative z-10 max-w-md mx-auto text-center flex flex-col items-center">
          <MonogramSeal size={88} />
          <p className="font-heading font-light text-3xl text-ivory mt-8 leading-snug">
            Discretion,
            <br />
            without compromise.
          </p>
          <p className="font-body text-sm text-soft-ivory/60 mt-5 leading-relaxed">
            Your privacy is our highest priority. No direct contact details are exchanged.
            Every conversation runs through Lustra management.
          </p>
          <div className="mt-8 flex items-center gap-2 text-muted-grey">
            <Shield className="w-4 h-4" strokeWidth={1.2} />
            <Lock className="w-4 h-4" strokeWidth={1.2} />
            <span className="text-[0.55rem] tracking-luxe uppercase">Private · Secure · Vetted</span>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <Eyebrow>Questions</Eyebrow>
            <Heading className="mt-3">Frequently Asked</Heading>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {FAQS.map((f) => (
              <div key={f.q} className="py-5">
                <p className="font-body text-sm tracking-wide-luxe uppercase text-ivory/90">{f.q}</p>
                <p className="font-body text-sm text-muted-grey mt-2 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="py-24 px-6 bg-deep-black border-t border-white/[0.04]">
        <div className="max-w-md mx-auto text-center flex flex-col items-center">
          <LustraVerticalLogo className="h-20 w-auto mx-auto" />
          <p className="font-heading font-light text-2xl text-ivory mt-8 leading-snug">
            Exclusive by design.
            <br />
            Private by choice.
            <br />
            Yours by invitation.
          </p>
          <LustraButton as={Link} to="/request-access" size="lg" className="mt-10">
            Request Access
          </LustraButton>
          <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey mt-6">LUSTRA.APP</p>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="py-10 px-6 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">© 2026 Lustra</p>
          <div className="flex gap-6">
            <Link to="/about" className="text-[0.55rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition">About</Link>
            <Link to="/how-it-works" className="text-[0.55rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition">Process</Link>
            <Link to="/privacy" className="text-[0.55rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition">Privacy</Link>
            <Link to="/terms" className="text-[0.55rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}