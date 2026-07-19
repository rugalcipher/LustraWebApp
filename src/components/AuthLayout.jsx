import React from "react";
import { Link } from "react-router-dom";
import { LustraVerticalLogo } from "@/components/lustra/BrandLogo";

/**
 * Authentication layout — uses the approved stacked Lustra vertical logo for
 * primary branding. (The legacy `icon` prop is accepted for compatibility but
 * no longer rendered.)
 *
 * @param {{
 *   icon?: import("react").ComponentType<any>;
 *   title?: import("react").ReactNode;
 *   subtitle?: import("react").ReactNode;
 *   footer?: import("react").ReactNode;
 *   children?: import("react").ReactNode;
 * }} props
 */
export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" aria-label="Lustra home" className="inline-block mb-6">
            <LustraVerticalLogo className="h-24 w-auto mx-auto" eager />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
