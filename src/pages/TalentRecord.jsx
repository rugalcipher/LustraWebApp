import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, RotateCw, Star, Eye, EyeOff, KeyRound, MailPlus,
  Archive, RotateCcw, Copy, Check, ShieldAlert, ExternalLink,
} from "lucide-react";
import { Card } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import ConfirmAction from "@/features/talentApplication/ConfirmAction";
import MediaManager from "@/features/talentAdmin/MediaManager";
import {
  useTalentRecord, useTalentAdminPermissions, useArchiveTalent, useRestoreTalent,
  useIssueTalentInvitation, useSetTalentTemporaryPassword, useTalentArchiveImpact,
  usePublishTalent, useUnpublishTalent, useFeatureTalent, useUnfeatureTalent,
  useCanApproveProfiles,
} from "@/features/talentAdmin/hooks";
import { publicationGuidance } from "@/features/talentAdmin/publicationErrors";
import { isApiError } from "@/api/problemDetails";

/**
 * One talent's complete record.
 *
 * The account panel is the delicate part. Staff may replace a password, require
 * one to be changed, or invite someone to set their own — they may never READ
 * one. Nothing on this page renders a password, a hash, a security stamp, a
 * reset token, an invitation token or a refresh token, because the API returns
 * none of them: `hasPassword` is a boolean, and the invitation state carries an
 * id and an expiry but never the token itself.
 *
 * A temporary password is the one exception, and only in the direction that is
 * safe: it appears once, in the response that created it, and is shown to the
 * operator with a warning that no screen will produce it again.
 */

const TABS = [
  "Overview",
  "Public profile",
  "Media",
  "Rates",
  "Account & login",
];

function Rows({ entries }) {
  return (
    <dl className="divide-y divide-white/[0.06]">
      {entries
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">{label}</dt>
            <dd className="font-body text-helper text-soft-ivory/85 text-right break-words">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

/** A value the API returns exactly once. Copyable, never persisted. */
function OneTimeSecret({ value, onDismiss }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-sm border border-warning/40 bg-warning/[0.07] p-4 space-y-2">
      <p className="flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-warning">
        <KeyRound className="w-3.5 h-3.5" aria-hidden="true" /> Temporary password — shown once
      </p>
      <div className="flex items-center gap-3">
        <code className="flex-1 font-mono text-lg text-ivory break-all">{value}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/15 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" aria-hidden="true" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy
            </>
          )}
        </button>
      </div>
      <p className="font-body text-meta text-muted-grey">
        Every session has been revoked and the talent must change this when they sign in. It is
        not stored in readable form — if it is lost, set a new one.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
      >
        Dismiss
      </button>
    </div>
  );
}

export default function TalentRecord() {
  const { id } = useParams();
  const record = useTalentRecord(id);
  const { canManage, canCreate, canModerateMedia } = useTalentAdminPermissions();

  const [tab, setTab] = useState(TABS[0]);
  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState("");
  const [secret, setSecret] = useState(null);
  const [outstanding, setOutstanding] = useState(null);
  // A refusal the server explained. Held separately from actionError so it can
  // carry a link to the tab that actually fixes it.
  const [refusal, setRefusal] = useState(null);

  // Only fetched once the dialog is open: it is a preflight, not page furniture.
  const impact = useTalentArchiveImpact(id, dialog === "archive");
  const archive = useArchiveTalent(id);
  const restore = useRestoreTalent(id);
  const invite = useIssueTalentInvitation(id);
  const temporary = useSetTalentTemporaryPassword(id);
  const publish = usePublishTalent(id);
  const unpublish = useUnpublishTalent(id);
  const feature = useFeatureTalent(id);
  const unfeature = useUnfeatureTalent(id);
  const canApprove = useCanApproveProfiles();

  const busy =
    archive.isPending || restore.isPending || invite.isPending || temporary.isPending ||
    publish.isPending || unpublish.isPending || feature.isPending || unfeature.isPending;

  const close = () => {
    setDialog(null);
    setActionError("");
  };

  async function confirm(reason) {
    setActionError("");
    try {
      if (dialog === "archive") {
        const result = await archive.mutateAsync(reason);
        // The server reports the same shape back. Future appointments are NOT
        // cancelled — that is work now waiting for somebody, so it is said out
        // loud rather than discovered later.
        if (result?.futureAppointmentCount > 0) {
          setOutstanding(result);
        }
      }
      else if (dialog === "restore") await restore.mutateAsync();
      else if (dialog === "invite") await invite.mutateAsync();
      else if (dialog === "publish") await publish.mutateAsync();
      else if (dialog === "unpublish") await unpublish.mutateAsync(reason || null);
      else if (dialog === "feature") await feature.mutateAsync();
      else if (dialog === "unfeature") await unfeature.mutateAsync();
      else if (dialog === "temporary-password") {
        const result = await temporary.mutateAsync();
        // The ONLY copy of this value. Held in component state, never cached.
        if (result?.temporaryPassword) setSecret(result.temporaryPassword);
      }
      close();
    } catch (error) {
      // Branch on the machine-readable code, never on the message text.
      const guidance = isApiError(error) ? publicationGuidance(error.code) : null;
      if (guidance) {
        setRefusal(guidance);
        setDialog(null);
        return;
      }
      setActionError(toUserMessage(error));
    }
  }

  if (record.isPending) {
    return (
      <div className="px-5 lg:px-8 py-6">
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
          <span className="font-body text-helper text-muted-grey">Loading talent…</span>
        </Card>
      </div>
    );
  }

  if (record.isError) {
    return (
      <div className="px-5 lg:px-8 py-6">
        <Card className="p-6 space-y-3" role="alert">
          <p className="flex items-center gap-2 font-body text-body text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {toUserMessage(record.error)}
          </p>
          <button
            onClick={() => record.refetch()}
            className="inline-flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
          </button>
        </Card>
      </div>
    );
  }

  const talent = record.data;
  const archived = talent.profileStatus === "Archived";
  const legalName = [talent.legalFirstName, talent.legalSurname].filter(Boolean).join(" ");

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5">
      <Link
        to="/admin/talent"
        className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Talent
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">
            {talent.slug}
          </p>
          <h1 className="font-heading font-light text-3xl text-ivory mt-1">{talent.displayName}</h1>
          {legalName && (
            <p className="font-body text-helper text-muted-grey mt-0.5">{legalName}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-body text-meta tracking-wide-luxe uppercase",
              talent.isPublic
                ? "border-success/40 text-success bg-success/10"
                : "border-white/15 text-muted-grey bg-white/[0.03]"
            )}
          >
            {talent.isPublic ? (
              <>
                <Eye className="w-3 h-3" aria-hidden="true" /> Published
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" aria-hidden="true" /> Not published
              </>
            )}
          </span>
          {talent.isFeatured && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-rose-gold/40 text-rose-gold bg-rose-gold/10 font-body text-meta tracking-wide-luxe uppercase">
              <Star className="w-3 h-3" fill="currentColor" aria-hidden="true" /> Featured
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 text-soft-ivory/80 font-body text-meta tracking-wide-luxe uppercase">
            {talent.profileStatus}
          </span>
        </div>
      </div>

      {secret && <OneTimeSecret value={secret} onDismiss={() => setSecret(null)} />}

      {/* The server refused and told us why. Send the operator where it is fixable. */}
      {refusal && (
        <div className="rounded-sm border border-warning/40 bg-warning/[0.07] p-4 space-y-2" role="alert">
          <p className="flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-warning">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> {refusal.title}
          </p>
          <p className="font-body text-body text-soft-ivory/85">{refusal.body}</p>
          <div className="flex gap-3">
            {refusal.action && (
              <button
                type="button"
                onClick={() => {
                  setTab(refusal.action);
                  setRefusal(null);
                }}
                className="font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
              >
                Open {refusal.action}
              </button>
            )}
            <button
              type="button"
              onClick={() => setRefusal(null)}
              className="font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Archiving withdrew the talent but cancelled nothing. Name the work left. */}
      {outstanding && (
        <div className="rounded-sm border border-warning/40 bg-warning/[0.07] p-4 space-y-2" role="status">
          <p className="flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-warning">
            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" /> Appointments still stand
          </p>
          <p className="font-body text-body text-soft-ivory/85">
            {outstanding.displayName} is archived and withdrawn from discovery, but{" "}
            <strong>
              {outstanding.futureAppointmentCount} future{" "}
              {outstanding.futureAppointmentCount === 1 ? "appointment" : "appointments"}
            </strong>{" "}
            {outstanding.futureAppointmentCount === 1 ? "was" : "were"} NOT cancelled
            {outstanding.nextAppointmentDate
              ? `, the next on ${new Date(outstanding.nextAppointmentDate).toLocaleDateString()}`
              : ""}
            . Cancelling or reassigning them is a decision with a client on the other end, so
            it is left to you.
          </p>
          <Link
            to="/admin/appointments"
            className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
          >
            Open appointments
          </Link>
          <button
            type="button"
            onClick={() => setOutstanding(null)}
            className="block font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06]" role="tablist">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              "px-3 py-2 font-body text-meta tracking-luxe uppercase transition border-b-2 -mb-px",
              tab === name
                ? "border-rose-gold text-rose-gold"
                : "border-transparent text-muted-grey hover:text-soft-ivory"
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-5">
          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg text-ivory">Record</h2>
            <Rows
              entries={[
                ["Display name", talent.displayName],
                ["Legal name", legalName || "—"],
                ["Email", talent.email],
                ["Cellphone", talent.cellphoneNumber],
                ["WhatsApp", talent.whatsAppNumber],
                ["Location", talent.cityName],
                ["Availability", talent.availabilityStatus],
                ["Travel", talent.travelAvailable ? "Available" : "Not available"],
                ["Events", talent.eventAvailable ? "Available" : "Not available"],
                ["Verified", talent.isVerified ? "Yes" : "No"],
                [
                  "Published",
                  talent.publishedAtUtc
                    ? new Date(talent.publishedAtUtc).toLocaleDateString()
                    : "Not published",
                ],
                ["Created", new Date(talent.createdAtUtc).toLocaleDateString()],
                ["Upcoming appointments", String(talent.upcomingAppointmentCount)],
                ["Conversations", String(talent.conversationCount)],
              ]}
            />
            {talent.suspensionReason && (
              <p className="font-body text-meta text-warning">{talent.suspensionReason}</p>
            )}
          </Card>

          <Card className="p-5 space-y-2">
            <h2 className="font-heading text-lg text-ivory">Publication</h2>
            <p className="font-body text-meta text-muted-grey">
              {talent.isPublic
                ? "This profile is live in public discovery."
                : "This profile is not visible to the public."}
            </p>
            {canApprove ? (
              talent.isPublic ? (
                <button
                  onClick={() => setDialog("unpublish")}
                  disabled={busy}
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-warning/40 font-body text-meta tracking-luxe uppercase text-warning hover:bg-warning/10 disabled:opacity-40"
                >
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Unpublish
                </button>
              ) : (
                <button
                  onClick={() => setDialog("publish")}
                  disabled={busy || archived}
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-success/40 font-body text-meta tracking-luxe uppercase text-success hover:bg-success/10 disabled:opacity-40"
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Publish
                </button>
              )
            ) : (
              <p className="font-body text-meta text-muted-grey">
                Changing publication needs the profile-approval permission.
              </p>
            )}

            {/* A SEPARATE state with a separate permission. Never one toggle: a
                combined control would make "feature" imply publishing, which the
                backend refuses anyway. */}
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <h3 className="font-heading text-base text-ivory">Featured placement</h3>
              <p className="font-body text-meta text-muted-grey">
                {talent.isFeatured
                  ? "Promoted in discovery."
                  : "Not promoted. Featuring never publishes a profile — it only promotes one that is already public."}
              </p>
              {canManage &&
                (talent.isFeatured ? (
                  <button
                    onClick={() => setDialog("unfeature")}
                    disabled={busy}
                    className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40 disabled:opacity-40"
                  >
                    <Star className="w-3.5 h-3.5" aria-hidden="true" /> Remove from featured
                  </button>
                ) : (
                  <button
                    onClick={() => setDialog("feature")}
                    disabled={busy || !talent.isPublic || archived}
                    title={
                      talent.isPublic
                        ? "Promote this profile in discovery"
                        : "Only a published profile can be featured"
                    }
                    className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
                  >
                    <Star className="w-3.5 h-3.5" aria-hidden="true" /> Feature
                  </button>
                ))}
            </div>
          </Card>

          <Card className="p-5 space-y-2">
            <h2 className="font-heading text-lg text-ivory">Actions</h2>
            {!canManage && !canCreate && (
              <p className="font-body text-helper text-muted-grey">
                You have read-only access to this talent.
              </p>
            )}
            {canManage &&
              (archived ? (
                <button
                  onClick={() => setDialog("restore")}
                  disabled={busy}
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-success/40 font-body text-meta tracking-luxe uppercase text-success hover:bg-success/10 disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Restore
                </button>
              ) : (
                <button
                  onClick={() => setDialog("archive")}
                  disabled={busy}
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-warning/40 font-body text-meta tracking-luxe uppercase text-warning hover:bg-warning/10 disabled:opacity-40"
                >
                  <Archive className="w-3.5 h-3.5" aria-hidden="true" /> Archive
                </button>
              ))}
            {talent.slug && talent.isPublic && (
              <Link
                to={`/talent/${talent.slug}`}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> View public profile
              </Link>
            )}
            {actionError && !dialog && (
              <p className="font-body text-meta text-destructive" role="alert">
                {actionError}
              </p>
            )}
          </Card>
        </div>
      )}

      {tab === "Public profile" && (
        <Card className="p-5 space-y-3">
          <h2 className="font-heading text-lg text-ivory">Public profile</h2>
          <Rows
            entries={[
              ["Display name", talent.displayName],
              ["Headline", talent.headline],
              ["Location", talent.cityName],
              ["Age shown publicly", talent.isAgePublic ? "Yes" : "No"],
              ["Instagram", talent.instagramUrl],
              ["Other link", talent.additionalSocialUrl],
              ["Categories", talent.categoryIds.length ? `${talent.categoryIds.length}` : "None"],
            ]}
          />
          {talent.shortBiography && (
            <div>
              <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                Short biography
              </p>
              <p className="font-body text-body text-soft-ivory/85 mt-1 whitespace-pre-line">
                {talent.shortBiography}
              </p>
            </div>
          )}
          {talent.fullBiography && (
            <div>
              <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                Full biography
              </p>
              <p className="font-body text-body text-soft-ivory/85 mt-1 whitespace-pre-line">
                {talent.fullBiography}
              </p>
            </div>
          )}
        </Card>
      )}

      {tab === "Media" &&
        (canModerateMedia ? (
          <MediaManager profileId={id} />
        ) : (
          <Card className="p-6">
            <p className="font-body text-body text-soft-ivory/75">
              You do not have permission to moderate media.
            </p>
          </Card>
        ))}

      {tab === "Rates" && (
        <Card className="p-5 space-y-3">
          <h2 className="font-heading text-lg text-ivory">Rates</h2>
          {talent.rates.length === 0 ? (
            <p className="font-body text-helper text-muted-grey">No rates recorded.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {talent.rates.map((rate) => (
                <li key={rate.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="min-w-0">
                    <span className="block font-body text-helper text-ivory">{rate.label}</span>
                    <span className="block font-body text-meta text-muted-grey">
                      per {rate.unit} · {rate.isPublic ? "Public" : "Private"}
                      {rate.isActive ? "" : " · inactive"}
                    </span>
                  </span>
                  <span className="font-body text-helper text-soft-ivory/85 tabular-nums whitespace-nowrap">
                    {rate.currencyCode} {Number(rate.amount).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "Account & login" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-5">
          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg text-ivory">Account</h2>
            <Rows
              entries={[
                ["Status", talent.accountStatus],
                ["Email confirmed", talent.emailConfirmed ? "Yes" : "No"],
                // A boolean. Never the password, and never its hash.
                ["Password set", talent.hasPassword ? "Yes" : "No"],
                ["Can sign in", talent.hasActiveLogin ? "Yes" : "No"],
                [
                  "Last sign-in",
                  talent.lastLoginAtUtc ? new Date(talent.lastLoginAtUtc).toLocaleString() : "Never",
                ],
                ["Active sessions", String(talent.activeSessionCount)],
              ]}
            />

            {talent.accountStatus === "PendingActivation" && (
              <p className="flex items-start gap-2 font-body text-body text-warning">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                This account cannot sign in. It exists so the profile has an owner; the talent
                needs an invitation or a temporary password before they can get in. Activating
                an invitation adopts this profile rather than creating a second one.
              </p>
            )}

            <div className="pt-2 border-t border-white/[0.06]">
              <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                Invitation
              </p>
              {talent.invitation ? (
                <Rows
                  entries={[
                    ["Status", talent.invitation.status],
                    ["Expires", new Date(talent.invitation.expiresAtUtc).toLocaleString()],
                    [
                      "Used",
                      talent.invitation.usedAtUtc
                        ? new Date(talent.invitation.usedAtUtc).toLocaleString()
                        : "Not used",
                    ],
                    ["Can still be activated", talent.invitation.isActivatable ? "Yes" : "No"],
                  ]}
                />
              ) : (
                <p className="font-body text-helper text-muted-grey mt-1">
                  No invitation has been issued.
                </p>
              )}
              <p className="font-body text-meta text-muted-grey mt-2">
                The invitation link itself is never shown here — it is emailed to the talent and
                cannot be retrieved. Issue a new one to replace it.
              </p>
            </div>
          </Card>

          <Card className="p-5 space-y-2">
            <h2 className="font-heading text-lg text-ivory">Login</h2>
            {canCreate && (
              <button
                onClick={() => setDialog("invite")}
                disabled={busy}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
              >
                <MailPlus className="w-3.5 h-3.5" aria-hidden="true" />
                {talent.invitation ? "Replace invitation" : "Send invitation"}
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setDialog("temporary-password")}
                disabled={busy}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-warning/40 font-body text-meta tracking-luxe uppercase text-warning hover:bg-warning/10 disabled:opacity-40"
              >
                <KeyRound className="w-3.5 h-3.5" aria-hidden="true" /> Set temporary password
              </button>
            )}
            <p className="font-body text-meta text-muted-grey pt-1">
              Lustra cannot show an existing password. It is stored only as a hash, so the only
              options are to replace it or to invite the talent to set their own.
            </p>
            <Link
              to={`/admin/users/${talent.userId}`}
              className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40"
            >
              Full account administration
            </Link>
          </Card>
        </div>
      )}

      <ConfirmAction
        open={dialog === "publish"}
        title="Publish profile"
        description="The profile becomes visible in public discovery immediately. It needs an approved public photograph — the server refuses otherwise and will say so."
        confirmLabel="Publish"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "unpublish"}
        title="Unpublish profile"
        description="The profile leaves public discovery immediately and its featured placement is cleared. The approval is kept, so it can be republished without a second review."
        confirmLabel="Unpublish"
        tone="destructive"
        reason
        reasonLabel="Internal reason"
        reasonHint="Recorded for staff. It is not shown to the talent."
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "feature"}
        title="Feature profile"
        description="The profile is promoted in discovery. This does NOT change whether it is published — it is already public, and featuring never publishes."
        confirmLabel="Feature"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "unfeature"}
        title="Remove featured placement"
        description="The profile stops being promoted. It stays published and publicly visible."
        confirmLabel="Remove from featured"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "archive"}
        title="Archive talent"
        description="The profile is withdrawn from discovery, unpublished, unfeatured and can no longer take new appointments. It is not deleted and can be restored."
        confirmLabel="Archive"
        tone="destructive"
        reason
        reasonLabel="Reason"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      >
        {/* What archiving actually touches, read before deciding. */}
        {impact.isPending && (
          <p className="font-body text-meta text-muted-grey">Checking what this affects…</p>
        )}
        {impact.isSuccess && (
          <div className="rounded-sm border border-white/10 p-3 space-y-1.5">
            <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
              What this affects
            </p>
            <ul className="font-body text-helper text-soft-ivory/85 space-y-1 list-disc pl-5">
              <li>
                {impact.data.wasPublished ? "Will be unpublished" : "Already unpublished"}
                {impact.data.wasFeatured ? " and unfeatured" : ""}.
              </li>
              <li>
                {impact.data.mediaCount} photograph(s) and {impact.data.conversationCount}{" "}
                conversation(s) are kept, not deleted.
              </li>
              <li
                className={impact.data.futureAppointmentCount > 0 ? "text-warning" : undefined}
              >
                {impact.data.futureAppointmentCount === 0
                  ? "No future appointments."
                  : `${impact.data.futureAppointmentCount} future appointment(s) will NOT be cancelled` +
                    (impact.data.nextAppointmentDate
                      ? ` — the next is ${new Date(impact.data.nextAppointmentDate).toLocaleDateString()}.`
                      : ".")}
              </li>
            </ul>
          </div>
        )}
      </ConfirmAction>

      <ConfirmAction
        open={dialog === "restore"}
        title="Restore talent"
        description="The profile returns to approved but UNPUBLISHED. Publish it separately when you are ready."
        confirmLabel="Restore"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "invite"}
        title={talent.invitation ? "Replace invitation" : "Send invitation"}
        description={
          talent.invitation
            ? "A new activation link is emailed and the previous one stops working immediately."
            : "An activation link is emailed so the talent can set their own password. Activating it adopts this profile."
        }
        confirmLabel={talent.invitation ? "Replace invitation" : "Send invitation"}
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "temporary-password"}
        title="Set a temporary password"
        description="Every session is revoked and the talent must choose a new password when they sign in. The temporary password is shown once on this screen and can never be retrieved again."
        confirmLabel="Set temporary password"
        tone="destructive"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
    </div>
  );
}
