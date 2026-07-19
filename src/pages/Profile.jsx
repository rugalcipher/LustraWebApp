import React from "react";
import { Link } from "react-router-dom";
import { Bell, Lock, Shield, LogOut, ChevronRight, Globe } from "lucide-react";
import { useRole } from "@/lib/roleStore";
import { useLogout } from "@/auth/useLogout";
import { Monogram } from "@/lib/lustra/Brand";
import { StarDivider } from "@/lib/lustra/Brand";
import { Eyebrow } from "@/components/lustra/Primitives";

export default function Profile() {
  const { user, isVip } = useRole();
  const logout = useLogout();

  return (
    <div className="px-5 pt-6 pb-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-elevated-black border border-rose-gold/30 flex items-center justify-center">
          <Monogram size={36} />
        </div>
        <p className="font-heading text-2xl text-ivory mt-4">{user.name}</p>
        <p className="text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 mt-1">{user.membership}</p>
        <div className="w-full mt-5"><StarDivider /></div>
      </div>

      {/* Membership card */}
      <div className="mt-6 bg-gradient-to-br from-card-black to-elevated-black border border-rose-gold/20 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <Eyebrow>Membership</Eyebrow>
            <p className="font-heading text-lg text-ivory mt-1">
              {isVip ? "VIP Member" : "Private Member"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {isVip && (
              <span className="text-[0.5rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 bg-rose-gold/10 px-2 py-0.5 rounded-full">
                VIP
              </span>
            )}
            <span className="text-[0.5rem] tracking-luxe uppercase text-success border border-success/30 px-2 py-0.5 rounded-full">Verified</span>
          </div>
        </div>
        <p className="text-[0.6rem] text-muted-grey mt-3">18+ verified · Profile complete · Member since 2026</p>
      </div>

      {/* Sections */}
      <Section title="Account">
        <Row icon={Bell} label="Notifications" />
        <Row icon={Lock} label="Privacy Centre" />
        <Row icon={Globe} label="Saved Locations" />
      </Section>

      <Section title="Security">
        <Row icon={Shield} label="Sessions & Devices" />
        <Row icon={Lock} label="Blocked Profiles" />
      </Section>

      <Section title="Legal">
        <Row label="Terms & Conditions" to="/terms" />
        <Row label="Privacy Policy" to="/privacy" />
        <Row label="Community Standards" to="/safety" />
      </Section>

      <button
        onClick={() => logout()}
        className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 border border-error/30 rounded-sm text-[0.65rem] tracking-luxe uppercase text-error hover:bg-error/5 transition"
      >
        <LogOut className="w-4 h-4" strokeWidth={1.2} /> Sign Out
      </button>

      <p className="text-center text-[0.5rem] tracking-luxe uppercase text-muted-grey/50 mt-6">
        LUSTRA.APP · Desire, Reserved.
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-6">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2 bg-card-black/50 border border-white/[0.06] rounded-lg overflow-hidden divide-y divide-white/[0.04]">
        {children}
      </div>
    </div>
  );
}

/** @param {{ icon?: import("react").ComponentType<any>; label?: import("react").ReactNode; to?: string }} props */
function Row({ icon: Icon, label, to }) {
  const content = (
    <div className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition">
      <span className="flex items-center gap-3 text-sm text-soft-ivory/85 font-body">
        {Icon && <Icon className="w-4 h-4 text-muted-grey" strokeWidth={1.2} />} {label}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-grey" strokeWidth={1.2} />
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}