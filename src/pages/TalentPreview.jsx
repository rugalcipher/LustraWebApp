import React from "react";
import { Link } from "react-router-dom";
import {
  Eye, BadgeCheck, MapPin, Star, Loader2, Pencil, Image as ImageIcon, Info, CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/services/mediaUrl";
import { toUserMessage } from "@/api/problemDetails";
import {
  useMyPreview, useMyTalentProfile, useMyRates, useMyMedia,
} from "@/features/talent/hooks";
import { presentProfileStatus, presentAvailabilityStatus } from "@/services/talentProfileService";

/**
 * How clients see the talent — an AUTHENTICATED preview.
 *
 * It reads `/talent/profile/preview`, never the public `/talent/:slug` route, so it works
 * while the profile is unpublished instead of 404-ing. Every field shown is public by
 * construction: the preview projection, approved public media, and public rates. Legal name,
 * private address, coordinates, private contact details, internal notes and management-only
 * media are never fetched here, so they cannot leak.
 */
export default function TalentPreview() {
  const preview = useMyPreview();
  const profile = useMyTalentProfile();
  const rates = useMyRates();
  const media = useMyMedia();

  if (preview.isLoading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">Preview unavailable</p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {preview.isError ? toUserMessage(preview.error) : "Your profile could not be loaded."}
        </p>
      </div>
    );
  }

  const p = preview.data;
  const published = Boolean(profile.data?.isPublic);
  const statusInfo = presentProfileStatus(profile.data?.profileStatus ?? "");

  // Approved, public images only, in the talent's chosen order (the hook sorts by sortOrder).
  const gallery = (media.data ?? []).filter(
    (m) => m.mediaType === "Image" && m.visibility === "Public" && m.moderationStatus === "Approved"
  );
  const cover = gallery.find((m) => m.isCover) ?? gallery[0] ?? null;
  const coverUrl = resolveMediaUrl(cover?.readUrl);

  const publicRates = (rates.data ?? [])
    .filter((r) => r.isPublic && r.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const location = [p.cityName, p.regionName].filter(Boolean).join(", ");

  return (
    <div className="px-5 pt-6 pb-10 max-w-3xl mx-auto">
      {/* Preview-mode indicator */}
      <div className="flex items-center gap-2 rounded-sm border border-rose-gold/30 bg-rose-gold/[0.06] px-3 py-2 mb-4">
        <Eye className="w-4 h-4 text-rose-gold shrink-0" strokeWidth={1.4} />
        <p className="font-body text-[0.7rem] text-soft-ivory/85">
          Preview — this is how clients see your profile. Only you can see this page.
        </p>
      </div>

      {/* Published / unpublished state */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.6rem] tracking-wide-luxe uppercase font-body",
            published
              ? "bg-success/15 text-success border border-success/30"
              : "bg-muted-grey/10 text-muted-grey border border-white/10"
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", published ? "bg-success" : "bg-muted-grey")} />
          {published ? "Published — visible to clients" : "Not published"}
        </span>
        <span className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">
          {statusInfo.label}
        </span>
      </div>

      {!published && (
        <div className="flex items-start gap-2 rounded-sm border border-white/10 bg-card-black/60 px-3 py-3 mb-5">
          <Info className="w-4 h-4 text-rose-gold shrink-0 mt-0.5" strokeWidth={1.4} />
          <p className="font-body text-[0.72rem] text-soft-ivory/80">
            {statusInfo.detail || "Lustra Management decides whether and when your profile goes live."}{" "}
            Keep your details and photos complete so you are ready to be published.
          </p>
        </div>
      )}

      {/* The public card */}
      <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-card-black/60">
        <div className="relative aspect-[4/5] sm:aspect-[16/10] bg-elevated-black">
          {coverUrl ? (
            <img src={coverUrl} alt={p.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-grey/50">
              <ImageIcon className="w-10 h-10" strokeWidth={1} />
            </div>
          )}
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl text-ivory">{p.displayName}</h1>
            {p.isVerified && (
              <span className="inline-flex items-center gap-1 text-[0.55rem] tracking-luxe uppercase text-rose-gold">
                <BadgeCheck className="w-3.5 h-3.5" strokeWidth={1.6} /> Verified
              </span>
            )}
            {p.age != null && <span className="text-sm text-muted-grey">· {p.age}</span>}
          </div>

          {p.headline && <p className="font-body text-sm text-soft-ivory/85">{p.headline}</p>}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-muted-grey">
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" strokeWidth={1.4} /> {location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="w-3 h-3" strokeWidth={1.4} />
              {presentAvailabilityStatus(p.availabilityStatus)}
            </span>
            {p.reviewCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 text-rose-gold" strokeWidth={1.4} />
                {p.averageRating.toFixed(1)} ({p.reviewCount})
              </span>
            )}
          </div>

          {p.shortBiography && (
            <p className="font-body text-sm text-soft-ivory/80 leading-relaxed whitespace-pre-line pt-1">
              {p.shortBiography}
            </p>
          )}
        </div>
      </div>

      {/* Public gallery, in real order */}
      {gallery.length > 0 && (
        <section className="mt-6">
          <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-2">Gallery</p>
          <div className="grid grid-cols-3 gap-1.5">
            {gallery.map((m) => {
              const url = resolveMediaUrl(m.readUrl);
              return (
                <div key={m.id} className="aspect-square rounded-sm overflow-hidden bg-elevated-black">
                  {url && <img src={url} alt={m.caption ?? ""} className="w-full h-full object-cover" />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Public rates */}
      {publicRates.length > 0 && (
        <section className="mt-6">
          <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-2">Rates</p>
          <div className="rounded-lg border border-white/[0.06] divide-y divide-white/[0.05]">
            {publicRates.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="font-body text-sm text-soft-ivory/85">{r.label}</span>
                <span className="font-body text-sm text-ivory">
                  {r.currencyCode} {r.amount.toLocaleString()}
                  <span className="text-muted-grey text-xs"> / {r.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Manage actions */}
      <div className="flex flex-wrap gap-3 mt-7">
        <Link
          to="/talent-profile"
          className="inline-flex items-center gap-2 text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition"
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.4} /> Edit profile
        </Link>
        <Link
          to="/talent-media"
          className="inline-flex items-center gap-2 text-[0.65rem] tracking-luxe uppercase text-soft-ivory/80 border border-white/15 px-5 py-2.5 rounded-sm hover:border-rose-gold/40 hover:text-ivory transition"
        >
          <ImageIcon className="w-3.5 h-3.5" strokeWidth={1.4} /> Manage media
        </Link>
      </div>
    </div>
  );
}
