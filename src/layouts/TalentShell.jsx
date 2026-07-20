import React, { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarClock, Calendar, Settings, Circle, User, Image, Star, CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/roleStore";
import { navForGroup } from "@/app/routeRegistry";
import { LustraHorizontalLogo } from "@/components/lustra/BrandLogo";
import RouteFallback from "@/components/RouteFallback";

const ICONS = { LayoutDashboard, CalendarClock, Calendar, Settings, Circle, User, Image, Star, CalendarCheck };

/**
 * Talent portal shell — strongly responsive (talent manage availability, media,
 * and engagements from a phone). Desktop shows a left sidebar; mobile shows a
 * top brand bar + fixed bottom tab bar. Intentionally NOT the desktop-first
 * operational chrome used by Management/Admin.
 */
export default function TalentShell() {
  const { user } = useRole();
  const location = useLocation();
  const nav = navForGroup("talent");
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="lustra-marble min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-white/[0.06] bg-deep-black/60 sticky top-0 h-screen">
        <div className="px-5 h-14 flex items-center border-b border-white/[0.06]">
          <Link to="/" aria-label="Lustra home" className="flex items-center">
            <LustraHorizontalLogo className="h-6 w-auto" eager />
          </Link>
        </div>
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">Talent Portal</p>
          <p className="font-body text-sm text-ivory mt-0.5 truncate">{user.name}</p>
        </div>
        <nav className="flex-1 overflow-y-auto lustra-scroll-hide px-3 py-4 space-y-0.5">
          {nav.map(({ to, label, icon }) => {
            const Icon = ICONS[icon] || Circle;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body transition",
                  isActive(to)
                    ? "bg-rose-gold/10 text-rose-gold border-l-2 border-rose-gold"
                    : "text-soft-ivory/70 hover:bg-white/5 hover:text-ivory border-l-2 border-transparent"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.2} />
                <span className="tracking-wide-luxe text-[0.65rem] uppercase">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <Link
            to="/"
            className="text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition font-body"
          >
            ← Exit to site
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-40 bg-noir/85 backdrop-blur-md border-b border-white/[0.05] safe-top">
          <div className="px-4 h-14 flex items-center justify-between">
            <Link to="/" aria-label="Lustra home" className="flex items-center">
              <LustraHorizontalLogo className="h-5 w-auto" eager />
            </Link>
            <span className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">Talent</span>
          </div>
        </header>

        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-noir/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom">
        <div className="flex overflow-x-auto lustra-scroll-hide px-1">
          {nav.map(({ to, label, icon }) => {
            const Icon = ICONS[icon] || Circle;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 shrink-0 transition-colors min-h-[52px] min-w-[64px]",
                  isActive(to) ? "text-rose-gold" : "text-muted-grey hover:text-soft-ivory"
                )}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.2} />
                <span className="text-[0.5rem] tracking-wide-luxe uppercase font-body whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
