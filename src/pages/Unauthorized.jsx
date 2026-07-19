import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, ArrowRight, Home } from "lucide-react";
import { usePrincipal } from "@/auth/PrincipalContext";
import { useDevPreview } from "@/auth/devPreview";
import { ROLE_HOME, ROLE_LABELS } from "@/domain/roles";
import { allowedRolesFor } from "@/app/routeRegistry";
import { LustraHorizontalLogo } from "@/components/lustra/BrandLogo";
import { cn } from "@/lib/utils";

/**
 * Shown when a role attempts a route it cannot access.
 * Preserves the attempted route (router state `from`) and required roles so
 * the user can switch role and resume — rather than being silently bounced
 * to the home page.
 */
export default function Unauthorized() {
  const { primaryRole: role } = usePrincipal();
  const dev = useDevPreview();
  const location = useLocation();
  const navigate = useNavigate();

  const from = location.state?.from;
  const required = location.state?.required || (from ? allowedRolesFor(from) : null) || [];

  const resume = (r) => {
    dev.setRole(r);
    // Re-evaluate immediately: if the new role is permitted, resume the
    // originally attempted route; otherwise stay here.
    if (from && required.includes(r)) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="lustra-marble min-h-screen flex flex-col safe-top safe-bottom">
      <header className="px-5 pt-10">
        <Link to="/" aria-label="Lustra home" className="inline-flex items-center">
          <LustraHorizontalLogo className="h-7 w-auto" eager />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-rose-gold/30 bg-card-black/60 mb-6">
            <ShieldAlert className="w-6 h-6 text-rose-gold" strokeWidth={1.2} />
          </div>
          <p className="font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 mb-3">
            Access Restricted
          </p>
          <h1 className="font-heading font-light text-3xl text-ivory leading-tight">
            You do not have access to this area
          </h1>
          <p className="mt-3 font-body text-sm text-muted-grey leading-relaxed">
            This section is reserved for authorised personnel. Switch to an
            permitted role below to continue.
          </p>

          {/* Current + required roles */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <span className="font-body text-[0.55rem] tracking-luxe uppercase text-muted-grey">
              Your role · <span className="text-soft-ivory">{ROLE_LABELS[role]}</span>
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {required.map((r) => (
                <span
                  key={r}
                  className="text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 rounded-full border border-rose-gold/25 text-rose-gold/90 font-body"
                >
                  {ROLE_LABELS[r] || r}
                </span>
              ))}
            </div>
          </div>

          {/* Quick role switch — development preview only */}
          {dev.enabled && (
          <div className="mt-7">
            <p className="font-body text-[0.5rem] tracking-luxe uppercase text-muted-grey mb-2">
              Switch role · dev preview
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(required || []).map((r) => (
                <button
                  key={r}
                  onClick={() => resume(r)}
                  className={cn(
                    "px-3 py-2 rounded-sm font-body text-[0.6rem] tracking-luxe uppercase transition border",
                    role === r
                      ? "bg-rose-gold/15 text-rose-gold border-rose-gold/40"
                      : "bg-card-black/60 text-soft-ivory/80 border-white/[0.08] hover:border-rose-gold/40"
                  )}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
            <Link
              to="/dev/roles"
              state={{ from }}
              className="mt-3 inline-flex items-center gap-1.5 text-[0.55rem] tracking-luxe uppercase text-rose-gold/80 hover:text-rose-gold transition"
            >
              All roles <ArrowRight className="w-3 h-3" strokeWidth={1.4} />
            </Link>
          </div>
          )}

          {/* Navigation actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={ROLE_HOME[role] || "/"}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-rose-gold text-noir font-body text-[0.6rem] tracking-luxe uppercase hover:bg-light-rose-gold transition"
            >
              <Home className="w-3.5 h-3.5" strokeWidth={1.4} /> Go to my dashboard
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.2} /> Return home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}