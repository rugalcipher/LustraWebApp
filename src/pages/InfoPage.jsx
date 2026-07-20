import React from "react";
import {
  KeyRound, Crown, BellRing, Search, Mail, Eye, Check,
  Lock, EyeOff, SlidersHorizontal, FileText, Landmark, ScrollText,
} from "lucide-react";
import PublicMarketingLayout from "@/components/lustra/public/PublicMarketingLayout";
import { MarketingValueBlock, MarketingClosing } from "@/components/lustra/public/MarketingBlocks";
import { PUBLIC_IMAGES } from "@/components/lustra/public/publicImages";

/**
 * Public marketing pages (About / How It Works / Community Standards / Privacy /
 * Terms), rendered through the shared cinematic PublicPageLayout. Content is
 * data-driven; each entry maps to a placeholder image key in publicImages.ts.
 */
const CONTENT = {
  about: {
    eyebrow: "The House",
    title: "About Lustra",
    imageKey: "about",
    statement: "A private standard of introductions, curated around you.",
    sections: [
      { icon: KeyRound, heading: "A Private Agency", copy: "Lustra is a private booking inquiry platform representing a curated roster of approved talent — models, hosts, event companions, performers, and brand ambassadors. We are not a marketplace. Every individual on our roster is vetted and represented exclusively by Lustra management." },
      { icon: Crown, heading: "Curated, Not Crowdsourced", copy: "Talent cannot self-register or publish themselves. Each profile is onboarded, reviewed, and approved by our team. This ensures discretion, quality, and trust on both sides of every engagement." },
      { icon: BellRing, heading: "Concierge-Led", copy: "Clients do not book directly. Every inquiry is handled by a dedicated concierge who confirms availability, discusses details, and issues a structured booking summary. The result is a refined, human experience from first message to finalisation." },
    ],
    closing: ["Discretion is our foundation. Excellence is our standard.", "Every experience is tailored. Every detail is considered."],
    footerNote: "Lustra.app",
  },
  "how-it-works": {
    eyebrow: "The Process",
    title: "How It Works",
    imageKey: "howItWorks",
    statement: "A refined path from first glance to confirmed engagement.",
    sections: [
      { icon: Search, marker: "I.", heading: "Browse", copy: "Explore represented talent profiles. Review bios, photos, languages, and displayed starting rates." },
      { icon: Mail, marker: "II.", heading: "Inquire", copy: "Open a profile and tap Inquire. Share your engagement type, preferred dates, and a message. A concierge connection is created instantly." },
      { icon: Eye, marker: "III.", heading: "Review", copy: "Management confirms talent availability, discusses the engagement, and prepares a structured booking proposal for your acceptance." },
      { icon: Check, marker: "IV.", heading: "Confirm", copy: "Once you accept, management marks the booking confirmed. It appears in your calendar. All arrangements are handled discreetly thereafter." },
    ],
    closing: null,
    footerNote: "Private by Design",
  },
  safety: {
    eyebrow: "Our Standards",
    title: "Community Standards",
    imageKey: "standards",
    statement: "The quiet framework that protects every member.",
    sections: [
      { icon: KeyRound, heading: "Respect", copy: "Every member — client or talent — is treated with dignity. Harassment, coercion, or inappropriate conduct is not tolerated and may result in immediate suspension." },
      { icon: Crown, heading: "Verification", copy: "Clients complete ID verification. Talent profiles are reviewed and approved by management before publication and before any media goes live." },
      { icon: BellRing, heading: "Reporting", copy: "Any profile, message, or engagement can be reported discreetly. Our team reviews every report and takes appropriate action." },
    ],
    closing: ["Trust is our foundation. Discretion is our promise.", "Excellence is our standard."],
    footerNote: "Lustra.app",
  },
  privacy: {
    eyebrow: "Your Trust",
    title: "Privacy & Discretion",
    imageKey: "privacy",
    statement: "Discretion is not a feature. It is the foundation.",
    sections: [
      { icon: Lock, heading: "Discretion by Design", copy: "No private contact details are exchanged between clients and talent. All communication flows through Lustra management. Personal addresses, phone numbers, and emails are never displayed on profiles." },
      { icon: EyeOff, heading: "What We Never Show", copy: "Private addresses, personal phone numbers, personal emails, legal identity documents, private management notes, or exact live locations." },
      { icon: SlidersHorizontal, heading: "Your Control", copy: "Manage your notification preferences, blocked profiles, and privacy settings from your profile. You may request data export or account deletion at any time." },
    ],
    closing: null,
    footerNote: "Private by Design",
  },
  terms: {
    eyebrow: "The Agreement",
    title: "Terms & Conditions",
    imageKey: "terms",
    statement: "Clear terms, discreetly upheld.",
    sections: [
      { icon: FileText, heading: "Inquiries, Not Contracts", copy: "Submitting an inquiry is a request, not a binding booking. No engagement is confirmed until Lustra management issues and you accept a structured booking summary." },
      { icon: Landmark, heading: "Agency-Managed", copy: "All financial and contractual arrangements are handled directly by authorised agency management outside the application. Lustra does not process payments through this platform." },
      { icon: ScrollText, heading: "Conduct", copy: "Members are expected to act with respect and discretion at all times. Lustra reserves the right to suspend access for behaviour that violates our community standards." },
    ],
    closing: null,
    footerNote: "Private by Design",
  },
};

export default function InfoPage({ page }) {
  const content = CONTENT[page] || CONTENT.about;
  const image = PUBLIC_IMAGES[content.imageKey];

  return (
    <PublicMarketingLayout eyebrow={content.eyebrow} title={content.title} image={image} footerNote={content.footerNote}>
      {content.statement && (
        <p className="font-body text-sm sm:text-base text-soft-ivory/75 leading-relaxed max-w-md">
          {content.statement}
        </p>
      )}

      <div className="mt-6 sm:mt-8 lg:mt-10 space-y-6 sm:space-y-8 lg:space-y-10">
        {content.sections.map((s) => (
          <MarketingValueBlock key={s.heading} icon={s.icon} marker={s.marker} heading={s.heading} copy={s.copy} />
        ))}
      </div>

      {content.closing && <MarketingClosing lines={content.closing} className="mt-8 sm:mt-11 lg:mt-14" />}
    </PublicMarketingLayout>
  );
}
