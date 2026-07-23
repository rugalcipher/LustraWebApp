import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, RotateCw, Lock, ExternalLink, CheckCircle2,
  ShieldQuestion, UserCheck, Ban, Eye, Send, X,
} from "lucide-react";
import { Card } from "@/components/lustra/Primitives";
import { toUserMessage } from "@/api/problemDetails";
import {
  useTalentApplication,
  useTalentApplicationPermissions,
  useAddApplicationNote,
  useMarkUnderReview,
  useRequestChanges,
  useRejectApplication,
  useApproveApplication,
} from "@/features/talentApplication/hooks";
import StatusPill, { statusLabel } from "@/features/talentApplication/StatusPill";
import PrivatePhoto from "@/features/talentApplication/PrivatePhoto";
import ConfirmAction from "@/features/talentApplication/ConfirmAction";
import { useTalentGrades } from "@/features/admin/gradeHooks";
import { formatMinor } from "@/services/talentGradeService";

/**
 * One talent application, in full, for Management review.
 *
 * Two distinctions this page exists to keep straight:
 *
 *  1. **Approved is not Published.** Approval converts the application into a
 *     talent profile and issues an activation invitation; whether that profile
 *     is publicly visible is a separate decision made here, deliberately, by a
 *     reviewer holding `TalentApplications.Approve`. The applicant's
 *     `publishOnApproval` is shown as what it is — a preference.
 *  2. **Internal notes are internal.** They come back on the Management detail
 *     endpoint and are never shown to the applicant, so every note is rendered
 *     inside a panel that says so.
 *
 * Action buttons are hidden without the matching permission. That is a courtesy,
 * not a control: the API re-authorizes every one of these calls.
 */

const rowsFor = (application) => [
  ["Legal name", [application.legalFirstName, application.legalMiddleNames, application.legalSurname].filter(Boolean).join(" ")],
  ["Requested display name", application.requestedDisplayName],
  ["Email", application.email],
  ["Cellphone", application.cellphoneNumber],
  ["WhatsApp", application.whatsAppNumber || "—"],
  ["Location", application.cityName || application.cityFreeText || "—"],
  ["Date of birth", `${new Date(application.dateOfBirth).toLocaleDateString()} (age ${application.age})`],
  ["Adult declaration", application.isAdultDeclared ? "Declared 18 or older" : "NOT declared"],
  ["Consent to contact", application.consentToContact ? "Given" : "Not given"],
  [
    "Requested rate",
    application.requestedHourlyRate != null
      ? `${application.currencyCode ?? ""} ${application.requestedHourlyRate}`.trim()
      : "Not specified",
  ],
];

// The currencies Lustra prices in — must match the backend allow-list.
const SUPPORTED_CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AED"];

// The pricing choice starts unconfigured; the reviewer picks grade-linked or custom.
const EMPTY_PRICING = {
  mode: "unconfigured",
  gradeId: "",
  usePayoutDefault: true,
  payoutOverride: "", // major currency
  customClient: "", // major currency
  customPayout: "", // major currency
  currency: "ZAR",
};

// Amounts are entered in MAJOR currency; convert to minor units, treating blank/invalid as null.
function toMinorOrNull(major) {
  const trimmed = String(major ?? "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/**
 * Turns the pricing choice into the backend `SetCommercialTermsRequest` (or null for
 * unconfigured), applying the SAME validation the server enforces so the reviewer sees the
 * problem before submitting. Returns `{ request, error }`.
 */
function commercialTermsFrom(pricing, grades) {
  if (pricing.mode === "unconfigured") return { request: null, error: null };

  if (pricing.mode === "gradeLinked") {
    const grade = (grades ?? []).find((g) => g.id === pricing.gradeId);
    if (!grade) return { request: null, error: "Choose a grade to price the talent." };
    if (pricing.usePayoutDefault) {
      return { request: { pricingMode: "GradeLinked", gradeId: grade.id, usePayoutGradeDefault: true }, error: null };
    }
    const payout = toMinorOrNull(pricing.payoutOverride);
    if (payout === null) return { request: null, error: "Enter the talent payout, or use the grade default." };
    if (payout < 0) return { request: null, error: "The talent payout cannot be negative." };
    if (payout > grade.clientHourlyRateMinor) return { request: null, error: "The talent payout cannot exceed the client rate." };
    return {
      request: { pricingMode: "GradeLinked", gradeId: grade.id, usePayoutGradeDefault: false, talentHourlyPayoutMinor: payout },
      error: null,
    };
  }

  // Custom
  const client = toMinorOrNull(pricing.customClient);
  const payout = toMinorOrNull(pricing.customPayout);
  if (client === null || payout === null) return { request: null, error: "Custom pricing needs both a client rate and a talent payout." };
  if (!SUPPORTED_CURRENCIES.includes(pricing.currency)) return { request: null, error: "Choose a supported currency." };
  if (client <= 0) return { request: null, error: "The client hourly rate must be greater than zero." };
  if (payout < 0) return { request: null, error: "The talent payout cannot be negative." };
  if (payout > client) return { request: null, error: "The talent payout cannot exceed the client rate." };
  return {
    request: {
      pricingMode: "Custom",
      customClientHourlyRateMinor: client,
      talentHourlyPayoutMinor: payout,
      currencyCode: pricing.currency,
    },
    error: null,
  };
}

const pricingTabCls = (active) =>
  `flex-1 px-2 py-1.5 rounded-sm font-body text-meta tracking-luxe uppercase transition ${
    active ? "bg-rose-gold/15 text-rose-gold border border-rose-gold/40" : "text-muted-grey border border-white/10 hover:text-ivory"
  }`;
const pricingInputCls =
  "w-full bg-card-black/60 border border-white/10 rounded-sm px-3 py-2 font-body text-body text-ivory focus:outline-none focus:border-rose-gold/50";

/**
 * Prices the new talent on approval — grade-linked or custom — or leaves them unconfigured to
 * price later. Grade-linked follows the grade's default payout unless the reviewer overrides it;
 * custom carries its own client rate and payout. A gross-margin preview and the same validation
 * the server runs are shown inline. Client rate and margin are staff-only; this modal is behind
 * the approval permission.
 */
function PricingSelector({ grades, value, onChange }) {
  const active = (grades ?? []).filter((g) => g.isActive);
  const set = (patch) => onChange({ ...value, ...patch });

  const grade = active.find((g) => g.id === value.gradeId) ?? null;
  const gradeMargin =
    grade
      ? grade.clientHourlyRateMinor -
        (value.usePayoutDefault ? grade.defaultTalentPayoutMinor : toMinorOrNull(value.payoutOverride) ?? 0)
      : null;
  const customClientMinor = toMinorOrNull(value.customClient);
  const customPayoutMinor = toMinorOrNull(value.customPayout);
  const customMargin =
    customClientMinor !== null && customPayoutMinor !== null ? customClientMinor - customPayoutMinor : null;

  const { error } = commercialTermsFrom(value, grades);

  return (
    <div className="space-y-2.5 rounded-sm border border-white/10 bg-card-black/40 p-3">
      <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">Pricing</p>
      <div className="flex gap-1.5">
        <button type="button" className={pricingTabCls(value.mode === "gradeLinked")} onClick={() => set({ mode: "gradeLinked" })}>
          Grade-linked
        </button>
        <button type="button" className={pricingTabCls(value.mode === "custom")} onClick={() => set({ mode: "custom" })}>
          Custom
        </button>
        <button type="button" className={pricingTabCls(value.mode === "unconfigured")} onClick={() => set({ mode: "unconfigured" })}>
          Set later
        </button>
      </div>

      {value.mode === "gradeLinked" && (
        <div className="space-y-2">
          <select
            aria-label="Grade"
            value={value.gradeId}
            onChange={(e) => set({ gradeId: e.target.value })}
            className={pricingInputCls}
          >
            <option value="">Select a grade…</option>
            {active.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {formatMinor(g.clientHourlyRateMinor, g.currencyCode)}/hr
              </option>
            ))}
          </select>
          {grade && (
            <>
              <div className="flex justify-between font-body text-meta text-muted-grey">
                <span>Client / hr</span>
                <span className="text-soft-ivory/85">{formatMinor(grade.clientHourlyRateMinor, grade.currencyCode)}</span>
              </div>
              <div className="flex justify-between font-body text-meta text-muted-grey">
                <span>Default payout / hr</span>
                <span className="text-soft-ivory/85">{formatMinor(grade.defaultTalentPayoutMinor, grade.currencyCode)}</span>
              </div>
              <label className="flex items-center gap-2 font-body text-meta text-soft-ivory/85">
                <input
                  type="checkbox"
                  checked={value.usePayoutDefault}
                  onChange={(e) => set({ usePayoutDefault: e.target.checked })}
                />
                Use the grade default payout
              </label>
              {!value.usePayoutDefault && (
                <input
                  aria-label="Talent payout per hour"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Talent payout / hr"
                  value={value.payoutOverride}
                  onChange={(e) => set({ payoutOverride: e.target.value })}
                  className={pricingInputCls}
                />
              )}
              <div className="flex justify-between font-body text-meta pt-1 border-t border-white/10">
                <span className="text-muted-grey">Gross margin / hr</span>
                <span className="text-success">{formatMinor(gradeMargin, grade.currencyCode)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {value.mode === "custom" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Custom client rate per hour"
              type="number"
              min="0"
              step="0.01"
              placeholder="Client / hr"
              value={value.customClient}
              onChange={(e) => set({ customClient: e.target.value })}
              className={pricingInputCls}
            />
            <input
              aria-label="Custom talent payout per hour"
              type="number"
              min="0"
              step="0.01"
              placeholder="Talent / hr"
              value={value.customPayout}
              onChange={(e) => set({ customPayout: e.target.value })}
              className={pricingInputCls}
            />
          </div>
          <select
            aria-label="Currency"
            value={value.currency}
            onChange={(e) => set({ currency: e.target.value })}
            className={pricingInputCls}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex justify-between font-body text-meta pt-1 border-t border-white/10">
            <span className="text-muted-grey">Gross margin / hr</span>
            <span className="text-success">{formatMinor(customMargin, value.currency)}</span>
          </div>
        </div>
      )}

      {value.mode === "unconfigured" && (
        <p className="font-body text-meta text-warning">
          The talent is created with pricing required — set commercial terms on their record before booking.
        </p>
      )}

      {error && value.mode !== "unconfigured" && (
        <p className="font-body text-meta text-destructive">{error}</p>
      )}
    </div>
  );
}

function Timestamps({ application }) {
  const entries = [
    ["Created", application.createdAtUtc],
    ["Submitted", application.submittedAtUtc],
    ["Reviewed", application.reviewedAtUtc],
    ["Converted to talent", application.convertedAtUtc],
  ].filter(([, value]) => Boolean(value));

  return (
    <ol className="space-y-2">
      {entries.map(([label, value]) => (
        <li key={label} className="flex justify-between gap-4">
          <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">{label}</span>
          <span className="font-body text-helper text-soft-ivory/85">
            {new Date(value).toLocaleString()}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function TalentApplicationReview() {
  const { id } = useParams();
  const query = useTalentApplication(id);
  const { canReview, canApprove } = useTalentApplicationPermissions();

  const [dialog, setDialog] = useState(null); // null | "underReview" | "changes" | "reject" | "approve" | "approveAndPublish"
  const [actionError, setActionError] = useState("");
  const [note, setNote] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [approval, setApproval] = useState(null);
  // How to price the new talent on approval — grade-linked, custom, or left unconfigured to
  // price later. Saved atomically with the approval.
  const [pricing, setPricing] = useState(EMPTY_PRICING);

  // Active grades to offer on approval, gated on TalentGrades.View — a reviewer without it
  // simply gets no grade options and prices custom or leaves the talent unconfigured.
  const grades = useTalentGrades(false);

  const addNote = useAddApplicationNote(id);
  const markUnderReview = useMarkUnderReview(id);
  const requestChanges = useRequestChanges(id);
  const reject = useRejectApplication(id);
  const approve = useApproveApplication(id);

  /**
   * Minted once per opened dialog, not per attempt: a retry after a timeout must
   * reuse the key so the server recognises it and cannot convert twice.
   */
  const idempotencyKey = useMemo(
    () => (dialog?.startsWith("approve") ? crypto.randomUUID() : null),
    [dialog]
  );

  const application = query.data;
  const busy =
    markUnderReview.isPending || requestChanges.isPending || reject.isPending || approve.isPending;

  const close = () => {
    setDialog(null);
    setActionError("");
    setPricing(EMPTY_PRICING);
  };

  const run = async (promise) => {
    setActionError("");
    try {
      return await promise;
    } catch (error) {
      setActionError(toUserMessage(error));
      throw error;
    }
  };

  async function confirm(reason) {
    try {
      if (dialog === "underReview") await run(markUnderReview.mutateAsync());
      else if (dialog === "changes") await run(requestChanges.mutateAsync(reason));
      else if (dialog === "reject") await run(reject.mutateAsync(reason));
      else if (dialog === "approve" || dialog === "approveAndPublish") {
        // Price the talent atomically on approval. The same validation the server runs is applied
        // here first, so a bad custom/grade combination is caught before the irreversible approve.
        const { request: commercialTerms, error: pricingError } = commercialTermsFrom(pricing, grades.data);
        if (pricingError) {
          setActionError(pricingError);
          return;
        }
        const result = await run(
          approve.mutateAsync({
            request: {
              createLogin: true,
              sendActivationEmail: true,
              publishImmediately: dialog === "approveAndPublish",
              // null copies every photograph. Management-selected application
              // photographs arrive already approved — they have just been
              // reviewed here, and sending them round a second moderation queue
              // would re-ask a question that was answered on this screen.
              mediaIdsToCopy: null,
              changeSummary: reason || null,
              // Grade-linked or custom terms, saved atomically; the effective client rate becomes
              // the public starting price. Null leaves the talent Unconfigured ("pricing required").
              commercialTerms,
            },
            idempotencyKey,
          })
        );
        setApproval(result);
      }
      close();
    } catch {
      // The message is already on the dialog; keep it open so the reviewer can retry.
    }
  }

  if (query.isPending) {
    return (
      <div className="px-5 lg:px-8 py-6">
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
          <span className="font-body text-helper text-muted-grey">Loading application…</span>
        </Card>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="px-5 lg:px-8 py-6">
        <Card className="p-6 space-y-3" role="alert">
          <p className="flex items-center gap-2 font-body text-body text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {toUserMessage(query.error)}
          </p>
          <button
            onClick={() => query.refetch()}
            className="inline-flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
          </button>
        </Card>
      </div>
    );
  }

  const published = Boolean(approval?.published);
  const converted = Boolean(application.convertedTalentProfileId);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5">
      <Link
        to="/admin/talent-applications"
        className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to queue
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">
            {application.reference}
          </p>
          <h1 className="font-heading font-light text-3xl text-ivory mt-1">
            {application.requestedDisplayName}
          </h1>
        </div>
        <StatusPill status={application.status} />
      </div>

      {/* The approval result, exactly as the API returned it. */}
      {approval && (
        <Card className="p-4 space-y-2 border-success/30">
          <p className="flex items-center gap-2 font-body text-body text-success">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            Application approved. Status is now {statusLabel(approval.status)}.
          </p>
          <ul className="font-body text-helper text-soft-ivory/80 space-y-1 pl-6 list-disc">
            <li>Talent profile {approval.talentProfileId} created.</li>
            <li>
              {approval.loginCreated
                ? "A passwordless account was created. It is pending activation — the applicant cannot sign in until they set a password from the invitation email."
                : "No login was created."}
            </li>
            <li>
              {approval.activationEmailSent
                ? "Activation email sent."
                : "No activation email was sent."}
            </li>
            <li>{approval.mediaCopied} photograph(s) copied to the profile, already approved.</li>
            <li className={published ? "text-success" : "text-warning"}>
              {published
                ? "The profile has been published."
                : "The profile is NOT published. Publish it separately when you are ready."}
            </li>
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-5">
        <div className="space-y-5 min-w-0">
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg text-ivory">Applicant</h2>
            <dl className="divide-y divide-white/[0.06]">
              {rowsFor(application).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2">
                  <dt className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                    {label}
                  </dt>
                  <dd className="font-body text-helper text-soft-ivory/85 text-right break-words">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-3 pt-1">
              {application.instagramUrl && (
                <a
                  href={application.instagramUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 font-body text-helper text-rose-gold hover:underline"
                >
                  Instagram <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
              {application.additionalSocialUrl && (
                <a
                  href={application.additionalSocialUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 font-body text-helper text-rose-gold hover:underline"
                >
                  Other link <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </Card>

          <Card className="p-5 space-y-2">
            <h2 className="font-heading text-lg text-ivory">Biography</h2>
            <p className="font-body text-body text-soft-ivory/85 whitespace-pre-line">
              {application.shortBiography}
            </p>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg text-ivory">Photographs</h2>
              <span className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Private
              </span>
            </div>
            <p className="font-body text-meta text-muted-grey">
              Held privately for review. Each image is fetched with a short-lived authorised
              link and has no public address.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {application.media.map((m) => (
                <PrivatePhoto
                  key={m.id}
                  applicationId={application.id}
                  media={m}
                  onOpen={(url, item) => setLightbox({ url, name: item.originalFileName })}
                />
              ))}
            </div>
          </Card>

          {/* Management-only. Never rendered on any applicant-facing surface. */}
          <Card className="p-5 space-y-3 border-warning/20">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-warning" aria-hidden="true" />
              <h2 className="font-heading text-lg text-ivory">Internal notes</h2>
            </div>
            <p className="font-body text-meta tracking-wide-luxe uppercase text-warning">
              Management only — never shown to the applicant
            </p>

            {application.notes.length === 0 ? (
              <p className="font-body text-helper text-muted-grey">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {application.notes.map((n) => (
                  <li key={n.id} className="rounded-sm border border-white/10 p-3">
                    <p className="font-body text-body text-soft-ivory/85 whitespace-pre-line">
                      {n.note}
                    </p>
                    <p className="font-body text-meta text-muted-grey mt-1.5">
                      {n.authorDisplayName ?? "Management"} ·{" "}
                      {new Date(n.createdAtUtc).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {canReview && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  try {
                    await addNote.mutateAsync(note.trim());
                    setNote("");
                  } catch (error) {
                    setActionError(toUserMessage(error));
                  }
                }}
                className="space-y-2"
              >
                <label htmlFor="note" className="sr-only">
                  Add an internal note
                </label>
                <textarea
                  id="note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an internal note…"
                  className="w-full bg-deep-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50"
                />
                <button
                  type="submit"
                  disabled={addNote.isPending || !note.trim()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-rose-gold/40 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
                >
                  {addNote.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                  Add note
                </button>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg text-ivory">Publication</h2>
            <p className="font-body text-helper text-soft-ivory/85">
              {application.publishOnApproval
                ? "The applicant asked to be published once approved."
                : "The applicant did not ask to be published automatically."}
            </p>
            <p className="font-body text-meta text-muted-grey">
              This is their preference only. Approving an application creates a profile; it does
              not publish one. Publication is a separate decision made here.
            </p>
            {converted && (
              <p className="font-body text-meta text-success">
                A talent profile already exists for this application.
              </p>
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg text-ivory">Timeline</h2>
            <Timestamps application={application} />
            {application.decisionReason && (
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                  Reason sent to applicant
                </p>
                <p className="font-body text-helper text-soft-ivory/85 mt-1 whitespace-pre-line">
                  {application.decisionReason}
                </p>
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-2">
            <h2 className="font-heading text-lg text-ivory">Review</h2>

            {!canReview && !canApprove && (
              <p className="font-body text-helper text-muted-grey">
                You have read-only access to this application.
              </p>
            )}

            {canReview && (
              <>
                <button
                  onClick={() => setDialog("underReview")}
                  disabled={busy}
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40 disabled:opacity-40"
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Mark under review
                </button>
                <button
                  onClick={() => setDialog("changes")}
                  disabled={busy}
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-warning/40 font-body text-meta tracking-luxe uppercase text-warning hover:bg-warning/10 disabled:opacity-40"
                >
                  <ShieldQuestion className="w-3.5 h-3.5" aria-hidden="true" /> Request changes
                </button>
                <button
                  onClick={() => setDialog("reject")}
                  disabled={busy}
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-destructive/40 font-body text-meta tracking-luxe uppercase text-destructive hover:bg-destructive/10 disabled:opacity-40"
                >
                  <Ban className="w-3.5 h-3.5" aria-hidden="true" /> Reject
                </button>
              </>
            )}

            {canApprove && (
              <>
                <button
                  onClick={() => setDialog("approve")}
                  disabled={busy || converted}
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-success/40 font-body text-meta tracking-luxe uppercase text-success hover:bg-success/10 disabled:opacity-40"
                >
                  <UserCheck className="w-3.5 h-3.5" aria-hidden="true" /> Approve
                </button>
                <button
                  onClick={() => setDialog("approveAndPublish")}
                  disabled={busy || converted}
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" /> Approve and publish
                </button>
                <p className="font-body text-meta text-muted-grey pt-1">
                  Approve creates the profile and invitation without making it public. Approve and
                  publish does both in one step.
                </p>
              </>
            )}

            {actionError && !dialog && (
              <p className="font-body text-meta text-destructive" role="alert">
                {actionError}
              </p>
            )}
          </Card>
        </div>
      </div>

      <ConfirmAction
        open={dialog === "underReview"}
        title="Mark under review"
        description="This claims the application for you and tells the rest of the team it is being assessed."
        confirmLabel="Mark under review"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "changes"}
        title="Request changes"
        description="The applicant receives your message and a fresh secure link to amend their application. Any earlier link stops working."
        confirmLabel="Send request"
        reason
        reasonLabel="Message to the applicant"
        reasonHint="This is read by the applicant. Say plainly what needs to change."
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "reject"}
        title="Reject application"
        description="This closes the application. The applicant is told the outcome and the reason you give here."
        confirmLabel="Reject application"
        tone="destructive"
        reason
        reasonLabel="Reason"
        reasonHint="Recorded against the application and sent to the applicant."
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "approve"}
        title="Approve application"
        description="This creates a talent profile and a passwordless account, and emails an activation invitation. The applicant cannot sign in until they activate it. The profile will NOT be published."
        confirmLabel="Approve"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      >
        <PricingSelector grades={grades.data} value={pricing} onChange={setPricing} />
      </ConfirmAction>

      <ConfirmAction
        open={dialog === "approveAndPublish"}
        title="Approve and publish"
        description="This creates the talent profile and account as above, and additionally makes the profile publicly visible immediately."
        confirmLabel="Approve and publish"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      >
        <p className="font-body text-meta text-warning">
          Publishing is public and immediate.{" "}
          {application.publishOnApproval
            ? "The applicant asked to be published."
            : "Note that the applicant did NOT ask to be published automatically."}
        </p>
        <PricingSelector grades={grades.data} value={pricing} onChange={setPricing} />
      </ConfirmAction>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-noir/90" onClick={() => setLightbox(null)} />
          <div role="dialog" aria-modal="true" aria-label={lightbox.name} className="relative max-h-full">
            <button
              onClick={() => setLightbox(null)}
              aria-label="Close photograph"
              className="absolute -top-2 -right-2 p-2 rounded-full bg-deep-black border border-white/15 text-soft-ivory hover:text-rose-gold"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.name}
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-full object-contain rounded-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
