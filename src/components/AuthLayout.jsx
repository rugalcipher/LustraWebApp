import React from "react";
import { Link } from "react-router-dom";
import { LustraVerticalLogo } from "@/components/lustra/BrandLogo";
import AuthBackground from "@/components/auth/AuthBackground";

/**
 * Authentication layout — uses the approved stacked Lustra vertical logo for
 * primary branding. (The legacy `icon` prop is accepted for compatibility but
 * no longer rendered.)
 *
 * The page sits on a cinematic background mood layer (see AuthBackground). The
 * card stays CENTRED at every width and is raised above the image with a
 * translucent noir surface and a rose-gold hair line, so the form is always the
 * unmistakable focus. Every page using this layout
 * — login, register, forgot, reset — inherits the treatment, and `background`
 * allows a per-page image later without touching any page.
 *
 * @param {{
 *   icon?: import("react").ComponentType<any>;
 *   title?: import("react").ReactNode;
 *   subtitle?: import("react").ReactNode;
 *   footer?: import("react").ReactNode;
 *   children?: import("react").ReactNode;
 *   background?: "default";
 * }} props
 */
export default function AuthLayout({ title, subtitle, footer, children, background = "default" }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10">
      <AuthBackground variant={background} />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 sm:mb-10">
          <Link to="/" aria-label="Lustra home" className="inline-block mb-6">
            <LustraVerticalLogo className="h-24 w-auto mx-auto" eager />
          </Link>
          <h1 className="font-display text-3xl font-light tracking-tight text-ivory">{title}</h1>
          {subtitle && <p className="text-soft-ivory/70 mt-2">{subtitle}</p>}
        </div>

        {/* Raised surface: translucent noir over the image, never a flat panel. */}
        <div className="rounded-2xl border border-white/[0.08] bg-noir/85 backdrop-blur-xl p-8 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)] ring-1 ring-rose-gold/10">
          {children}
        </div>

        {footer && <p className="text-center text-sm text-soft-ivory/60 mt-6">{footer}</p>}
      </div>
    </div>
  );
}
