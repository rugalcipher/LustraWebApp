import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, AlertTriangle, CheckCircle2, MessageSquareWarning } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import PublicMarketingLayout from "@/components/lustra/public/PublicMarketingLayout";
import { PUBLIC_IMAGES } from "@/components/lustra/public/publicImages";
import * as applications from "@/services/talentApplicationService";
import { saveSession, loadSession, clearSession, scrubTokenFromUrl } from "@/features/talentApplication/session";
import PhotographManager, { finalizedPhotos } from "@/features/talentApplication/PhotographManager";
import {
  CURRENCIES,
  EMPTY_DETAILS,
  toDetails,
  validateAbout,
  validateProfile,
} from "@/features/talentApplication/details";
import { toUserMessage, isApiError } from "@/api/problemDetails";

/**
 * /apply/continue — the applicant's return path after Management requests changes.
 *
 * The email link carries `application` and `token`. Both are read once, moved
 * into the session store, and then **removed from the address bar** with
 * `history.replaceState` before anything else happens. A token left in the URL
 * would reach the browser's history UI, the `Referer` header of every outbound
 * link, and any analytics script that records `location.href`; `replaceState`
 * rather than `pushState` also means the Back button cannot restore it.
 *
 * From that point the token exists only in sessionStorage and only ever travels
 * in the `X-Application-Token` header. It is never rendered, logged or copied.
 *
 * The page reads the applicant-safe status projection, which carries the
 * decision reason Management wrote *for the applicant*. Internal notes are on a
 * different endpoint behind a permission the applicant does not hold, and are
 * never fetched here.
 */

const inputCls =
  "w-full bg-deep-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body " +
  "text-ivory placeholder:text-muted-grey/70 focus:outline-none focus:border-rose-gold/50";

function Field({ label, error, children, hint, required, htmlFor }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
        {label}
        {required && <span className="text-rose-gold"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="font-body text-meta text-muted-grey">{hint}</p>}
      {error && (
        <p className="font-body text-meta text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Shell({ children }) {
  return (
    <PublicMarketingLayout
      eyebrow="Represented by Lustra"
      title="Continue your application"
      image={PUBLIC_IMAGES.forTalent}
      footerNote="Private by Design"
    >
      <div className="max-w-xl">{children}</div>
    </PublicMarketingLayout>
  );
}

/** Statuses in which the backend will accept an edit from the applicant. */
const EDITABLE = new Set(["draft", "changesrequested"]);

export default function ApplicationContinue() {
  const [params] = useSearchParams();
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | ready | invalid | resubmitted
  const [failure, setFailure] = useState("");
  const [form, setForm] = useState(EMPTY_DETAILS);
  const [editingDetails, setEditingDetails] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  /**
   * Capture the link parameters, then clear them from the URL.
   *
   * Runs before any request: if the applicant closes the tab mid-load, the token
   * must already be out of the visible history.
   */
  useEffect(() => {
    const applicationId = params.get("application");
    const token = params.get("token");

    if (applicationId && token) {
      const captured = { applicationId, token, scope: "full", reference: "" };
      saveSession(captured);
      setSession(captured);
      scrubTokenFromUrl();
      return;
    }

    // No parameters: a refresh of the already-cleaned URL. sessionStorage carries
    // the applicant through, and a fresh browser gets the recovery state instead.
    const existing = loadSession();
    if (existing) {
      setSession(existing);
      return;
    }
    setPhase("invalid");
    setFailure(
      "This link is missing its secure details. Open the most recent link Lustra emailed you."
    );
  }, [params]);

  // Load the applicant-safe projection with the captured token.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    applications
      .getApplicationStatus(session.applicationId, session.token)
      .then((result) => {
        if (cancelled) return;
        setStatus(result);
        setSession((prev) => (prev ? { ...prev, reference: result.reference } : prev));
        saveSession({ ...session, reference: result.reference });
        // Only the requested display name comes back in the applicant-safe
        // projection; the rest of the record is not disclosed by any public
        // route, so the form can pre-fill nothing else. See `saveDetails`.
        setForm((prev) => ({ ...prev, requestedDisplayName: result.requestedDisplayName ?? "" }));
        setPhase("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        // Expired, revoked, already-used or simply wrong: all are the same to the
        // applicant — the link no longer works and they need a new one. The token
        // is discarded so a reload cannot retry it.
        clearSession();
        setPhase("invalid");
        setFailure(
          isApiError(error) && error.status === 404
            ? "This link is no longer valid. It may have expired or already been used."
            : toUserMessage(error)
        );
      });

    return () => {
      cancelled = true;
    };
    // `session.token` is the only part that changes a request; reference updates must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.applicationId, session?.token]);

  const limits = useMemo(
    () => ({
      min: status?.minimumPhotographs ?? 3,
      max: status?.maximumPhotographs ?? 8,
    }),
    [status]
  );
  const finalized = useMemo(() => finalizedPhotos(status?.media), [status]);
  const enoughPhotos = finalized.length >= limits.min && finalized.length <= limits.max;

  const normalizedStatus = (status?.status ?? "").toLowerCase();
  // `isEditable` is the server's own answer; the status check is a second belt so
  // a future status cannot silently open the form.
  const canEdit = Boolean(status?.isEditable) && EDITABLE.has(normalizedStatus);

  const set = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setMedia = (next) =>
    setStatus((prev) => (prev ? { ...prev, media: typeof next === "function" ? next(prev.media) : next } : prev));

  /**
   * Sends the detail record, if the applicant chose to amend it.
   *
   * The API replaces the whole record on PUT, and no public route discloses the
   * details back, so an amendment necessarily means re-entering the full set.
   * Skipping this entirely — the common case, where only photographs were the
   * problem — leaves the stored details untouched.
   */
  async function saveDetails() {
    if (!session || !editingDetails) return true;
    const next = { ...validateAbout(form), ...validateProfile(form) };
    setErrors(next);
    if (Object.keys(next).length) {
      setBanner("Please complete every required field before resubmitting.");
      return false;
    }
    await applications.updateApplication(session.applicationId, session.token, toDetails(form));
    return true;
  }

  async function resubmit() {
    if (!session || !enoughPhotos) return;
    setBusy(true);
    setBanner("");
    try {
      if (!(await saveDetails())) return;
      const result = await applications.submitApplication(session.applicationId, session.token);
      saveSession({
        applicationId: result.applicationId,
        token: result.statusToken,
        scope: "statusOnly",
        reference: result.reference,
        expiresAtUtc: result.statusTokenExpiresAtUtc,
      });
      setPhase("resubmitted");
      setStatus((prev) => ({ ...prev, status: result.status, reference: result.reference }));
    } catch (error) {
      setBanner(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <Shell>
        <p className="flex items-center gap-2 font-body text-body text-soft-ivory/75">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Opening your application…
        </p>
      </Shell>
    );
  }

  if (phase === "invalid") {
    return (
      <Shell>
        <div className="space-y-5">
          <div
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-3"
          >
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-body text-body text-destructive">{failure}</p>
          </div>
          <p className="font-body text-body text-soft-ivory/75">
            For your protection these links are single-purpose and time-limited, and nothing
            about an application can be opened without one. Email us and we will send a fresh
            link to the address on your application.
          </p>
          <div className="flex gap-3">
            <LustraButton as={Link} to="/for-talent" size="md">
              Start a new application
            </LustraButton>
            <LustraButton as={Link} to="/" variant="outline" size="md">
              Return home
            </LustraButton>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "resubmitted") {
    return (
      <Shell>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-success shrink-0" strokeWidth={1.2} aria-hidden="true" />
            <p className="font-body text-body text-soft-ivory/85">
              Thank you. Your updated application is back with Lustra Management.
            </p>
          </div>
          <div className="rounded-sm border border-rose-gold/25 bg-deep-black/50 p-4">
            <p className="font-body text-meta tracking-luxe uppercase text-muted-grey">Your reference</p>
            <p className="font-heading text-2xl text-rose-gold mt-1">{status?.reference}</p>
            <p className="font-body text-meta text-muted-grey mt-2">Status: {status?.status}</p>
          </div>
          <LustraButton as={Link} to="/" variant="outline" size="md">
            Return home
          </LustraButton>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-5">
        <div className="rounded-sm border border-white/10 bg-deep-black/40 p-4">
          <p className="font-body text-meta tracking-luxe uppercase text-muted-grey">Reference</p>
          <p className="font-heading text-xl text-rose-gold mt-0.5">{status?.reference}</p>
          <p className="font-body text-meta text-muted-grey mt-1">Status: {status?.status}</p>
        </div>

        {/* The applicant-safe decision reason. Management's internal notes live on a
            separate, permissioned endpoint and are never requested by this page. */}
        {status?.decisionReason && (
          <div className="rounded-sm border border-warning/30 bg-warning/[0.07] p-4">
            <p className="flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-warning">
              <MessageSquareWarning className="w-3.5 h-3.5" aria-hidden="true" /> Changes requested
            </p>
            <p className="font-body text-body text-soft-ivory/85 mt-2 whitespace-pre-line">
              {status.decisionReason}
            </p>
          </div>
        )}

        {banner && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-3"
          >
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-body text-body text-destructive">{banner}</p>
          </div>
        )}

        {!canEdit ? (
          <p className="font-body text-body text-soft-ivory/75">
            This application is not open for changes at the moment. Lustra Management will be in
            touch if anything further is needed.
          </p>
        ) : (
          <>
            <div className="rounded-sm border border-white/10 p-4 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 accent-rose-gold"
                  checked={editingDetails}
                  onChange={(e) => setEditingDetails(e.target.checked)}
                />
                <span className="font-body text-body text-soft-ivory/85">
                  I also need to change my written details
                </span>
              </label>
              <p className="font-body text-meta text-muted-grey">
                Your details are kept private and are not shown back to you here, so amending
                them means completing the whole form again. Leave this unticked if only your
                photographs need changing — everything you already sent stays as it is.
              </p>
            </div>

            {editingDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Legal first name" required error={errors.legalFirstName} htmlFor="legalFirstName">
                    <input id="legalFirstName" className={inputCls} value={form.legalFirstName} onChange={set("legalFirstName")} />
                  </Field>
                  <Field label="Legal surname" required error={errors.legalSurname} htmlFor="legalSurname">
                    <input id="legalSurname" className={inputCls} value={form.legalSurname} onChange={set("legalSurname")} />
                  </Field>
                </div>
                <Field label="Middle names" htmlFor="legalMiddleNames">
                  <input id="legalMiddleNames" className={inputCls} value={form.legalMiddleNames} onChange={set("legalMiddleNames")} />
                </Field>
                <Field label="Email" required error={errors.email} htmlFor="email">
                  <input id="email" type="email" className={inputCls} value={form.email} onChange={set("email")} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Cellphone" required error={errors.cellphoneNumber} htmlFor="cellphoneNumber">
                    <input id="cellphoneNumber" className={inputCls} placeholder="+27 …" value={form.cellphoneNumber} onChange={set("cellphoneNumber")} />
                  </Field>
                  <Field label="WhatsApp" hint="If different" error={errors.whatsAppNumber} htmlFor="whatsAppNumber">
                    <input id="whatsAppNumber" className={inputCls} value={form.whatsAppNumber} onChange={set("whatsAppNumber")} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Date of birth" required error={errors.dateOfBirth} htmlFor="dateOfBirth">
                    <input id="dateOfBirth" type="date" className={inputCls} value={form.dateOfBirth} onChange={set("dateOfBirth")} />
                  </Field>
                  <Field label="City" htmlFor="cityFreeText">
                    <input id="cityFreeText" className={inputCls} value={form.cityFreeText} onChange={set("cityFreeText")} />
                  </Field>
                </div>
                <Field label="Display / stage name" required error={errors.requestedDisplayName} htmlFor="requestedDisplayName">
                  <input id="requestedDisplayName" className={inputCls} value={form.requestedDisplayName} onChange={set("requestedDisplayName")} />
                </Field>
                <Field label="Short biography" required error={errors.shortBiography} htmlFor="shortBiography">
                  <textarea id="shortBiography" rows={5} className={inputCls} value={form.shortBiography} onChange={set("shortBiography")} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Instagram" error={errors.instagram} hint="Handle or URL" htmlFor="instagram">
                    <input id="instagram" className={inputCls} value={form.instagram} onChange={set("instagram")} />
                  </Field>
                  <Field label="Other link" error={errors.additionalSocialUrl} htmlFor="additionalSocialUrl">
                    <input id="additionalSocialUrl" className={inputCls} placeholder="https://…" value={form.additionalSocialUrl} onChange={set("additionalSocialUrl")} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Hourly rate" error={errors.requestedHourlyRate} hint="Optional" htmlFor="requestedHourlyRate">
                    <input id="requestedHourlyRate" inputMode="decimal" className={inputCls} value={form.requestedHourlyRate} onChange={set("requestedHourlyRate")} />
                  </Field>
                  <Field label="Currency" htmlFor="currencyCode">
                    <select id="currencyCode" className={inputCls} value={form.currencyCode} onChange={set("currencyCode")}>
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 w-4 h-4 accent-rose-gold" checked={form.isAdultDeclared} onChange={set("isAdultDeclared")} />
                  <span className="font-body text-body text-soft-ivory/80">
                    I confirm I am 18 years of age or older.
                  </span>
                </label>
                {errors.isAdultDeclared && (
                  <p className="font-body text-meta text-error" role="alert">{errors.isAdultDeclared}</p>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 w-4 h-4 accent-rose-gold" checked={form.consentToContact} onChange={set("consentToContact")} />
                  <span className="font-body text-body text-soft-ivory/80">
                    I consent to Lustra contacting me about this application, and accept the{" "}
                    <Link to="/privacy" className="text-rose-gold hover:underline">Privacy Policy</Link>.
                  </span>
                </label>
                {errors.consentToContact && (
                  <p className="font-body text-meta text-error" role="alert">{errors.consentToContact}</p>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 w-4 h-4 accent-rose-gold" checked={form.publishOnApproval} onChange={set("publishOnApproval")} />
                  <span className="font-body text-body text-soft-ivory/80">
                    Publish my profile once Management approves it. This is a preference —
                    Lustra Management decides whether and when a profile is published.
                  </span>
                </label>
              </div>
            )}

            <PhotographManager
              session={session}
              media={status?.media ?? []}
              onMediaChange={setMedia}
              limits={limits}
              onError={setBanner}
            />

            <div className="pt-1">
              <LustraButton size="md" onClick={resubmit} disabled={busy || !enoughPhotos}>
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Resubmit application
              </LustraButton>
              {!enoughPhotos && (
                <p className="font-body text-meta text-warning mt-2">
                  Keep between {limits.min} and {limits.max} photographs to resubmit.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
