import React, { Suspense, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarClock, Calendar, Settings, Circle, User, Image, Star, CalendarCheck,
  MessageSquare, Eye, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/roleStore";
import { navForGroup } from "@/app/routeRegistry";
import { LustraHorizontalLogo } from "@/components/lustra/BrandLogo";
import { useHomeLink } from "@/auth/useHomeLink";
import AuthenticatedErrorBoundary from "@/components/AuthenticatedErrorBoundary";
import RouteFallback from "@/components/RouteFallback";
import { useLiveConversationList } from "@/features/conversations/hooks";

const TALENT_CONVERSATION_KEYS = [["talent", "conversations"]];

const ICONS = {
  LayoutDashboard, CalendarClock, Calendar, Settings, Circle, User, Image, Star, CalendarCheck,
  MessageSquare, Eye,
};

/**
 * Talent portal shell — strongly responsive (talent manage bookings, media and availability
 * from a phone). The mobile bottom bar carries exactly the four PRIMARY destinations
 * (Preview, Appointments, Messages, Profile); every other real route lives in the side
 * drawer. Desktop shows the full menu in a left sidebar.
 */
export default function TalentShell() {
  const homeLink = useHomeLink();
  const { user } = useRole();
  const location = useLocation();
  // Keep the talent conversation list + Messages badge live app-wide over the shared connection.
  useLiveConversationList(TALENT_CONVERSATION_KEYS);
  const nav = navForGroup("talent");
  const primary = nav.filter((item) => item.primary);
  const secondary = nav.filter((item) => !item.primary);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  const NavLink = ({ to, label, icon }) => {
    const Icon = ICONS[icon] || Circle;
    return (
      <Link
        to={to}
        onClick={() => setDrawerOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body transition",
          isActive(to)
            ? "bg-rose-gold/10 text-rose-gold border-l-2 border-rose-gold"
            : "text-soft-ivory/70 hover:bg-white/5 hover:text-ivory border-l-2 border-transparent"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" strokeWidth={1.2} />
        <span className="tracking-wide-luxe text-nav">{label}</span>
      </Link>
    );
  };

  return (
    <div className="lustra-marble min-h-screen flex">
      {/* Desktop sidebar — the full menu */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-white/[0.06] bg-deep-black/60 sticky top-0 h-screen">
        <div className="px-5 h-14 flex items-center border-b border-white/[0.06]">
          <Link to={homeLink} aria-label="Lustra home" className="flex items-center">
            <LustraHorizontalLogo className="h-6 w-auto" eager />
          </Link>
        </div>
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">Talent Portal</p>
          <p className="font-body text-sm text-ivory mt-0.5 truncate">{user.name}</p>
        </div>
        <nav className="flex-1 overflow-y-auto lustra-scroll-hide px-3 py-4 space-y-0.5">
          {primary.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
          {secondary.length > 0 && <div className="my-2 border-t border-white/[0.05]" />}
          {secondary.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <Link
            to="/"
            className="text-nav tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition font-body"
          >
            ← Exit to site
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-40 bg-noir/85 backdrop-blur-md border-b border-white/[0.05] safe-top">
          <div className="px-4 h-14 flex items-center justify-between">
            <Link to={homeLink} aria-label="Lustra home" className="flex items-center">
              <LustraHorizontalLogo className="h-5 w-auto" eager />
            </Link>
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 -mr-2 flex items-center justify-center text-soft-ivory/80 hover:text-rose-gold transition"
            >
              <Menu className="w-5 h-5" strokeWidth={1.4} />
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          <Suspense fallback={<RouteFallback />}>
            <AuthenticatedErrorBoundary routeKey={location.pathname}>
              <Outlet />
            </AuthenticatedErrorBoundary>
          </Suspense>
        </main>
      </div>

      {/* Mobile drawer — the secondary destinations */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-noir/70 backdrop-blur-sm"
          />
          <aside className="absolute top-0 right-0 h-full w-72 max-w-[85%] bg-deep-black border-l border-white/[0.08] flex flex-col safe-top">
            <div className="px-4 h-14 flex items-center justify-between border-b border-white/[0.06]">
              <div>
                <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">Talent Portal</p>
                <p className="font-body text-sm text-ivory mt-0.5 truncate">{user.name}</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="w-9 h-9 flex items-center justify-center text-soft-ivory/80 hover:text-rose-gold transition"
              >
                <X className="w-5 h-5" strokeWidth={1.4} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto lustra-scroll-hide px-3 py-4 space-y-0.5">
              {secondary.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </nav>
            <div className="px-4 py-3 border-t border-white/[0.06]">
              <Link
                to="/"
                onClick={() => setDrawerOpen(false)}
                className="text-nav tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition font-body"
              >
                ← Exit to site
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile bottom nav — the four primary destinations */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-noir/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom">
        <div className="flex px-1">
          {primary.map(({ to, label, icon }) => {
            const Icon = ICONS[icon] || Circle;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-colors min-h-[52px]",
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
