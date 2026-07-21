import React, { useState, useEffect, useCallback } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Compass, Heart, MessageSquare, Calendar, CalendarCheck, User, Circle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/roleStore";
import { navForGroup } from "@/app/routeRegistry";
import { LustraHorizontalLogo } from "@/components/lustra/BrandLogo";
import { useHomeLink } from "@/auth/useHomeLink";
import {
  useConversationListLiveUpdates,
  useUnreadConversationCount,
} from "@/features/conversations/hooks";
import { useUnreadNotificationCount } from "@/features/notifications/hooks";

const ICONS = { Compass, Heart, MessageSquare, Calendar, CalendarCheck, User };

/**
 * Tailwind needs whole class names at build time, so the column count cannot be
 * interpolated. Mapping it explicitly also means adding a sixth destination
 * fails loudly here rather than silently rendering an uneven bar — which is what
 * happened when four links were laid out in a hardcoded six-column grid.
 */
const COLUMNS = { 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" };

export default function AppShell() {
  const homeLink = useHomeLink();
  const { role, user } = useRole();
  const location = useLocation();

  // One shared chat connection for the whole client area, so the Messages badge stays
  // live while the client is on another screen.
  useConversationListLiveUpdates();
  const unreadCount = useUnreadConversationCount();
  const unreadNotifications = useUnreadNotificationCount();
  // Computed at render (not module-eval) to avoid a circular-import TDZ: several
  // client pages import useSavedTalent from this module, which pulls AppShell
  // into the route registry's init graph.
  const nav = navForGroup("client");

  return (
    <div className="lustra-marble min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-noir/85 backdrop-blur-md border-b border-white/[0.05] safe-top">
        <div className="max-w-luxe mx-auto px-5 h-14 flex items-center justify-between">
          <Link to={homeLink} aria-label="Lustra home" className="flex items-center">
            <LustraHorizontalLogo className="h-6 w-auto" eager />
          </Link>
          <div className="flex items-center gap-4">
            {/* The bell lives here rather than in the bottom bar: that bar holds the five
                approved destinations and a sixth would crowd them below 360px. */}
            <Link
              to="/app/notifications"
              aria-label={
                unreadNotifications > 0
                  ? `Notifications, ${unreadNotifications} unread`
                  : "Notifications"
              }
              className="relative text-muted-grey hover:text-rose-gold transition p-1"
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.2} />
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 min-w-[0.9rem] h-[0.9rem] px-1 rounded-full bg-rose-gold text-noir text-[0.45rem] font-body flex items-center justify-center">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>

            <div className="text-right">
              <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey leading-none">
                {role}
              </p>
              <p className="text-xs font-body text-soft-ivory/80 leading-none mt-0.5">{user.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-luxe mx-auto w-full pb-24">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-noir/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom">
        <div className={cn("max-w-luxe mx-auto grid px-1", COLUMNS[nav.length] ?? "grid-cols-5")}>
          {nav.map(({ to, label, icon }) => {
            const Icon = ICONS[icon] || Circle;
            const active =
              location.pathname === to ||
              (to !== "/app" && location.pathname.startsWith(to) && to !== "/app/discover");
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // min-w-0 lets every column shrink equally at 320px instead of the
                  // widest label forcing the bar wider than the viewport.
                  "min-w-0 flex flex-col items-center justify-center gap-0.5 px-0.5 py-2.5",
                  "transition-colors min-h-[52px]",
                  active ? "text-rose-gold" : "text-muted-grey hover:text-soft-ivory"
                )}
              >
                <span className="relative">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.2} />
                  {to === "/app/messages" && unreadCount > 0 && (
                    <span
                      aria-label={`${unreadCount} unread`}
                      className="absolute -top-1 -right-1.5 min-w-[0.9rem] h-[0.9rem] px-1 rounded-full bg-rose-gold text-noir text-[0.45rem] font-body flex items-center justify-center"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate text-[0.5rem] leading-tight tracking-wide-luxe uppercase font-body">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/**
 * Back-compat re-export of the saved-talent action.
 *
 * This used to be a localStorage list. The canonical saved list is now SERVER-OWNED
 * (`/api/v1/client/saved-talents`) and read through a user-scoped React Query key, so
 * it survives across devices, is isolated per client, and cannot leak between accounts.
 * See `@/features/client/useSaveTalentAction`.
 */
export { useSaveTalentAction as useSavedTalent } from "@/features/client/useSaveTalentAction";