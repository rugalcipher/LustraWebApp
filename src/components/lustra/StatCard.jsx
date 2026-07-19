import React from "react";
import { cn } from "@/lib/utils";

const ACCENTS = {
  rose: "text-rose-gold",
  ivory: "text-ivory",
  success: "text-success",
  warning: "text-warning",
};

/**
 * @param {{
 *   label?: import("react").ReactNode;
 *   value?: import("react").ReactNode;
 *   icon?: import("react").ComponentType<any>;
 *   accent?: string;
 *   hint?: import("react").ReactNode;
 * }} props
 */
export default function StatCard({ label, value, icon: Icon, accent = "rose", hint }) {
  return (
    <div className="bg-card-black/80 border border-white/[0.06] rounded-md p-4 flex flex-col gap-2">
      {Icon && <Icon className={cn("w-4 h-4", ACCENTS[accent])} strokeWidth={1.2} />}
      <p className="font-heading text-3xl text-ivory leading-none">{value}</p>
      <p className="font-body text-[0.55rem] tracking-luxe uppercase text-muted-grey">{label}</p>
      {hint && <p className="font-body text-[0.6rem] text-soft-ivory/50">{hint}</p>}
    </div>
  );
}