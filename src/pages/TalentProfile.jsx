import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, MapPin, Globe, Star, Flag, Shield, ChevronRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StarDivider, Watermark } from "@/lib/lustra/Brand";
import { Eyebrow, AvailabilityPill } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import DiscoveryGate from "@/components/lustra/immersive/DiscoveryGate";
import { useSavedTalent } from "@/layouts/AppShell";
import { useTalentProfile, useTalentReviews, useDiscoveryPolicy } from "@/features/discovery/hooks";
import { useInquireAction } from "@/features/inquiries/useInquireAction";
import { formatRate, formatRateUnit } from "@/domain/talent";

/**
 * The public talent profile.
 *
 * Guests may open this; the server decides how much it returns (a full profile, or a
 * redacted teaser under the guest policy) and returns a gate when a limit applies.
 * Every section here renders only what the API actually sent — nothing is invented.
 */
export default function TalentProfile() {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const { isSaved, toggle } = useSavedTalent();
  const inquire = useInquireAction();
  const [activeImg, setActiveImg] = useState(0);

  const { talent, isLoading, gate, notFound } = useTalentProfile(slug);
  const { data: policy } = useDiscoveryPolicy();
  const { reviews } = useTalentReviews(slug, policy?.guestCanViewReviews !== false);

  if (isLoading) {
    return (
      <div className="px-6 py-32 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (gate) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <DiscoveryGate gate={gate} />
      </div>
    );
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

  // Saved state is keyed on the talent PROFILE id (what the API stores), not the slug.
  const saved = isSaved(talent.talentProfileId);
  const gallery = talent.gallery;
  const activeImage = gallery[activeImg] ?? gallery[0] ?? null;
  const rateLabel = formatRate(talent.startingRate, talent.startingRateCurrency);

  return (
    <div className="pb-28">
      {/* Cover */}
      <div className="relative aspect-[4/5] overflow-hidden bg-card-black">
        {activeImage && (
          <img
            src={activeImage}
            alt={talent.name}
            /* The cover is the largest-contentful paint — load it eagerly. */
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/10 to-noir/40" />
        <Watermark className="opacity-[0.04]" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 safe-top">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-noir/50 backdrop-blur border border-white/10 flex items-center justify-center text-ivory"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.4} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => toggle(talent)}
              aria-label={saved ? "Remove from saved" : "Save talent"}
              className="w-9 h-9 rounded-full bg-noir/50 backdrop-blur border border-white/10 flex items-center justify-center"
            >
              <Heart
                className={cn("w-4 h-4", saved ? "fill-rose-gold text-rose-gold" : "text-ivory")}
                strokeWidth={1.4}
              />
            </button>
            <button
              onClick={() => navigator.share?.({ title: talent.name, url: window.location.href })}
              aria-label="Share"
              className="w-9 h-9 rounded-full bg-noir/50 backdrop-blur border border-white/10 flex items-center justify-center text-ivory"
            >
              <Share2 className="w-4 h-4" strokeWidth={1.4} />
            </button>
          </div>
        </div>

        {gallery.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {gallery.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                aria-label={`Image ${i + 1}`}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === activeImg ? "w-6 bg-rose-gold" : "w-2 bg-ivory/40"
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-5 -mt-8 relative">
        {/* Name block */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-heading font-light text-4xl text-ivory leading-none">
              {talent.name}
              {talent.age ? <span className="text-soft-ivory/50 text-2xl">, {talent.age}</span> : null}
            </h1>
            <p className="font-body text-[0.65rem] tracking-wide-luxe uppercase text-soft-ivory/70 mt-2">
              {talent.headline}
            </p>
          </div>
          {talent.reviews > 0 && (
            <div className="flex items-center gap-1 text-rose-gold shrink-0">
              <Star className="w-3.5 h-3.5 fill-rose-gold" />
              <span className="text-sm font-body">{talent.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {talent.city && (
            <span className="inline-flex items-center gap-1 text-[0.65rem] text-muted-grey font-body">
              <MapPin className="w-3 h-3" strokeWidth={1.2} /> {talent.city}
            </span>
          )}
          <AvailabilityPill status={talent.availability} />
          {talent.featured && (
            <span className="text-[0.55rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/30 px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
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

        {/* Rate card */}
        {talent.rates.length > 0 && (
          <div className="mt-6">
            <Eyebrow>Rates</Eyebrow>
            <div className="mt-3 space-y-2">
              {talent.rates.map((rate) => (
                <div
                  key={`${rate.label}-${rate.unit}`}
                  className="flex items-baseline justify-between gap-4 border-b border-white/[0.04] pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-body text-sm text-soft-ivory/85">{rate.label}</p>
                    {rate.notes && (
                      <p className="font-body text-[0.6rem] text-muted-grey mt-0.5">{rate.notes}</p>
                    )}
                  </div>
                  <p className="font-heading text-base text-light-rose-gold shrink-0">
                    {formatRate(rate.amount, rate.currency)}
                    <span className="ml-1 font-body text-[0.55rem] text-muted-grey">
                      {formatRateUnit(rate.unit)}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {talent.fullBio && (
          <div className="mt-7">
            <Eyebrow>About</Eyebrow>
            <p className="font-body text-sm text-soft-ivory/85 leading-relaxed mt-3">{talent.fullBio}</p>
          </div>
        )}

        <div className="my-7">
          <StarDivider />
        </div>

        {/* Details — each row is omitted entirely when the API sent nothing. */}
        <div className="space-y-5">
          {talent.category && <DetailRow label="Category" value={talent.category} />}
          {talent.languages.length > 0 && (
            <DetailRow label="Languages" value={talent.languages.join(" · ")} icon={Globe} />
          )}
          {talent.interests.length > 0 && (
            <DetailRow label="Interests" value={talent.interests.join(" · ")} />
          )}
          {talent.engagements.length > 0 && (
            <DetailRow label="Engagements" value={talent.engagements.join(" · ")} />
          )}
          <DetailRow label="Travel" value={talent.travel ? "Available to travel" : "Local only"} />
        </div>

        {talent.tags.length > 0 && (
          <>
            <div className="my-7">
              <StarDivider />
            </div>
            <Eyebrow>Demeanour</Eyebrow>
            <div className="flex flex-wrap gap-2 mt-3">
              {talent.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[0.6rem] tracking-wide-luxe uppercase px-3 py-1.5 rounded-full border border-white/[0.08] text-soft-ivory/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Reviews — real, moderated reviews only. */}
        <div className="mt-8">
          <Eyebrow>Reviews</Eyebrow>
          {reviews.length === 0 ? (
            <p className="font-body text-sm text-muted-grey mt-3">No reviews published yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {reviews.slice(0, 3).map((review) => (
                <div
                  key={review.id}
                  className="bg-card-black/60 border border-white/[0.06] rounded-md p-4"
                >
                  <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-3.5 h-3.5",
                          i < review.rating ? "fill-rose-gold text-rose-gold" : "text-white/15"
                        )}
                      />
                    ))}
                  </div>
                  {review.title && (
                    <p className="font-body text-sm text-ivory mt-2">{review.title}</p>
                  )}
                  <p className="font-body text-sm text-soft-ivory/85 mt-1.5 leading-relaxed italic">
                    &ldquo;{review.body}&rdquo;
                  </p>
                  {review.response && (
                    <p className="font-body text-[0.7rem] text-muted-grey mt-3 pl-3 border-l border-rose-gold/25">
                      {review.response}
                    </p>
                  )}
                  <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mt-3">
                    — Verified Member
                  </p>
                </div>
              ))}
            </div>
          )}
          <p className="text-[0.6rem] text-muted-grey mt-3 flex items-center gap-1.5">
            <Shield className="w-3 h-3" strokeWidth={1.2} /> Only clients with completed bookings may
            leave reviews.
          </p>
        </div>

        <Link
          to={`/app/report?talent=${encodeURIComponent(talent.slug)}`}
          className="w-full mt-6 flex items-center justify-between text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
        >
          <span className="flex items-center gap-1.5">
            <Flag className="w-3 h-3" strokeWidth={1.2} /> Report profile
          </span>
          <ChevronRight className="w-3 h-3" strokeWidth={1.2} />
        </Link>
      </div>

      {/* Sticky inquire bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-noir/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom">
        <div className="max-w-luxe mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey leading-none">From</p>
            <p className="font-heading text-lg text-light-rose-gold leading-none mt-1">{rateLabel}</p>
          </div>
          {/* Guests are routed to sign-in with this talent's context preserved. */}
          <LustraButton onClick={() => inquire(talent)} size="md" className="flex-1">
            Inquire
          </LustraButton>
        </div>
      </div>
    </div>
  );
}

/** @param {{ label?: import("react").ReactNode; value?: import("react").ReactNode; icon?: import("react").ComponentType<any> }} props */
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
