import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock, MapPin, Sparkles } from "lucide-react";
import Monogram from "@/lib/lustra/Monogram";
import DiscoveryLocation from "@/features/discovery/DiscoveryLocation";
import { useAuthStore } from "@/stores/authStore";

/**
 * The gate shown when the API declines to return discovery results.
 *
 * These states come from the SERVER (`discovery.public_disabled`,
 * `discovery.guest_limit_reached`, `discovery.location_required`) and the response
 * carries none of the withheld content — this component only presents the next step.
 *
 * The attempted route is recorded so signing in returns the visitor exactly here.
 */
const GATES = {
  "members-only": {
    icon: Lock,
    eyebrow: "Members only",
    title: "Browsing is currently by invitation",
    body: "Sign in with your Lustra account, or request access and we'll be in touch.",
  },
  "guest-limit": {
    icon: Sparkles,
    eyebrow: "Preview complete",
    title: "Continue with a Lustra account",
    body: "You've seen the preview. Sign in or request access to browse the full roster, save talent and submit an inquiry.",
  },
  "location-required": {
    icon: MapPin,
    eyebrow: "Choose a city",
    title: "Where would you like to be introduced?",
    body: "Select a city to see who is available near you.",
  },
};

export default function DiscoveryGate({ gate }) {
  const location = useLocation();
  const setIntendedRoute = useAuthStore((s) => s.setIntendedRoute);
  const config = GATES[gate];

  if (!config) return null;

  const Icon = config.icon;
  const rememberRoute = () => setIntendedRoute(`${location.pathname}${location.search}`);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <Monogram size={32} />

      <Icon className="mt-8 w-6 h-6 text-rose-gold/70" strokeWidth={1.2} aria-hidden="true" />

      <p className="mt-5 font-body text-[0.55rem] tracking-luxe uppercase text-muted-grey">
        {config.eyebrow}
      </p>
      <h2 className="mt-2 font-heading font-light text-2xl text-ivory max-w-xs">{config.title}</h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-muted-grey max-w-sm">{config.body}</p>

      {gate === "location-required" ? (
        <div className="mt-8 w-full max-w-xs">
          <DiscoveryLocation variant="panel" />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <Link
            to="/login"
            onClick={rememberRoute}
            className="w-full py-3.5 rounded-sm bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body uppercase text-[0.65rem] tracking-luxe"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            onClick={rememberRoute}
            className="w-full py-3.5 rounded-sm border border-rose-gold/30 text-rose-gold font-body uppercase text-[0.65rem] tracking-luxe hover:bg-rose-gold/10 transition"
          >
            Request access
          </Link>
        </div>
      )}
    </div>
  );
}
