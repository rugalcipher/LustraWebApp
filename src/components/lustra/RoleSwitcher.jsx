import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Users, Crown } from "lucide-react";
import { useDevPreview } from "@/auth/devPreview";
import { ROLES, ROLE_LABELS, ROLE_HOME, GUEST } from "@/domain/roles";
import { MEMBERSHIP_TIER } from "@/domain/entitlements";
import { cn } from "@/lib/utils";

/**
 * Development-only role/entitlement preview switcher. Renders globally (outside
 * every protected layout) so it is visible on every page. Gated by the dev
 * preview store's `enabled` flag; renders nothing in a production build.
 *
 * It ONLY writes to the dev-preview overlay — never to the real authenticated
 * principal. A rose-gold VIP toggle appears when previewing the Client role so
 * the VIP media states can be demonstrated.
 */
export default function RoleSwitcher() {
  const dev = useDevPreview();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!dev.enabled) return;
    const onKey = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "r") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dev.enabled]);

  if (!dev.enabled) return null;

  const current = dev.role || GUEST;

  const switchTo = (r) => {
    dev.setRole(r);
    setOpen(false);
    navigate(ROLE_HOME[r] || "/");
  };

  const toPreviewGuest = () => {
    dev.clear();
    setOpen(false);
    navigate("/");
  };

  const isVip = dev.membershipTier === MEMBERSHIP_TIER.Vip;

  return (
    <div className="fixed bottom-4 right-4 z-[120] safe-bottom flex flex-col items-end gap-2">
      {/* Current preview badge */}
      <Link
        to="/dev/roles"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-noir/90 border border-rose-gold/30 backdrop-blur text-[0.5rem] tracking-luxe uppercase text-rose-gold font-body hover:border-rose-gold/60 transition"
        title="Role preview hub (dev only)"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-gold" />
        {ROLE_LABELS[current]}
        {current === "client" && isVip && <Crown className="w-2.5 h-2.5" strokeWidth={1.6} />}
        <Users className="w-3 h-3 ml-0.5" strokeWidth={1.4} />
      </Link>

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-11 h-11 rounded-full bg-noir/90 border border-rose-gold/40 backdrop-blur flex items-center justify-center text-rose-gold shadow-lg shadow-black/50 hover:border-rose-gold/70 transition"
        aria-label="Development role switcher"
        title="Shift+R to toggle"
      >
        <Shield className="w-4 h-4" strokeWidth={1.2} />
      </button>

      {open && (
        <div className="absolute bottom-14 right-0 w-52 bg-elevated-black border border-rose-gold/30 rounded-md p-2 shadow-2xl animate-scale-in origin-bottom-right">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/[0.05] mb-1">
            <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">Dev · Preview</p>
            <Link
              to="/dev/roles"
              onClick={() => setOpen(false)}
              className="text-[0.5rem] tracking-luxe uppercase text-rose-gold/80 hover:text-rose-gold"
            >
              Hub →
            </Link>
          </div>

          <button
            onClick={toPreviewGuest}
            className={cn(
              "w-full text-left px-2 py-1.5 text-xs font-body rounded-sm transition flex items-center justify-between",
              current === GUEST ? "bg-rose-gold/15 text-rose-gold" : "text-soft-ivory/80 hover:bg-white/5"
            )}
          >
            {ROLE_LABELS[GUEST]}
            {current === GUEST && <span className="w-1.5 h-1.5 rounded-full bg-rose-gold" />}
          </button>

          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => switchTo(r)}
              className={cn(
                "w-full text-left px-2 py-1.5 text-xs font-body rounded-sm transition flex items-center justify-between",
                current === r ? "bg-rose-gold/15 text-rose-gold" : "text-soft-ivory/80 hover:bg-white/5"
              )}
            >
              {ROLE_LABELS[r]}
              {current === r && <span className="w-1.5 h-1.5 rounded-full bg-rose-gold" />}
            </button>
          ))}

          {/* VIP entitlement toggle — only meaningful for the Client role */}
          {current === "client" && (
            <label className="mt-1 flex items-center justify-between px-2 py-1.5 border-t border-white/[0.05] cursor-pointer">
              <span className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-soft-ivory/80">
                <Crown className="w-3 h-3 text-rose-gold" strokeWidth={1.4} /> VIP member
              </span>
              <input
                type="checkbox"
                checked={isVip}
                onChange={(e) =>
                  dev.setMembershipTier(e.target.checked ? MEMBERSHIP_TIER.Vip : MEMBERSHIP_TIER.Standard)
                }
                className="accent-rose-gold w-3.5 h-3.5"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
