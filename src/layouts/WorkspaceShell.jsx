import React, { useState, Suspense } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarClock, Calendar, Settings, Inbox, FileText,
  Users, ShieldCheck, Image, BarChart3, Database, Activity, Circle,
  Menu, X, Search, LogOut, ScrollText, MessagesSquare, UserPlus, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/roleStore";
import { LustraHorizontalLogo } from "@/components/lustra/BrandLogo";
import RouteFallback from "@/components/RouteFallback";
import { useHomeLink } from "@/auth/useHomeLink";
import AuthenticatedErrorBoundary from "@/components/AuthenticatedErrorBoundary";

const ICONS = {
  LayoutDashboard, CalendarClock, Calendar, Settings, Inbox, FileText,
  Users, ShieldCheck, Image, BarChart3, Database, Activity, Circle, ScrollText,
  MessagesSquare, UserPlus, UserCheck,
};

/**
 * Splits the flat nav into its section groups while preserving order.
 *
 * Items with no `section` stay at the top, unheaded — the majority of the menu
 * is a plain list and adding a heading to everything would be noise.
 */
function toSections(nav) {
  const sections = [];
  for (const item of nav) {
    const title = item.section ?? null;
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.items.push(item);
    else sections.push({ title, items: [item] });
  }
  return sections;
}

/**
 * Desktop-first operational chrome shared by Management and Admin.
 *
 * Design target: 1366×768 and up, excellent at 1440p+. Persistent left sidebar,
 * a full-width top command bar (brand + workspace label + search + identity +
 * exit), and a full-width, uncapped content workspace. Below `lg` it degrades
 * to a slide-in drawer with a hamburger toggle — usable on tablets but never
 * the Client mobile bottom-nav model.
 *
 * @param {{
 *   nav: { to: string; label: string; icon: string }[];
 *   workspaceLabel: string;
 *   accentClass?: string;
 * }} props
 */
export default function WorkspaceShell({ nav, workspaceLabel, accentClass = "text-rose-gold" }) {
  const { user } = useRole();
  const homeLink = useHomeLink();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (to) =>
    location.pathname === to || (to !== "/admin" && location.pathname.startsWith(to + "/"));
  const activeItem = nav.find((n) => isActive(n.to));

  const SidebarBody = (
    <>
      <div className="px-5 h-16 flex items-center border-b border-white/[0.06]">
        <Link to={homeLink} aria-label="Lustra home" className="flex items-center">
          <LustraHorizontalLogo className="h-7 w-auto" eager />
        </Link>
      </div>
      <div className="px-5 py-4 border-b border-white/[0.04]">
        <p className={cn("text-[0.5rem] tracking-luxe uppercase", accentClass, "opacity-90")}>
          {workspaceLabel}
        </p>
        <p className="font-body text-sm text-ivory mt-1 truncate">{user.name}</p>
        <p className="font-body text-meta text-muted-grey mt-0.5 truncate">{user.membership}</p>
      </div>
      <nav className="flex-1 overflow-y-auto lustra-scroll-hide px-3 py-4 space-y-0.5">
        {toSections(nav).map((section) => (
          <div key={section.title ?? "_"} className={section.title ? "pt-4" : undefined}>
            {section.title && (
              <p className="px-3 pb-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey/70">
                {section.title}
              </p>
            )}
            {section.items.map(({ to, label, icon }) => {
              const Icon = ICONS[icon] || Circle;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body transition focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-gold/60",
                    isActive(to)
                      ? "bg-rose-gold/10 text-rose-gold border-l-2 border-rose-gold"
                      : "text-soft-ivory/70 hover:bg-white/5 hover:text-ivory border-l-2 border-transparent"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.2} />
                  <span className="tracking-wide-luxe text-nav uppercase">{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2 text-left text-nav tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition font-body"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.3} /> Exit to site
        </button>
      </div>
    </>
  );

  return (
    <div className="lustra-marble min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Persistent desktop sidebar */}
      <aside className="hidden lg:flex flex-col border-r border-white/[0.06] bg-deep-black/70 sticky top-0 h-screen">
        {SidebarBody}
      </aside>

      {/* Mobile / tablet drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-noir/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-64 max-w-[80vw] flex flex-col bg-deep-black border-r border-white/[0.08] h-full animate-slide-in-left">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-3 text-muted-grey hover:text-rose-gold"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="min-w-0 flex flex-col">
        {/* Top command bar — full width */}
        <header className="sticky top-0 z-40 h-16 border-b border-white/[0.06] bg-noir/85 backdrop-blur-md flex items-center gap-3 px-4 lg:px-6 safe-top">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden text-soft-ivory hover:text-rose-gold p-1"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" strokeWidth={1.4} />
          </button>

          <div className="min-w-0">
            <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey leading-none hidden sm:block">
              {workspaceLabel}
            </p>
            <p className="font-heading text-base lg:text-lg text-ivory leading-tight truncate">
              {activeItem?.label || "Workspace"}
            </p>
          </div>

          {/* Command search — visible operational affordance */}
          <div className="ml-auto hidden md:flex items-center gap-2 w-72 max-w-[40%] rounded-sm border border-white/[0.08] bg-card-black/60 px-3 py-2 focus-within:border-rose-gold/40 transition">
            <Search className="w-3.5 h-3.5 text-muted-grey shrink-0" strokeWidth={1.4} />
            <input
              type="text"
              placeholder="Search inquiries, clients, talent…"
              className="bg-transparent w-full text-xs text-ivory placeholder:text-muted-grey/60 focus:outline-none font-body"
            />
          </div>

          <div className="hidden lg:flex flex-col items-end shrink-0 pl-2">
            <span className="text-[0.5rem] tracking-luxe uppercase text-muted-grey leading-none">{workspaceLabel}</span>
            <span className="text-xs font-body text-soft-ivory/80 leading-none mt-0.5">{user.name}</span>
          </div>
        </header>

        <main className="flex-1 min-w-0 w-full">
          <Suspense fallback={<RouteFallback />}>
            <AuthenticatedErrorBoundary routeKey={location.pathname}>
              <Outlet />
            </AuthenticatedErrorBoundary>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
