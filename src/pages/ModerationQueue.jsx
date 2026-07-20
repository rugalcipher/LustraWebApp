import React, { useState } from "react";
import { Check, X, Loader2, Crown, Star, Image as ImageIcon, UserCheck, Globe } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { resolveMediaUrl } from "@/services/mediaUrl";
import { APPROVAL_VISIBILITIES } from "@/services/managementService";
import { formatFileSize } from "@/services/talentMediaService";
import {
  useProfileReviews, useModerateProfile, useMediaReviews, useModerateMedia,
  useReviewModeration, useModerateReview, useVipRequests, useDecideVipRequest,
} from "@/features/management/hooks";

/**
 * The moderation console: profile submissions, media, client reviews and VIP requests.
 *
 * Every decision here is consequential and irreversible in the client's eyes, so each one
 * requires an explicit action — nothing is decided by a drag, a swipe or a default.
 * Rejections require a reason, because the talent or client is told an outcome and the
 * team needs a record of why.
 */
const TABS = [
  { id: "profiles", label: "Profiles", icon: UserCheck },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "vip", label: "VIP", icon: Crown },
];

export default function ModerationQueue() {
  const [tab, setTab] = useState("profiles");

  return (
    <div className="w-full">
      <InternalHeader
        eyebrow="Management"
        title="Moderation"
        subtitle="Nothing reaches a client until it is approved here."
      />

      <div className="px-5 lg:px-8 py-6 space-y-5">
        <div className="flex gap-1 border-b border-white/[0.06] overflow-x-auto lustra-scroll-hide">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 pb-3 px-3.5 text-[0.6rem] tracking-luxe uppercase font-body transition relative",
                tab === id ? "text-rose-gold" : "text-muted-grey hover:text-soft-ivory"
              )}
            >
              <Icon className="w-3 h-3" strokeWidth={1.3} />
              {label}
              {tab === id && <span className="absolute bottom-0 left-0 right-0 h-px bg-rose-gold" />}
            </button>
          ))}
        </div>

        {tab === "profiles" && <ProfileQueue />}
        {tab === "media" && <MediaQueue />}
        {tab === "reviews" && <ReviewQueue />}
        {tab === "vip" && <VipQueue />}
      </div>
    </div>
  );
}

// ---- profiles --------------------------------------------------------------

function ProfileQueue() {
  const { data: profiles, isPending, isError, error } = useProfileReviews("PendingReview");
  const moderate = useModerateProfile();
  const [reasons, setReasons] = useState({});

  const act = async (profileId, action) => {
    const reason = (reasons[profileId] ?? "").trim();
    if ((action === "reject" || action === "request-changes") && !reason) {
      toast({
        title: "A reason is required",
        description: "The talent is told the outcome — say what needs to change.",
        variant: "destructive",
      });
      return;
    }
    try {
      await moderate.mutateAsync({ profileId, action, reason });
      setReasons((r) => ({ ...r, [profileId]: "" }));
      toast({ title: action === "approve" ? "Profile approved" : "Sent back to the talent" });
    } catch (err) {
      toast({ title: "Couldn't submit", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <QueueShell
      isPending={isPending}
      isError={isError}
      error={error}
      isEmpty={(profiles ?? []).length === 0}
      emptyIcon={UserCheck}
      emptyTitle="No profiles awaiting review"
      emptyBody="Submitted talent profiles appear here for approval."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(profiles ?? []).map((profile) => (
          <Card key={profile.talentProfileId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading text-lg text-ivory truncate">{profile.displayName}</p>
                <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-1">
                  Submitted{" "}
                  {profile.submittedAtUtc
                    ? new Date(profile.submittedAtUtc).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <span className="shrink-0 text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border border-warning/30 text-warning rounded-full">
                {profile.profileStatus}
              </span>
            </div>

            <textarea
              value={reasons[profile.talentProfileId] ?? ""}
              onChange={(e) =>
                setReasons((r) => ({ ...r, [profile.talentProfileId]: e.target.value }))
              }
              rows={2}
              maxLength={1000}
              placeholder="Reason (required to reject or request changes)"
              className="w-full mt-3 bg-transparent border border-white/10 rounded-sm p-2.5 font-body text-[0.75rem] text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition resize-none"
            />

            <div className="flex flex-wrap gap-1.5 mt-3">
              <Action tone="approve" onClick={() => act(profile.talentProfileId, "approve")} busy={moderate.isPending}>
                <Check className="w-3 h-3" strokeWidth={1.4} /> Approve
              </Action>
              <Action onClick={() => act(profile.talentProfileId, "request-changes")} busy={moderate.isPending}>
                Request changes
              </Action>
              <Action tone="reject" onClick={() => act(profile.talentProfileId, "reject")} busy={moderate.isPending}>
                <X className="w-3 h-3" strokeWidth={1.4} /> Reject
              </Action>
            </div>
          </Card>
        ))}
      </div>
    </QueueShell>
  );
}

// ---- media -----------------------------------------------------------------

function MediaQueue() {
  const { data: media, isPending, isError, error } = useMediaReviews("PendingReview");
  const moderate = useModerateMedia();
  const [visibility, setVisibility] = useState({});
  const [reasons, setReasons] = useState({});

  const act = async (mediaId, action) => {
    const reason = (reasons[mediaId] ?? "").trim();
    if (action === "reject" && !reason) {
      toast({ title: "A reason is required", variant: "destructive" });
      return;
    }
    try {
      await moderate.mutateAsync({
        mediaId,
        action,
        visibility: visibility[mediaId] ?? "Public",
        reason,
      });
      toast({ title: action === "approve" ? "Media approved" : "Media rejected" });
    } catch (err) {
      toast({ title: "Couldn't submit", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <QueueShell
      isPending={isPending}
      isError={isError}
      error={error}
      isEmpty={(media ?? []).length === 0}
      emptyIcon={ImageIcon}
      emptyTitle="No media awaiting review"
      emptyBody="Talent submissions appear here before they can be published."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {(media ?? []).map((item) => {
          const chosen = visibility[item.id] ?? "Public";
          const url = resolveMediaUrl(item.readUrl);

          return (
            <Card key={item.id} className="overflow-hidden p-0">
              <div className="relative aspect-[3/4] bg-elevated-black">
                {url ? (
                  <img src={url} alt={item.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-grey/60 text-[0.55rem] tracking-wide-luxe uppercase">
                    Preview unavailable
                  </div>
                )}
              </div>

              <div className="p-3.5 space-y-2.5">
                {item.caption && (
                  <p className="font-body text-[0.75rem] text-soft-ivory/85 line-clamp-2">{item.caption}</p>
                )}
                <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">
                  {item.mediaType} · {formatFileSize(item.sizeBytes)}
                  {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
                </p>

                {/* Visibility is chosen at approval time and is the consequential
                    decision: VIP-only restricts the item to entitled clients. */}
                <div>
                  <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-1.5">
                    Publish as
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {APPROVAL_VISIBILITIES.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setVisibility((v) => ({ ...v, [item.id]: option.value }))}
                        title={option.detail}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[0.5rem] tracking-wide-luxe uppercase transition",
                          chosen === option.value
                            ? option.value === "VipOnly"
                              ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                              : "border-success/40 text-success bg-success/5"
                            : "border-white/10 text-muted-grey hover:text-soft-ivory"
                        )}
                      >
                        {option.value === "VipOnly" ? (
                          <Crown className="w-2.5 h-2.5" strokeWidth={1.6} />
                        ) : option.value === "Public" ? (
                          <Globe className="w-2.5 h-2.5" strokeWidth={1.6} />
                        ) : null}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  value={reasons[item.id] ?? ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [item.id]: e.target.value }))}
                  placeholder="Reason (required to reject)"
                  maxLength={500}
                  className="w-full bg-transparent border border-white/10 rounded-sm px-2.5 py-2 font-body text-[0.7rem] text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
                />

                <div className="flex gap-1.5">
                  <Action tone="approve" onClick={() => act(item.id, "approve")} busy={moderate.isPending}>
                    <Check className="w-3 h-3" strokeWidth={1.4} /> Approve
                  </Action>
                  <Action tone="reject" onClick={() => act(item.id, "reject")} busy={moderate.isPending}>
                    <X className="w-3 h-3" strokeWidth={1.4} /> Reject
                  </Action>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </QueueShell>
  );
}

// ---- reviews ---------------------------------------------------------------

function ReviewQueue() {
  const { data, isPending, isError, error } = useReviewModeration("Pending");
  const moderate = useModerateReview();
  const [reasons, setReasons] = useState({});
  const reviews = data?.items ?? [];

  const act = async (reviewId, action) => {
    try {
      await moderate.mutateAsync({ reviewId, action, reason: (reasons[reviewId] ?? "").trim() });
      toast({ title: action === "approve" ? "Review published" : "Review withheld" });
    } catch (err) {
      toast({ title: "Couldn't submit", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <QueueShell
      isPending={isPending}
      isError={isError}
      error={error}
      isEmpty={reviews.length === 0}
      emptyIcon={Star}
      emptyTitle="No reviews awaiting moderation"
      emptyBody="Client reviews appear here before they are published."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {reviews.map((review) => (
          <Card key={review.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "w-3.5 h-3.5",
                      n <= review.rating ? "text-rose-gold fill-rose-gold" : "text-muted-grey/40"
                    )}
                    strokeWidth={1.2}
                  />
                ))}
              </div>
              <span className="text-[0.55rem] text-muted-grey shrink-0">
                {review.talentDisplayName}
              </span>
            </div>

            {review.title && (
              <p className="font-heading text-base text-ivory mt-2.5">{review.title}</p>
            )}
            <p className="font-body text-[0.8rem] text-soft-ivory/85 mt-1.5 leading-relaxed whitespace-pre-line">
              {review.body}
            </p>

            <input
              value={reasons[review.id] ?? ""}
              onChange={(e) => setReasons((r) => ({ ...r, [review.id]: e.target.value }))}
              placeholder="Reason (optional)"
              maxLength={500}
              className="w-full mt-3 bg-transparent border border-white/10 rounded-sm px-2.5 py-2 font-body text-[0.7rem] text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
            />

            <div className="flex gap-1.5 mt-3">
              <Action tone="approve" onClick={() => act(review.id, "approve")} busy={moderate.isPending}>
                <Check className="w-3 h-3" strokeWidth={1.4} /> Publish
              </Action>
              <Action tone="reject" onClick={() => act(review.id, "reject")} busy={moderate.isPending}>
                <X className="w-3 h-3" strokeWidth={1.4} /> Reject
              </Action>
            </div>
          </Card>
        ))}
      </div>
    </QueueShell>
  );
}

// ---- VIP -------------------------------------------------------------------

function VipQueue() {
  const { data, isPending, isError, error } = useVipRequests("Pending");
  const decide = useDecideVipRequest();
  const [notes, setNotes] = useState({});
  const [expiry, setExpiry] = useState({});
  const requests = data?.items ?? [];

  const act = async (requestId, action) => {
    const note = (notes[requestId] ?? "").trim();
    if (action === "decline" && !note) {
      toast({ title: "A reason is required to decline", variant: "destructive" });
      return;
    }
    try {
      await decide.mutateAsync({
        requestId,
        action,
        // A date input gives a local calendar date; send it as an instant so the server
        // stores a real UTC expiry rather than a bare date it has to guess a time for.
        expiresAtUtc: expiry[requestId] ? new Date(`${expiry[requestId]}T23:59:59`).toISOString() : null,
        note,
      });
      toast({ title: action === "approve" ? "VIP access granted" : "Request declined" });
    } catch (err) {
      toast({ title: "Couldn't submit", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <QueueShell
      isPending={isPending}
      isError={isError}
      error={error}
      isEmpty={requests.length === 0}
      emptyIcon={Crown}
      emptyTitle="No VIP requests awaiting review"
      emptyBody="Client requests for VIP access appear here. Access is granted by hand — never automatically."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {requests.map((request) => (
          <Card key={request.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading text-base text-ivory truncate">
                  {request.clientPreferredName || request.clientEmail}
                </p>
                {request.clientPreferredName && (
                  <p className="text-[0.6rem] font-body text-muted-grey truncate mt-0.5">
                    {request.clientEmail}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey">
                {new Date(request.createdAtUtc).toLocaleDateString()}
              </span>
            </div>

            {request.message && (
              <p className="font-body text-[0.8rem] text-soft-ivory/85 mt-3 leading-relaxed whitespace-pre-line">
                {request.message}
              </p>
            )}

            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">
                  Expires (optional — blank is open-ended)
                </span>
                <input
                  type="date"
                  value={expiry[request.id] ?? ""}
                  onChange={(e) => setExpiry((x) => ({ ...x, [request.id]: e.target.value }))}
                  className="w-full mt-1 bg-transparent border border-white/10 rounded-sm px-2.5 py-2 font-body text-[0.7rem] text-ivory focus:outline-none focus:border-rose-gold/50 transition"
                />
              </label>

              <input
                value={notes[request.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [request.id]: e.target.value }))}
                placeholder="Internal note — never shown to the client"
                maxLength={1000}
                className="w-full bg-transparent border border-white/10 rounded-sm px-2.5 py-2 font-body text-[0.7rem] text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
              />
            </div>

            <div className="flex gap-1.5 mt-3">
              <Action tone="approve" onClick={() => act(request.id, "approve")} busy={decide.isPending}>
                <Crown className="w-3 h-3" strokeWidth={1.4} /> Grant VIP
              </Action>
              <Action tone="reject" onClick={() => act(request.id, "decline")} busy={decide.isPending}>
                <X className="w-3 h-3" strokeWidth={1.4} /> Decline
              </Action>
            </div>
          </Card>
        ))}
      </div>
    </QueueShell>
  );
}

// ---- shared ----------------------------------------------------------------

function QueueShell({ isPending, isError, error, isEmpty, emptyIcon, emptyTitle, emptyBody, children }) {
  if (isPending) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-20 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
    );
  }

  if (isEmpty) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody} />;
  }

  return children;
}

function Action({ tone, onClick, busy, children }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-sm border text-[0.55rem] tracking-luxe uppercase font-body transition disabled:opacity-50",
        tone === "approve"
          ? "border-success/40 text-success hover:bg-success/10"
          : tone === "reject"
            ? "border-error/30 text-error hover:bg-error/10"
            : "border-white/10 text-muted-grey hover:text-ivory hover:border-white/25"
      )}
    >
      {children}
    </button>
  );
}
