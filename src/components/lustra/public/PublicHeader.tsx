import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { LustraHorizontalLogo } from "@/components/lustra/BrandLogo";
import { Sparkle } from "@/lib/lustra/Brand";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/talent", label: "Discover" },
  { to: "/about", label: "About" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/safety", label: "Standards" },
  { to: "/request-access", label: "Membership" },
];

/**
 * Shared public marketing header — the top-level website chrome for every public
 * page outside the app (logo, public navigation, Sign In). Sticky, translucent
 * noir, with an active-link rose-gold underline and a mobile menu. Keeps the
 * marketing pages visually attached to the homepage.
 */
export default function PublicHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-noir/80 backdrop-blur-md safe-top">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 h-16 flex items-center justify-between">
        <Link to="/" aria-label="Lustra home" className="flex items-center">
          <LustraHorizontalLogo className="h-6 sm:h-7 w-auto" eager />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "relative font-body text-[0.6rem] tracking-luxe uppercase transition-colors pb-0.5",
                isActive(n.to) ? "text-rose-gold" : "text-soft-ivory/70 hover:text-ivory"
              )}
            >
              {n.label}
              {isActive(n.to) && <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-rose-gold/70" />}
            </Link>
          ))}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/90 hover:text-light-rose-gold transition"
          >
            <Sparkle size={9} /> Sign In
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-4 lg:hidden">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/90"
          >
            <Sparkle size={8} /> Sign In
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="text-soft-ivory hover:text-rose-gold p-1"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" strokeWidth={1.4} />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="lg:hidden border-t border-white/[0.06] bg-noir/95 backdrop-blur-xl px-6 py-4 animate-fade-in">
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "py-3 font-body text-[0.7rem] tracking-luxe uppercase transition-colors",
                  isActive(n.to) ? "text-rose-gold" : "text-soft-ivory/80"
                )}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
