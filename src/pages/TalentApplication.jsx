import React from "react";
import { Link } from "react-router-dom";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import PublicMarketingLayout from "@/components/lustra/public/PublicMarketingLayout";
import { PUBLIC_IMAGES } from "@/components/lustra/public/publicImages";

/**
 * FOR TALENT — how representation with Lustra actually begins.
 *
 * This page used to present a full application form, including a multi-image upload, that
 * submitted NOTHING. It waited 1.3 seconds, showed "Application Received" and invented a
 * reference number. Photographs a person selected were never uploaded anywhere, and every
 * applicant was told management would review details that were discarded on page close.
 *
 * Lustra is INVITATION-ONLY by design: management approaches and invites talent, who then
 * activate a real account from an emailed link. There is no public self-registration —
 * deliberately, and the backend has no endpoint for one. Presenting a form implied a
 * process that does not exist, so the page now states the real one.
 *
 * If a public application funnel is wanted later it needs a real endpoint, real private
 * storage for the images, and a management review queue — not a form wired to a timer.
 */
export default function TalentApplication() {
  return (
    <PublicMarketingLayout
      eyebrow="Represented by Lustra"
      title="For Talent"
      image={PUBLIC_IMAGES.forTalent}
      footerNote="Private by Design"
    >
      <p className="font-body text-sm sm:text-base text-soft-ivory/75 leading-relaxed max-w-md">
        Lustra represents a small, deliberately limited roster. We approach and invite
        talent personally — there is no open application, and no one is added to the roster
        without a conversation first.
      </p>

      <div className="mt-8 max-w-md space-y-5">
        <Step
          icon={Mail}
          title="Invitation"
          body="Management sends a private activation link to your email. It is yours alone and expires."
        />
        <Step
          icon={Sparkles}
          title="Your profile"
          body="Activate, then build your profile: biography, rates, availability and photography — all yours to edit."
        />
        <Step
          icon={ShieldCheck}
          title="Review, then publish"
          body="Management reviews everything before it is visible, and nothing appears publicly until it is published."
        />
      </div>

      <div className="mt-9 p-5 bg-card-black/60 border border-rose-gold/20 rounded-md max-w-md">
        <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">Already invited?</p>
        <p className="font-body text-sm text-soft-ivory/75 mt-2 leading-relaxed">
          Use the activation link in your invitation email to set up your account. If it has
          expired, contact the person who invited you for a new one.
        </p>
      </div>

      <div className="mt-8 max-w-md">
        <LustraButton as={Link} to="/" variant="outline" size="lg">
          Return Home
        </LustraButton>
      </div>

      <p className="mt-6 font-body text-[0.65rem] text-muted-grey leading-relaxed max-w-md">
        All talent must be over 18. Representation is at Lustra's discretion.
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
