import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { LustraHorizontalLogo } from "@/components/lustra/BrandLogo";
import { Sparkle } from "@/lib/lustra/Brand";
import { cn } from "@/lib/utils";

/**
 * The ONE public marketing header, used by the homepage hero AND every public
 * marketing page. Canonical navigation only — About, How It Works, Safety, For
 * Talent, Sign In. Controlled variants:
 *   - variant="solid"       (default) noir bar for internal marketing pages
 *   - variant="transparent" over the homepage hero image (no bar/border)
 *   - sticky                pins to the top (default true; hero passes false)
 */
const NAV = [
  { to: "/about", label: "About" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/safety", label: "Safety" },
  { to: "/for-talent", label: "For Talent" },
];

interface Props {
  variant?: "solid" | "transparent";
  sticky?: boolean;
}

export default function PublicHeader({ variant = "solid", sticky = true }: Props) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const solid = variant === "solid";

  return (
    <header
      className={cn(
        "z-50 safe-top",
        sticky ? "sticky top-0" : "relative",
        solid ? "border-b border-white/[0.06] bg-noir/80 backdrop-blur-md" : "bg-transparent"
      )}
    >
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
