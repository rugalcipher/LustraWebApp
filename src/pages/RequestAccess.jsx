import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, MessageCircle, UserPlus } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import PublicMarketingLayout from "@/components/lustra/public/PublicMarketingLayout";
import { PUBLIC_IMAGES } from "@/components/lustra/public/publicImages";

/**
 * CLIENT access — how a prospective client actually joins Lustra.
 *
 * This page used to present a "request access" form that submitted NOTHING: it waited
 * 1.1 seconds, showed "Request Received" and invented a reference number. Every enquiry
 * from the homepage's primary call to action was silently discarded, and the visitor was
 * handed a reference nobody could look up.
 *
 * Creating an account IS the access route — registration is real, and the conversation
 * with management that follows is the concierge relationship. So the page now explains
 * that and sends people to the real thing, instead of collecting details into nowhere.
 */
export default function RequestAccess() {
  return (
    <PublicMarketingLayout
      eyebrow="Private Access"
      title="Request Access"
      image={PUBLIC_IMAGES.membership}
      footerNote="Private by Design"
    >
      <p className="font-body text-sm sm:text-base text-soft-ivory/75 leading-relaxed max-w-md">
        Lustra is a private, concierge-led platform. Create an account to browse our
        represented talent, then message our management team directly — every engagement is
        arranged personally, in conversation, never through an automated booking.
      </p>

      <div className="mt-8 max-w-md space-y-5">
        <Step
          icon={UserPlus}
          title="Create your account"
          body="A few details, verified by email. No payment, no card, nothing shown publicly."
        />
        <Step
          icon={ShieldCheck}
          title="Browse discreetly"
          body="Approved talent only. Your activity stays private and is never shown to anyone you have not messaged."
        />
        <Step
          icon={MessageCircle}
          title="Speak to management"
          body="Open a private conversation about anyone who interests you. Our team arranges the rest."
        />
      </div>

      <div className="mt-9 flex flex-col sm:flex-row gap-3 max-w-md">
        <LustraButton as={Link} to="/register" size="lg" className="w-full sm:w-auto">
          Create Account
        </LustraButton>
        <LustraButton as={Link} to="/login" variant="outline" size="lg" className="w-full sm:w-auto">
          Sign In
        </LustraButton>
      </div>

      <p className="mt-6 font-body text-[0.65rem] text-muted-grey leading-relaxed max-w-md">
        Access to certain talent and media is granted at Lustra's discretion. You must be
        over 18 to hold an account.
      </p>
    </PublicMarketingLayout>
  );
}

/** @param {{ icon: import("react").ComponentType<any>; title: string; body: string }} props */
function Step({ icon: Icon, title, body }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="shrink-0 w-9 h-9 rounded-full border border-rose-gold/30 flex items-center justify-center">
        <Icon className="w-4 h-4 text-rose-gold" strokeWidth={1.3} />
      </span>
      <div>
        <p className="font-body text-sm text-ivory">{title}</p>
        <p className="font-body text-[0.7rem] text-soft-ivory/60 mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
