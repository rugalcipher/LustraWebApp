import React from "react";
import { cn } from "@/lib/utils";
import { Sparkle } from "@/lib/lustra/Brand";

const variants = {
  gold: "bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-medium hover:from-rose-gold hover:to-rose-gold border border-transparent",
  outline:
    "bg-transparent text-rose-gold border border-rose-gold/50 hover:border-rose-gold hover:bg-rose-gold/5",
  ivory: "bg-transparent text-ivory border border-ivory/30 hover:border-ivory/60 hover:bg-ivory/5",
  solid: "bg-card-black text-ivory border border-white/10 hover:border-rose-gold/40",
};

const sizes = {
  sm: "text-[0.65rem] px-5 py-2.5 tracking-luxe",
  md: "text-[0.7rem] px-7 py-3 tracking-luxe",
  lg: "text-[0.75rem] px-9 py-4 tracking-luxe",
};

/**
 * @param {{
 *   children?: import("react").ReactNode;
 *   variant?: "gold" | "outline" | "ivory" | "solid";
 *   size?: "sm" | "md" | "lg";
 *   className?: string;
 *   as?: any;
 *   [key: string]: any;
 * }} props
 */
export default function LustraButton({
  children,
  variant = "gold",
  size = "md",
  className,
  as: As = "button",
  ...props
}) {
  return (
    <As
      className={cn(
        "inline-flex items-center justify-center gap-2 font-body uppercase rounded-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </As>
  );
}

/**
 * A subtle labelled link with a leading sparkle.
 * @param {{ children?: import("react").ReactNode; className?: string; [key: string]: any }} props
 */
export function GoldLink({ children, className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 font-body text-[0.7rem] tracking-luxe uppercase text-rose-gold/90 hover:text-light-rose-gold transition-colors",
        className
      )}
      {...props}
    >
      <Sparkle size={9} />
      {children}
    </button>
  );
}