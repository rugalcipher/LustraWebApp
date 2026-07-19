import React from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Crown } from "lucide-react";
import { useDevPreview } from "@/auth/devPreview";
import { ROLES, ROLE_HOME, ROLE_LABELS, GUEST } from "@/domain/roles";
import { MEMBERSHIP_TIER } from "@/domain/entitlements";
import { LustraHorizontalLogo } from "@/components/lustra/BrandLogo";
import { cn } from "@/lib/utils";

const DESCRIPTIONS = {
  client: "Verified member who discovers talent, saves profiles, and submits inquiries.",
  talent: "Represented talent managing availability, media, and engagements.",
  management: "Concierge staff handling inquiries, proposals, clients, and moderation.",
  admin: "Executive oversight of users, platform taxonomy, and operations.",
  superadmin: "Full platform authority, including administrator management.",
};

/**
 * Development-only preview hub. Assumes any role via the dev-preview overlay
 * (never the real principal). If you arrived from an unauthorized redirect, the
 * originally attempted route resumes once the chosen role is permitted.
 */
export default function DevRoles() {
  const dev = useDevPreview();
  const navigate = useNavigate();
  const location = useLocation();

  if (!dev.enabled) {
    return <Navigate to="/" replace />;
  }

  const from = location.state?.from;
  const current = dev.role || GUEST;
  const isVip = dev.membershipTier === MEMBERSHIP_TIER.Vip;

  const enterAs = (r) => {
    dev.setRole(r);
    const home = ROLE_HOME[r] || "/";
    navigate(from || home, { replace: true });
  };

  return (
    <div className="lustra-marble min-h-screen safe-top safe-bottom">
      <header className="max-w-3xl mx-auto px-5 pt-10 pb-6">
        <Link to="/" aria-label="Lustra home" className="inline-flex items-center">
          <LustraHorizontalLogo className="h-7 w-auto" eager />
        </Link>
        <p className="mt-8 font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/80">
          Development · Preview
        </p>
        <h1 className="mt-2 font-heading font-light text-4xl text-ivory leading-tight">Assume a role</h1>
        <p className="mt-3 font-body text-sm text-muted-grey max-w-md leading-relaxed">
          Preview the platform from any role. This overlays a development-only
          preview principal; it never changes a real signed-in user and is
          disabled in production builds.
          {from && (
            <span className="block mt-2 text-rose-gold/80">
              You'll resume to <span className="font-mono">{from}</span> if permitted.
            </span>
          )}
        </p>

        {/* VIP entitlement toggle (Client only) */}
        <div className="mt-5 inline-flex items-center gap-3 rounded-md border border-rose-gold/20 bg-card-black/60 px-4 py-2.5">
          <Crown className="w-4 h-4 text-rose-gold" strokeWidth={1.4} />
          <span className="font-body text-[0.65rem] tracking-luxe uppercase text-soft-ivory/80">
            Client VIP membership
          </span>
          <button
            onClick={() =>
              dev.setMembershipTier(isVip ? MEMBERSHIP_TIER.Standard : MEMBERSHIP_TIER.Vip)
            }
            className={cn(
              "ml-1 text-[0.6rem] tracking-luxe uppercase px-3 py-1 rounded-full border transition font-body",
              isVip
                ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                : "border-white/10 text-muted-grey hover:text-soft-ivory"
            )}
          >
            {isVip ? "VIP · On" : "VIP · Off"}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 pb-16 grid gap-3">
        {ROLES.map((r) => {
          const active = current === r;
          return (
            <div
              key={r}
              className={cn(
                "rounded-md border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition",
                active ? "bg-card-black border-rose-gold/40" : "bg-card-black/60 border-white/[0.06]"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl text-ivory">{ROLE_LABELS[r]}</h2>
                  {active && (
                    <span className="inline-flex items-center gap-1 text-[0.5rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/30 rounded-full px-1.5 py-0.5">
                      <Check className="w-2.5 h-2.5" strokeWidth={2} /> Current
                    </span>
                  )}
                </div>
                <p className="mt-1 font-body text-sm text-muted-grey leading-relaxed">{DESCRIPTIONS[r]}</p>
                <p className="mt-2 font-body text-[0.55rem] tracking-wide-luxe uppercase text-soft-ivory/50">
                  Home · <span className="font-mono">{ROLE_HOME[r]}</span>
                </p>
              </div>
              <button
                onClick={() => enterAs(r)}
                className={cn(
                  "shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm font-body text-[0.6rem] tracking-luxe uppercase transition",
                  active
                    ? "bg-rose-gold/15 text-rose-gold border border-rose-gold/40"
                    : "bg-rose-gold text-noir hover:bg-light-rose-gold"
                )}
              >
                Enter as {ROLE_LABELS[r]}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.4} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="max-w-3xl mx-auto px-5 pb-12 flex items-center gap-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.2} /> Return to site
        </Link>
        <button
          onClick={() => {
            dev.clear();
            navigate("/");
          }}
          className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
        >
          Clear preview (Guest)
        </button>
      </div>
    </div>
  );
}
