import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Loader2, Shield } from "lucide-react";
import { StarDivider } from "@/lib/lustra/Brand";
import { AvailabilityPill } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import DiscoveryGate from "@/components/lustra/immersive/DiscoveryGate";
import TalentGallery from "@/features/discovery/TalentGallery";
import TalentLocationOverlay from "@/features/discovery/TalentLocationOverlay";
import { useTalentProfile } from "@/features/discovery/hooks";
import { formatRate } from "@/domain/talent";

/**
 * The GUEST talent teaser.
 *
 * A polished preview only: a limited approved-media gallery, the safe summary (name, age,
 * locality, headline, starting-rate label, short bio) and a clear invitation to sign in. It
 * never renders client-only actions (no message/save/share) and never the full detail. Signing
 * in returns the visitor to the SAME talent's authenticated detail route.
 */
const TEASER_IMAGE_LIMIT = 3;

export default function TalentTeaser() {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const [imageIndex, setImageIndex] = useState(0);
  const { talent, isLoading, gate, notFound } = useTalentProfile(slug);

  const goToFullProfile = () =>
    navigate("/login", { state: { from: `/app/talent/${encodeURIComponent(slug ?? "")}` } });

  if (isLoading) {
    return <div className="px-6 py-32 flex justify-center"><Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} /></div>;
  }
  if (gate) {
    return <div className="min-h-[70vh] flex items-center justify-center"><DiscoveryGate gate={gate} /></div>;
  }
  if (notFound || !talent) {
    return (
      <div className="px-6 py-32 text-center">
        <p className="font-heading text-2xl text-ivory">Profile not found</p>
        <LustraButton as={Link} to="/talent" variant="outline" size="sm" className="mt-6">Browse talent</LustraButton>
      </div>
    );
  }

  const allImages = talent.galleryImages?.length ? talent.galleryImages : talent.coverImage ? [talent.coverImage] : [];
  const teaserImages = allImages.slice(0, TEASER_IMAGE_LIMIT);
  const hiddenCount = Math.max(0, allImages.length - teaserImages.length);
  const rateLabel = formatRate(talent.startingRate, talent.startingRateCurrency);
  const summary = talent.bio || talent.fullBio || "";

  return (
    <div className="pb-28">
      <div className="relative aspect-[4/5]">
        <TalentGallery
          images={teaserImages}
          index={imageIndex}
          onIndexChange={setImageIndex}
          headerOffset="4.5rem"
          className="absolute inset-0"
          ariaLabel={`${talent.name} preview photographs`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-noir via-noir/10 to-noir/40" />
          {/* Privacy-safe "Province · City" where the talent is based — never a private address. */}
          <TalentLocationOverlay talent={talent} />
        </TalentGallery>

        {/* Header — Back only (no share/save/message on a guest teaser). safe-top-spaced keeps the
            button clear of the notch/status bar with comfortable spacing (px/pb separate so they
            do not fight the padding-top the safe-area utility sets). */}
        <div className="absolute top-0 left-0 right-0 z-30 px-4 pb-4 safe-top-spaced">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/talent"))}
            aria-label="Back"
            className="w-11 h-11 rounded-full bg-noir/60 backdrop-blur border border-white/10 flex items-center justify-center text-ivory hover:border-rose-gold/40 transition"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.4} />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-8 relative z-10">
        <h1 className="font-heading font-light text-4xl text-ivory leading-none">
          {talent.name}
          {talent.age ? <span className="text-soft-ivory/50 text-2xl">, {talent.age}</span> : null}
        </h1>
        {talent.headline && (
          <p className="font-body text-[0.65rem] tracking-wide-luxe uppercase text-soft-ivory/70 mt-2">{talent.headline}</p>
        )}

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {/* Location is shown once, on the image (TalentLocationOverlay). */}
          <AvailabilityPill status={talent.availability} />
        </div>

        <div className="mt-5 flex items-baseline gap-2 border-y border-white/[0.06] py-4">
          <span className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">Starting from</span>
          <span className="font-heading text-2xl text-light-rose-gold">{rateLabel}</span>
        </div>

        {summary && (
          <p className="font-body text-sm text-soft-ivory/85 leading-relaxed mt-6 line-clamp-4">{summary}</p>
        )}

        <div className="my-7"><StarDivider /></div>

        {/* The invitation — the only meaningful guest action. */}
        <div className="rounded-xl border border-rose-gold/25 bg-rose-gold/[0.04] p-6 text-center">
          <Lock className="w-5 h-5 text-rose-gold mx-auto" strokeWidth={1.3} />
          <p className="font-heading text-lg text-ivory mt-3">See the complete profile</p>
          <p className="font-body text-sm text-muted-grey mt-1.5">
            {hiddenCount > 0
              ? `${hiddenCount} more ${hiddenCount === 1 ? "photograph" : "photographs"}, full biography, rates and more await members.`
              : "Full biography, rates and messaging await members."}
          </p>
          <LustraButton onClick={goToFullProfile} size="md" className="mt-5 w-full">
            Log in to view the full profile
          </LustraButton>
          <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mt-3 inline-flex items-center gap-1.5">
            <Shield className="w-3 h-3" strokeWidth={1.2} /> Private, members-only
          </p>
        </div>
      </div>
    </div>
  );
}
