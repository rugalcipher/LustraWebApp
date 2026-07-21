import React from "react";
import { cn } from "@/lib/utils";

/**
 * The lifecycle badge, and the filter vocabularies derived from it.
 *
 * **Approved and Published are not the same thing** and the palette says so:
 * `Approved` is a decision, `ConvertedToTalent` means a talent profile now
 * exists. Neither implies the profile is visible to the public — publication is
 * a separate Management act, and the applicant's `publishOnApproval` is only a
 * preference. Colour is never the sole signal; the label always spells it out.
 */

const TONE = {
  submitted: "border-rose-gold/40 text-rose-gold bg-rose-gold/10",
  underreview: "border-warning/40 text-warning bg-warning/10",
  changesrequested: "border-warning/40 text-warning bg-warning/10",
  approved: "border-success/40 text-success bg-success/10",
  convertedtotalent: "border-success/50 text-success bg-success/15",
  rejected: "border-destructive/40 text-destructive bg-destructive/10",
  withdrawn: "border-white/15 text-muted-grey bg-white/[0.03]",
  draft: "border-white/15 text-muted-grey bg-white/[0.03]",
};

/** Reviewer-facing wording. The raw enum name is not a sentence. */
const LABEL = {
  submitted: "Submitted",
  underreview: "Under review",
  changesrequested: "Changes requested",
  approved: "Approved — not published",
  convertedtotalent: "Approved · profile created",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  draft: "Draft — not submitted",
};

const key = (status) => (status ?? "").toLowerCase();

export function statusLabel(status) {
  return LABEL[key(status)] ?? status ?? "Unknown";
}

/** Statuses the queue can be filtered by. Draft is absent: the API never returns one. */
export const QUEUE_STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "Submitted", label: "Submitted" },
  { value: "UnderReview", label: "Under review" },
  { value: "ChangesRequested", label: "Changes requested" },
  { value: "Approved", label: "Approved" },
  { value: "ConvertedToTalent", label: "Converted to talent" },
  { value: "Rejected", label: "Rejected" },
  { value: "Withdrawn", label: "Withdrawn" },
];

export const PUBLISH_PREFERENCE_FILTERS = [
  { value: "", label: "Any preference" },
  { value: "yes", label: "Asked to publish" },
  { value: "no", label: "Did not ask to publish" },
];

export default function StatusPill({ status, className }) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-1 rounded-full border font-body text-meta tracking-wide-luxe uppercase whitespace-nowrap",
        TONE[key(status)] ?? "border-white/15 text-muted-grey bg-white/[0.03]",
        className
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
