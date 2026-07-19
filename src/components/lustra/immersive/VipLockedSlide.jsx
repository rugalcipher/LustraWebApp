import React from "react";
import { Lock } from "lucide-react";
import { MonogramSeal } from "@/lib/lustra/Brand";

/**
 * Premium VIP locked state shown in place of a VIP-only photograph for a
 * standard (non-VIP) client. Deliberately restrained — a rose-gold monogram
 * seal and a discreet line, no paywall, no price, no checkout. No protected URL
 * is present in this component (the access policy strips it upstream).
 */
export default function VipLockedSlide() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-deep-black flex flex-col items-center justify-center text-center px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-noir/60 via-noir/40 to-noir/70 pointer-events-none" />
      <div className="relative flex flex-col items-center">
        <div className="relative">
          <MonogramSeal size={116} className="opacity-90" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-9 h-9 rounded-full bg-noir/70 border border-rose-gold/40 backdrop-blur-sm flex items-center justify-center">
              <Lock className="w-4 h-4 text-rose-gold" strokeWidth={1.3} />
            </span>
          </span>
        </div>
        <p className="mt-8 font-body text-[0.55rem] tracking-luxe uppercase text-rose-gold/80">
          Reserved for Lustra VIP members
        </p>
        <p className="mt-3 font-heading font-light text-2xl text-ivory/90 leading-snug max-w-xs">
          A more intimate portfolio awaits VIP members
        </p>
        <p className="mt-3 font-body text-[0.7rem] text-muted-grey max-w-[15rem] leading-relaxed">
          VIP membership is extended by invitation. Speak with your Lustra
          concierge to learn more.
        </p>
      </div>
    </div>
  );
}
