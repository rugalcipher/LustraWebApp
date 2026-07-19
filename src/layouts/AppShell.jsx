import React, { useState, useEffect, useCallback } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Compass, Heart, MessageSquare, Calendar, User, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/roleStore";
import { navForGroup } from "@/app/routeRegistry";
import { LustraHorizontalLogo } from "@/components/lustra/BrandLogo";

const ICONS = { Compass, Heart, MessageSquare, Calendar, User };

export default function AppShell() {
  const { role, user } = useRole();
  const location = useLocation();
  // Computed at render (not module-eval) to avoid a circular-import TDZ: several
  // client pages import useSavedTalent from this module, which pulls AppShell
  // into the route registry's init graph.
  const nav = navForGroup("client");

  return (
    <div className="lustra-marble min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-noir/85 backdrop-blur-md border-b border-white/[0.05] safe-top">
        <div className="max-w-luxe mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" aria-label="Lustra home" className="flex items-center">
            <LustraHorizontalLogo className="h-6 w-auto" eager />
          </Link>
          <div className="text-right">
            <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey leading-none">
              {role}
            </p>
            <p className="text-xs font-body text-soft-ivory/80 leading-none mt-0.5">{user.name}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-luxe mx-auto w-full pb-24">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-noir/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom">
        <div className="max-w-luxe mx-auto grid grid-cols-6 px-2">
          {nav.map(({ to, label, icon }) => {
            const Icon = ICONS[icon] || Circle;
            const active =
              location.pathname === to ||
              (to !== "/app" && location.pathname.startsWith(to) && to !== "/app/discover");
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors min-h-[52px]",
                  active ? "text-rose-gold" : "text-muted-grey hover:text-soft-ivory"
                )}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.2} />
                <span className="text-[0.5rem] tracking-wide-luxe uppercase font-body">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Hook for saved-talent state, shared across client pages. */
const SAVED_KEY = "lustra-saved";
export function useSavedTalent() {
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }, [saved]);

  const toggle = useCallback((id) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  return { saved, toggle, isSaved: (id) => saved.includes(id) };
}