import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar, MapPin, Loader2, Image as ImageIcon, Star, ChevronRight, AlertCircle,
} from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";

import { formatBookingDate, formatBookingTime, presentBookingStatus } from "@/services/bookingService";
import { presentProfileStatus, presentAvailabilityStatus, AVAILABILITY_STATUSES } from "@/services/talentProfileService";
import { presentModerationStatus } from "@/services/talentMediaService";
import {
  useMyTalentProfile, useMyAvailability, useUpdateAvailabilityStatus,
  useUpcomingTalentBookings, useMyMedia, useMyTalentReviews,
} from "@/features/talent/hooks";
import { toast } from "@/components/ui/use-toast";

/**
 * The talent's dashboard.
 *
 * Two states matter and are kept strictly apart: PROFILE STATUS is management-owned and
 * decides whether clients can see you at all; AVAILABILITY STATUS is yours and decides
 * how you are presented when they do. Conflating them would let a talent believe toggling
 * availability had unpublished their profile, or vice versa.
 */
export default function TalentPortal() {
  const { data: profile, isPending, isError, error } = useMyTalentProfile();
  const { upcoming } = useUpcomingTalentBookings();
  const { data: media } = useMyMedia();
  const { data: reviews } = useMyTalentReviews();

  const awaitingSubmission = (media ?? []).filter(
    (m) => presentModerationStatus(m.moderationStatus).canSubmit
  ).length;
  const awaitingResponse = (reviews ?? []).filter(
    (r) => r.status === "Approved" && !r.talentResponse
  ).length;

  if (isPending) {
    return (
      <div className="lustra-marble min-h-screen py-24 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="lustra-marble min-h-screen px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">Couldn't load your portal</p>
        <p className="mt-3 font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      </div>
    );
  }

  const status = presentProfileStatus(profile.profileStatus);

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Talent Portal"
        title={`Welcome, ${profile.displayName.split(" ")[0]}`}
        subtitle="Manage your profile, availability, photography and engagements."
      />
      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        {/* Profile status — management-owned. */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Eyebrow>Profile</Eyebrow>
              <p
                className={cn(
                  "font-heading text-2xl mt-1",
                  status.isLive ? "text-success" : "text-ivory"
                )}
              >
                {status.label}
              </p>
              <p className="font-body text-[0.65rem] text-muted-grey mt-1.5 leading-relaxed max-w-md">
                {status.detail}
              </p>
            </div>
            <Link
              to="/talent-profile"
              className="shrink-0 text-[0.6rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-4 py-2 rounded-sm hover:bg-rose-gold/5 transition"
            >
              Edit profile
            </Link>
          </div>

          {profile.isVerified && (
            <p className="mt-4 pt-4 border-t border-white/[0.06] text-[0.55rem] tracking-wide-luxe uppercase text-rose-gold/80">
              Verified by Lustra
            </p>
          )}
        </Card>

        <AvailabilityCard currentStatus={profile.availabilityStatus} />

        {/* Things needing the talent's attention — only shown when they exist. */}
        {(awaitingSubmission > 0 || awaitingResponse > 0) && (
          <Card className="p-4">
            <Eyebrow>Needs your attention</Eyebrow>
            <div className="mt-3 space-y-2">
              {awaitingSubmission > 0 && (
                <ActionRow
                  to="/talent-media"
                  icon={ImageIcon}
                  label={`${awaitingSubmission} media ${awaitingSubmission === 1 ? "item" : "items"} not submitted for review`}
                />
              )}
              {awaitingResponse > 0 && (
                <ActionRow
                  to="/talent-reviews"
                  icon={Star}
                  label={`${awaitingResponse} ${awaitingResponse === 1 ? "review" : "reviews"} you can respond to`}
                />
              )}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>Upcoming Engagements</Eyebrow>
            <Link
              to="/agency-calendar"
              className="inline-flex items-center gap-1 text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 hover:text-rose-gold transition"
            >
              <Calendar className="w-3 h-3" /> Calendar
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <p className="font-body text-sm text-muted-grey py-4">
              You have no confirmed engagements coming up.
            </p>
          ) : (
            <div className="space-y-1">
              {upcoming.slice(0, 5).map((booking) => {
                const bookingStatus = presentBookingStatus(booking.status);
                return (
                  <Link
                    key={booking.id}
                    to={`/talent-bookings/${booking.id}`}
                    className="flex items-center justify-between gap-3 py-3 border-b border-white/[0.04] last:border-0 group"
                  >
                    <div className="min-w-0">
                      <p className="font-body text-sm text-ivory truncate">
                        {booking.bookingReference}
                      </p>
                      <p className="font-body text-[0.65rem] text-muted-grey mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" strokeWidth={1.2} />
                        {formatBookingDate(booking.confirmedDate)}
                        {booking.startTime ? ` · ${formatBookingTime(booking.startTime)}` : ""}
                      </p>
                    </div>
                    {/* Category and status, not a fee — the appointment API sends the
                        talent no money, by design. */}
                    <div className="text-right shrink-0">
                      <p className="font-heading text-base text-light-rose-gold">
                        {booking.engagementCategory}
                      </p>
                      <span className="text-[0.5rem] tracking-wide-luxe uppercase text-success mt-1 block">
                        {bookingStatus.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/**
 * Availability status — the talent's own lever.
 *
 * Saving is immediate and does NOT go through profile review: availability is operational
 * data, not published profile content. The copy says so, because a talent who thinks this
 * needs approval will leave a stale status up.
 */
function AvailabilityCard({ currentStatus }) {
  const { data: availability } = useMyAvailability();
  const updateStatus = useUpdateAvailabilityStatus();
  const status = availability?.status ?? currentStatus;

  const change = async (next) => {
    if (next === status) return;
    try {
      await updateStatus.mutateAsync({
        status: next,
        note: availability?.note ?? null,
        timeZone: availability?.timeZone ?? null,
      });
      toast({ title: "Availability updated", description: presentAvailabilityStatus(next) });
    } catch (err) {
      toast({ title: "Couldn't update", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Availability</Eyebrow>
          <p className="font-heading text-2xl text-ivory mt-1">
            {presentAvailabilityStatus(status)}
          </p>
          <p className="font-body text-[0.65rem] text-muted-grey mt-1.5 leading-relaxed max-w-md">
            Management sees this when matching inquiries. It takes effect immediately and
            does not need review.
          </p>
        </div>
        <Link
          to="/talent-availability"
          className="shrink-0 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
        >
          Calendar →
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {AVAILABILITY_STATUSES.map((option) => (
          <button
            key={option.value}
            onClick={() => change(option.value)}
            disabled={updateStatus.isPending}
            className={cn(
              "px-3 py-1.5 rounded-full border text-[0.55rem] tracking-wide-luxe uppercase font-body transition disabled:opacity-50",
              status === option.value
                ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                : "border-white/10 text-muted-grey hover:text-soft-ivory"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {availability?.note && (
        <p className="font-body text-[0.65rem] text-soft-ivory/70 mt-3 pt-3 border-t border-white/[0.06]">
          {availability.note}
        </p>
      )}
    </Card>
  );
}

function ActionRow({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 p-3 rounded-sm border border-rose-gold/20 bg-rose-gold/[0.03] hover:border-rose-gold/45 transition group"
    >
      <AlertCircle className="w-3.5 h-3.5 text-rose-gold/80 shrink-0" strokeWidth={1.3} />
      <Icon className="w-3.5 h-3.5 text-muted-grey shrink-0" strokeWidth={1.2} />
      <span className="flex-1 font-body text-[0.7rem] text-soft-ivory/85">{label}</span>
      <ChevronRight
        className="w-3.5 h-3.5 text-muted-grey group-hover:text-rose-gold transition shrink-0"
        strokeWidth={1.2}
      />
    </Link>
  );
}
