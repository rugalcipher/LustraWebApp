import React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared prop shapes for the Lustra primitives. Kept as JSDoc typedefs so the
 * JS/JSX codebase gets accurate optional-prop contracts under `checkJs`
 * without a TypeScript migration.
 *
 * @typedef {import("react").ReactNode} ReactNode
 * @typedef {import("react").ComponentType<any>} IconType
 */

/**
 * Card with the Lustra elevated-black surface and thin border.
 * @param {{ className?: string; children?: ReactNode; [key: string]: any }} props
 */
export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-card-black/80 border border-white/[0.06] rounded-md backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Editorial label — tiny, uppercase, tracked, muted.
 * @param {{ children?: ReactNode; className?: string }} props
 */
export function Eyebrow({ children, className }) {
  return (
    <p className={cn("font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/80", className)}>
      {children}
    </p>
  );
}

/**
 * Section heading in serif.
 * @param {{ children?: ReactNode; className?: string }} props
 */
export function Heading({ children, className }) {
  return (
    <h2 className={cn("font-heading font-light text-2xl sm:text-3xl text-ivory", className)}>
      {children}
    </h2>
  );
}

/**
 * Shimmer skeleton block.
 * @param {{ className?: string }} props
 */
export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-card-black via-elevated-black to-card-black bg-[length:200%_100%] animate-shimmer rounded-sm",
        className
      )}
    />
  );
}

/**
 * Empty-state composition.
 * @param {{ icon?: IconType; title?: ReactNode; body?: ReactNode; action?: ReactNode }} props
 */
export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      {Icon && <Icon className="w-8 h-8 text-rose-gold/40 mb-4" strokeWidth={1} />}
      <p className="font-heading text-xl text-ivory/90 mb-1">{title}</p>
      {body && <p className="font-body text-sm text-muted-grey max-w-xs">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * Availability pill.
 * @param {{ status?: string }} props
 */
export function AvailabilityPill({ status }) {
  const map = {
    Available: "text-success border-success/30",
    "Limited Availability": "text-warning border-warning/30",
    "By Request": "text-rose-gold border-rose-gold/30",
    Travelling: "text-muted-grey border-muted-grey/30",
    "Temporarily Unavailable": "text-error border-error/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.55rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full font-body",
        map[status] || "text-muted-grey border-muted-grey/30"
      )}
    >
      <span className="w-1 h-1 rounded-full bg-current" />
      {status}
    </span>
  );
}