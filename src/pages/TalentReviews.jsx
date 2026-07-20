import React, { useState } from "react";
import { Loader2, Star } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { canRespond } from "@/services/talentEngagementService";
import { useMyTalentReviews, useRespondToReview } from "@/features/talent/hooks";

/**
 * Reviews of the talent, and their public responses.
 *
 * These carry NO client identity — the API deliberately omits it, and nothing here should
 * try to infer who wrote a review. A response can be given once and is public, which the
 * composer states before it is sent.
 */
export default function TalentReviews() {
  const { data: reviews, isPending, isError, error } = useMyTalentReviews();

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
        <p className="font-heading text-2xl text-ivory">Couldn't load your reviews</p>
        <p className="mt-3 font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      </div>
    );
  }

  const average =
    reviews.length > 0
      ? (reviews.reduce((total, r) => total + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Talent Portal"
        title="Reviews"
        subtitle="What clients said, and your responses."
      />

      <div className="max-w-luxe mx-auto px-5 py-6 space-y-4">
        {reviews.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-heading text-xl text-ivory">No reviews yet</p>
            <p className="font-body text-sm text-muted-grey mt-2">
              Reviews appear here once clients have reviewed a completed engagement and
              Lustra has approved them.
            </p>
          </Card>
        ) : (
          <>
            <Card className="p-5 flex items-center justify-between">
              <div>
                <Eyebrow>Average</Eyebrow>
                <p className="font-heading text-3xl text-ivory mt-1">{average}</p>
              </div>
              <p className="font-body text-[0.6rem] text-muted-grey text-right max-w-[14rem] leading-relaxed">
                Across {reviews.length} {reviews.length === 1 ? "review" : "reviews"} visible
                to you. Only approved reviews count toward your public rating.
              </p>
            </Card>

            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  const respond = useRespondToReview();
  const [responding, setResponding] = useState(false);
  const [text, setText] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      await respond.mutateAsync({ reviewId: review.id, response: text.trim() });
      setResponding(false);
      setText("");
      toast({ title: "Response published" });
    } catch (err) {
      toast({ title: "Couldn't respond", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <Stars value={review.rating} />
        <span className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey shrink-0">
          {review.status === "Approved"
            ? review.publishedAtUtc
              ? new Date(review.publishedAtUtc).toLocaleDateString()
              : "Published"
            : "Not published"}
        </span>
      </div>

      {review.title && <p className="font-heading text-lg text-ivory mt-3">{review.title}</p>}
      <p className="font-body text-sm text-soft-ivory/85 mt-2 leading-relaxed whitespace-pre-line">
        {review.body}
      </p>

      {review.talentResponse ? (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-[0.55rem] tracking-wide-luxe uppercase text-rose-gold/80">
            Your response
          </p>
          <p className="font-body text-sm text-soft-ivory/80 mt-1.5 leading-relaxed whitespace-pre-line">
            {review.talentResponse}
          </p>
        </div>
      ) : canRespond(review) ? (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          {responding ? (
            <form onSubmit={submit}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={1000}
                autoFocus
                placeholder="Your response…"
                className="w-full bg-transparent border border-white/10 rounded-sm p-3 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition resize-none"
              />
              <p className="font-body text-[0.6rem] text-muted-grey mt-2 leading-relaxed">
                Your response is public and can only be given once.
              </p>
              <div className="flex gap-2 mt-3">
                <LustraButton
                  type="submit"
                  size="sm"
                  className="flex-1"
                  disabled={text.trim().length === 0 || respond.isPending}
                >
                  {respond.isPending ? "Publishing…" : "Publish response"}
                </LustraButton>
                <button
                  type="button"
                  onClick={() => setResponding(false)}
                  className="flex-1 py-2.5 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-ivory transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setResponding(true)}
              className="text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 hover:text-rose-gold transition"
            >
              Respond →
            </button>
          )}
        </div>
      ) : review.status !== "Approved" ? (
        <p className="font-body text-[0.6rem] text-muted-grey mt-4 pt-4 border-t border-white/[0.06]">
          You can respond once Lustra approves this review.
        </p>
      ) : null}
    </Card>
  );
}

function Stars({ value }) {
  return (
    <div className="flex gap-1" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "w-4 h-4",
            n <= value ? "text-rose-gold fill-rose-gold" : "text-muted-grey/40"
          )}
          strokeWidth={1.2}
        />
      ))}
    </div>
  );
}
