import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ShieldCheck, Image as ImageIcon, ExternalLink, EyeOff } from "lucide-react";
import { describePublicationBlocker } from "@/services/talentAdminService";

/**
 * Whether a talent may currently be public, and exactly what is stopping them.
 *
 * **Every value here comes from the server.** The frontend does not decide
 * eligibility and must never try: it sees a partial media list at best, and a
 * locally-guessed verdict would disagree with the API that actually refuses the
 * action — which is how an operator ends up staring at a green badge and a 422.
 *
 * The loud case is `hasPublicationIssue`: the profile is public or featured while
 * failing the rules. That is a live profile showing something it should not, and
 * it gets an alarming treatment. A profile that is merely unpublishable is not
 * alarming — nothing is on display.
 *
 * @param {{
 *   talent: object,
 *   onOpenMedia?: () => void,
 *   onUnpublish?: () => void,
 *   canUnpublish?: boolean,
 * }} props
 */
export default function PublicationHealthPanel({
  talent,
  onOpenMedia,
  onUnpublish,
  canUnpublish = false,
}) {
  const blockers = talent.publicationEligibilityBlockers ?? [];
  const issue = talent.hasPublicationIssue;
  const eligible = talent.isPublicationEligible;

  return (
    <div
      className={
        issue
          ? "rounded-sm border border-destructive/50 bg-destructive/[0.07] p-4 space-y-3"
          : "space-y-3"
      }
      role={issue ? "alert" : undefined}
      data-testid="publication-health"
    >
      <div className="flex items-center gap-2">
        {eligible ? (
          <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
        ) : (
          <ShieldAlert
            className={`w-3.5 h-3.5 shrink-0 ${issue ? "text-destructive" : "text-warning"}`}
            aria-hidden="true"
          />
        )}
        <p
          className={`font-body text-meta tracking-luxe uppercase ${
            eligible ? "text-success" : issue ? "text-destructive" : "text-warning"
          }`}
        >
          {issue
            ? "Publication issue"
            : eligible
              ? "Meets publication requirements"
              : "Cannot be published yet"}
        </p>
      </div>

      {issue && (
        <p className="font-body text-body text-soft-ivory/85">
          This profile is {talent.isPublic ? "published" : ""}
          {talent.isPublic && talent.isFeatured ? " and " : ""}
          {talent.isFeatured ? "featured" : ""} but no longer meets the requirements. It is
          already hidden from public discovery, which re-checks these rules on every request —
          but the record should be corrected or unpublished.
        </p>
      )}

      {blockers.length > 0 && (
        <ul className="space-y-1">
          {blockers.map((code) => (
            <li
              key={code}
              className="font-body text-helper text-soft-ivory/85 flex gap-2"
              data-blocker={code}
            >
              <span aria-hidden="true" className="text-muted-grey">
                ·
              </span>
              {describePublicationBlocker(code)}
            </li>
          ))}
        </ul>
      )}

      <dl className="flex flex-wrap gap-x-5 gap-y-1">
        <div className="flex gap-1.5">
          <dt className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
            Approved public photographs
          </dt>
          <dd
            className={`font-body text-meta tabular-nums ${
              talent.approvedPublicMediaCount === 0 ? "text-warning" : "text-soft-ivory/85"
            }`}
          >
            {talent.approvedPublicMediaCount}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
            Cover
          </dt>
          <dd
            className={`font-body text-meta ${
              talent.hasValidPublicCover ? "text-soft-ivory/85" : "text-warning"
            }`}
          >
            {talent.hasValidPublicCover
              ? "Valid"
              : talent.suggestedFallbackCoverMediaId
                ? "Not set — a photograph would be used"
                : "Not set"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        {onOpenMedia && (
          <button
            type="button"
            onClick={onOpenMedia}
            className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
          >
            <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" /> Open media
          </button>
        )}
        {talent.slug && talent.isPublic && (
          <Link
            to={`/talent/${talent.slug}`}
            className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:text-rose-gold"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Open public profile
          </Link>
        )}
        {issue && canUnpublish && onUnpublish && (
          <button
            type="button"
            onClick={onUnpublish}
            className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-warning hover:underline"
          >
            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Unpublish
          </button>
        )}
      </div>
    </div>
  );
}
