import React, { useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Globe, Star, Flag, Shield, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarDivider } from "@/lib/lustra/Brand";
import { Eyebrow, AvailabilityPill } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import DiscoveryGate from "@/components/lustra/immersive/DiscoveryGate";
import TalentGallery from "@/features/discovery/TalentGallery";
import TalentLocationOverlay from "@/features/discovery/TalentLocationOverlay";
import { useTalentProfile, useTalentReviews, useDiscoveryPolicy } from "@/features/discovery/hooks";
import { useMessageAction } from "@/features/conversations/useMessageAction";
import { formatDistanceBand } from "@/features/discovery/NearbyLocation";
import { formatRate, formatRateUnit } from "@/domain/talent";

/**
 * The AUTHENTICATED client's complete talent profile.
 *
 * Media-first: every approved image in a real gallery (tap/swipe/keyboard), then every
 * meaningful public field the API sent. The header carries ONLY a working Back button — no
 * share, no save (saving lives in discovery) — and Back returns to the client's discovery state.
 * Nothing empty is rendered: no zero rating, no "0 engagements", no blank sections. Private
 * data (legal name, address, coordinates, contact) is never present in the public DTO and so
 * never appears here.
 */
export default function TalentDetail() {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const message = useMessageAction();
  const [imageIndex, setImageIndex] = useState(0);

  const { talent, isLoading, gate, notFound } = useTalentProfile(slug);
  const { data: policy } = useDiscoveryPolicy();
  const { reviews } = useTalentReviews(slug, policy?.guestCanViewReviews !== false);

  // Back returns to discovery: to the previous entry when we arrived from within the app (the
  // discovery store restores mode/filters/talent/slide), else safely to /app/discover.
  const goBack = () => {
    if (location.state?.from) navigate(location.state.from);
    else if (location.key !== "default") navigate(-1);
    else navigate("/app/discover");
  };

  if (isLoading) {
    return (
      <div className="px-6 py-32 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }
  if (gate) {
    return <div className="min-h-[70vh] flex items-center justify-center"><DiscoveryGate gate={gate} /></div>;
  }
  if (notFound || !talent) {
    return (
      <div className="px-6 py-32 text-center">
        <p className="font-heading text-2xl text-ivory">Profile not found</p>
        <LustraButton as={Link} to="/app/discover" variant="outline" size="sm" className="mt-6">
          Return to Discover
        </LustraButton>
      </div>
    );
  }

  const galleryImages = talent.galleryImages?.length ? talent.galleryImages : talent.coverImage ? [talent.coverImage] : [];
  const rateLabel = formatRate(talent.startingRate, talent.startingRateCurrency);
  const distance = formatDistanceBand(talent.distanceKm);
  const hasReviews = reviews.length > 0;

  return (
    <div className="pb-client-action">
      {/* Cover / gallery */}
      <div className="relative aspect-[4/5]">
        <TalentGallery
          images={galleryImages}
          index={imageIndex}
          onIndexChange={setImageIndex}
          headerOffset="4.5rem"
          className="absolute inset-0"
          ariaLabel={`${talent.name} photographs`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-noir via-noir/10 to-noir/40" />
          {/* Privacy-safe "Province · City" where the talent is based — never a private address. */}
          <TalentLocationOverlay talent={talent} />
        </TalentGallery>

        {/* Header — Back only. z-30 above the gallery tap zones (z-10) and desktop chevrons (z-20),
            and the tap zones start below this via headerOffset, so Back is always clickable.
            safe-top-spaced keeps the button below the notch/status bar with comfortable spacing
            (px/pb are separate so they don't fight the padding-top the safe-area utility sets). */}
        <div className="absolute top-0 left-0 right-0 z-30 px-4 pb-4 safe-top-spaced">
          <button
            onClick={goBack}
            aria-label="Back to discovery"
            className="w-11 h-11 rounded-full bg-noir/60 backdrop-blur border border-white/10 flex items-center justify-center text-ivory hover:border-rose-gold/40 transition"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.4} />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-8 relative z-10">
        {/* Name block */}
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <h1 className="font-heading font-light text-4xl text-ivory leading-none">
              {talent.name}
              {talent.age ? <span className="text-soft-ivory/50 text-2xl">, {talent.age}</span> : null}
            </h1>
            {talent.headline && (
              <p className="font-body text-[0.65rem] tracking-wide-luxe uppercase text-soft-ivory/70 mt-2">
                {talent.headline}
              </p>
            )}
          </div>
          {/* Rating ONLY when real approved reviews exist — never a zero. */}
          {hasReviews && talent.rating > 0 && (
            <div className="flex items-center gap-1 text-rose-gold shrink-0">
              <Star className="w-3.5 h-3.5 fill-rose-gold" />
              <span className="text-sm font-body">{talent.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {/* Location is shown once, on the image (TalentLocationOverlay). The distance band —
              how far the talent is from the CLIENT's search location — is a separate concept and
              stays here. */}
          {distance && (
            <span className="text-[0.6rem] tracking-wide-luxe uppercase text-rose-gold/80 font-body">{distance}</span>
          )}
          <AvailabilityPill status={talent.availability} />
          {talent.verified && (
            <span className="inline-flex items-center gap-1 text-[0.55rem] tracking-luxe uppercase text-soft-ivory/60">
              <Shield className="w-3 h-3" strokeWidth={1.2} /> Verified
            </span>
          )}
        </div>

        {/* Rate */}
        <div className="mt-5 flex items-baseline gap-2 border-y border-white/[0.06] py-4">
          <span className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">Starting from</span>
          <span className="font-heading text-2xl text-light-rose-gold">{rateLabel}</span>
        </div>
        {talent.ratesDisclaimer && (
          <p className="text-[0.55rem] tracking-wide-luxe text-muted-grey/70 italic mt-2 leading-relaxed">
            {talent.ratesDisclaimer}
          </p>
        )}

        {talent.rates.length > 0 && (
          <div className="mt-6">
            <Eyebrow>Rates</Eyebrow>
            <div className="mt-3 space-y-2">
              {talent.rates.map((rate) => (
                <div key={`${rate.label}-${rate.unit}`} className="flex items-baseline justify-between gap-4 border-b border-white/[0.04] pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="font-body text-sm text-soft-ivory/85">{rate.label}</p>
                    {rate.notes && <p className="font-body text-[0.6rem] text-muted-grey mt-0.5">{rate.notes}</p>}
                  </div>
                  <p className="font-heading text-base text-light-rose-gold shrink-0">
                    {formatRate(rate.amount, rate.currency)}
                    <span className="ml-1 font-body text-[0.55rem] text-muted-grey">{formatRateUnit(rate.unit)}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {talent.fullBio && (
          <div className="mt-7">
            <Eyebrow>About</Eyebrow>
            <p className="font-body text-sm text-soft-ivory/85 leading-relaxed mt-3 whitespace-pre-line">{talent.fullBio}</p>
          </div>
        )}

        {(talent.category || talent.languages.length > 0 || talent.skills.length > 0 ||
          talent.interests.length > 0 || talent.engagements.length > 0) && (
          <>
            <div className="my-7"><StarDivider /></div>
            <div className="space-y-5">
              {talent.category && <DetailRow label="Category" value={talent.categories.join(" · ") || talent.category} />}
              {talent.languages.length > 0 && <DetailRow label="Languages" value={talent.languages.join(" · ")} icon={Globe} />}
              {talent.skills.length > 0 && <DetailRow label="Skills" value={talent.skills.join(" · ")} />}
              {talent.interests.length > 0 && <DetailRow label="Interests" value={talent.interests.join(" · ")} />}
              {talent.engagements.length > 0 && <DetailRow label="Engagements" value={talent.engagements.join(" · ")} />}
              <DetailRow label="Travel" value={talent.travel ? "Available to travel" : "Local only"} />
              <DetailRow label="Events" value={talent.eventAvailable ? "Available for events" : "Not for events"} />
            </div>
          </>
        )}

        {talent.tags.length > 0 && (
          <>
            <div className="my-7"><StarDivider /></div>
            <Eyebrow>Demeanour</Eyebrow>
            <div className="flex flex-wrap gap-2 mt-3">
              {talent.tags.map((tag) => (
                <span key={tag} className="text-[0.6rem] tracking-wide-luxe uppercase px-3 py-1.5 rounded-full border border-white/[0.08] text-soft-ivory/70">
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Reviews ONLY when real moderated reviews exist — no empty block, no zero stars. */}
        {hasReviews && (
          <div className="mt-8">
            <Eyebrow>Reviews</Eyebrow>
            <div className="mt-3 space-y-3">
              {reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="bg-card-black/60 border border-white/[0.06] rounded-md p-4">
                  <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={cn("w-3.5 h-3.5", i < review.rating ? "fill-rose-gold text-rose-gold" : "text-white/15")} />
                    ))}
                  </div>
                  {review.title && <p className="font-body text-sm text-ivory mt-2">{review.title}</p>}
                  <p className="font-body text-sm text-soft-ivory/85 mt-1.5 leading-relaxed italic">&ldquo;{review.body}&rdquo;</p>
                  {review.response && (
                    <p className="font-body text-[0.7rem] text-muted-grey mt-3 pl-3 border-l border-rose-gold/25">{review.response}</p>
                  )}
                  <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mt-3">— Verified Member</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          to={`/app/report?talent=${encodeURIComponent(talent.slug)}`}
          className="w-full mt-8 flex items-center justify-between text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
        >
          <span className="flex items-center gap-1.5"><Flag className="w-3 h-3" strokeWidth={1.2} /> Report profile</span>
          <ChevronRight className="w-3 h-3" strokeWidth={1.2} />
        </Link>
      </div>

      {/*
        Message bar. It sits ABOVE the client bottom navigation via .client-action-footer
        (bottom = nav height + safe-area inset), so the menu can never cover it, and the page
        padding above (.pb-client-action) keeps the last profile content clear of both bars.
      */}
      <div
        data-testid="talent-detail-action-footer"
        className="client-action-footer bg-noir/95 backdrop-blur-xl border-t border-white/[0.06]"
      >
        <div className="max-w-luxe mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey leading-none">From</p>
            <p className="font-heading text-lg text-light-rose-gold leading-none mt-1">{rateLabel}</p>
          </div>
          <LustraButton onClick={() => message(talent)} size="md" className="flex-1 min-h-[44px]">Message</LustraButton>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, icon: Icon }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-[0.6rem] tracking-luxe uppercase text-muted-grey shrink-0 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" strokeWidth={1.2} />} {label}
      </span>
      <span className="text-sm text-soft-ivory/85 text-right font-body">{value}</span>
    </div>
  );
}
