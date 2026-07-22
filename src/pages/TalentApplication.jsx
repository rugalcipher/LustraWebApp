import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import PublicMarketingLayout from "@/components/lustra/public/PublicMarketingLayout";
import { PUBLIC_IMAGES } from "@/components/lustra/public/publicImages";
import * as applications from "@/services/talentApplicationService";
import { APPLICATION_ERROR_CODES } from "@/services/talentApplicationService";
import { saveSession, loadSession, clearSession } from "@/features/talentApplication/session";
import PhotographManager, { finalizedPhotos } from "@/features/talentApplication/PhotographManager";
import { useWizardStepScroll } from "@/features/talentApplication/useWizardStepScroll";
import PasswordField from "@/components/auth/PasswordField";
import { usePasswordPolicy } from "@/features/auth/passwordPolicy";
import {
  CURRENCIES,
  EMPTY_DETAILS,
  ageFrom,
  toDetails as buildDetails,
  validateAbout as checkAbout,
  validateProfile as checkProfile,
} from "@/features/talentApplication/details";
import { toUserMessage, isApiError } from "@/api/problemDetails";

export { ageFrom };

/**
 * FOR TALENT — the public application.
 *
 * Applying is not registration and not publication. The page creates a **Draft**
 * (`POST /public/talent-applications`), because 3–8 private photographs have to
 * be uploaded and verified before there is anything for management to assess,
 * and every upload needs a row to attach to. Submission is a separate act.
 *
 * Nothing here fakes progress: a photograph appears only once the server has
 * finalized it, and the closing screen shows only the reference the backend
 * returned.
 */

const SECTIONS = ["About you", "Public profile", "Photos", "Review and submit"];

/** Maps a refusal code onto the field that caused it, so the error lands in place. */
const CODE_TO_FIELD = {
  [APPLICATION_ERROR_CODES.adultDeclarationRequired]: "isAdultDeclared",
  [APPLICATION_ERROR_CODES.underAge]: "dateOfBirth",
  [APPLICATION_ERROR_CODES.consentRequired]: "consentToContact",
  [APPLICATION_ERROR_CODES.duplicateActive]: "email",
  [APPLICATION_ERROR_CODES.alreadyTalent]: "email",
  // Submission creates the account, so its credential refusals land on step 0's fields.
  "auth.password_policy": "password",
  "talent_application.email_in_use": "email",
};

const inputCls =
  "w-full bg-deep-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body " +
  "text-ivory placeholder:text-muted-grey/70 focus:outline-none focus:border-rose-gold/50";

function Field({ label, error, children, hint, required, htmlFor }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey"
      >
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

export default function TalentApplication() {
  const [step, setStep] = useState(0);
  const stepAnchorRef = useWizardStepScroll(step);
  const [form, setForm] = useState(EMPTY_DETAILS);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  // The password is held apart from `form` — it is a credential, not an application detail,
  // and must never travel with `toDetails` to the draft. It is sent only on final submission,
  // where the API uses it to create the applicant's account (in the pending-approval state).
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { rules: passwordRules } = usePasswordPolicy();

  const [session, setSession] = useState(() => loadSession());
  const [media, setMedia] = useState([]);
  const [limits, setLimits] = useState({ min: 3, max: 8 });
  const [submitted, setSubmitted] = useState(null);

  // Resume an in-progress draft in this tab so a reload does not lose the photos.
  useEffect(() => {
    if (!session || submitted || session.scope !== "full") return;
    let cancelled = false;
    applications
      .getApplicationStatus(session.applicationId, session.token)
      .then((status) => {
        if (cancelled) return;
        setMedia(status.media ?? []);
        setLimits({ min: status.minimumPhotographs, max: status.maximumPhotographs });
      })
      .catch(() => {
        if (cancelled) return;
        // An expired or revoked token cannot be recovered here; start clean.
        clearSession();
        setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session, submitted]);

  const set = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const finalized = useMemo(() => finalizedPhotos(media), [media]);
  const enoughPhotos = finalized.length >= limits.min && finalized.length <= limits.max;

  /**
   * The password the applicant will sign in with once approved. Checked against the live
   * policy so a person is told here, not after a round-trip; the server revalidates and its
   * refusal is mapped back onto this field.
   */
  function credentialErrors() {
    const next = {};
    if (!password) {
      next.password = "Choose a password";
    } else if (!passwordRules.every((rule) => rule.test(password))) {
      next.password = "Your password does not meet the requirements below";
    }
    if (!confirmPassword) {
      next.confirmPassword = "Confirm your password";
    } else if (confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match";
    }
    return next;
  }

  function validateAbout() {
    const next = { ...checkAbout(form), ...credentialErrors() };
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateProfile() {
    const next = checkProfile(form);
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const toDetails = () => buildDetails(form);

  /** Surfaces a refusal on the field that caused it, using the API's `errorCode`. */
  function applyApiError(error) {
    const code = isApiError(error) ? error.code : undefined;
    const field = code ? CODE_TO_FIELD[code] : undefined;
    if (field) {
      setErrors((prev) => ({ ...prev, [field]: toUserMessage(error) }));
      setStep(0);
    }
    setBanner(toUserMessage(error));
  }

  async function ensureDraft() {
    if (session && session.scope === "full") {
      await applications.updateApplication(session.applicationId, session.token, toDetails());
      return session;
    }
    const created = await applications.createApplication(toDetails());
    const next = {
      applicationId: created.applicationId,
      token: created.accessToken,
      scope: "full",
      reference: created.reference,
      expiresAtUtc: created.accessTokenExpiresAtUtc,
    };
    saveSession(next);
    setSession(next);
    setLimits({ min: created.minimumPhotographs, max: created.maximumPhotographs });
    return next;
  }

  async function goToPhotos() {
    if (!validateProfile()) return;
    setBusy(true);
    setBanner("");
    try {
      await ensureDraft();
      setStep(2);
    } catch (error) {
      applyApiError(error);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!session || !enoughPhotos) return;

    // The account is created at submission, so the credentials must be valid before we ask.
    // A failure here sends the applicant back to where the fields are, never scrolling past
    // an error they cannot see.
    const credentialProblems = credentialErrors();
    if (Object.keys(credentialProblems).length > 0) {
      setErrors((prev) => ({ ...prev, ...credentialProblems }));
      setBanner("Please choose a valid password before submitting.");
      setStep(0);
      return;
    }

    setBusy(true);
    setBanner("");
    try {
      const result = await applications.submitApplication(
        session.applicationId, session.token, password);
      // The editing token is revoked by this call; keep only the read-only one.
      const next = {
        applicationId: result.applicationId,
        token: result.statusToken,
        scope: "statusOnly",
        reference: result.reference,
        expiresAtUtc: result.statusTokenExpiresAtUtc,
      };
      saveSession(next);
      setSession(next);
      setSubmitted(result);
    } catch (error) {
      if (isApiError(error) && error.code === APPLICATION_ERROR_CODES.tooFewPhotographs) {
        setStep(2);
      }
      applyApiError(error);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <PublicMarketingLayout
        eyebrow="Represented by Lustra"
        title="Application received"
        image={PUBLIC_IMAGES.forTalent}
        footerNote="Private by Design"
      >
        <div className="max-w-xl space-y-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-success shrink-0" strokeWidth={1.2} aria-hidden="true" />
            <p className="font-body text-body text-soft-ivory/85">
              Thank you. Your application is with Lustra Management for review.
            </p>
          </div>

          <div className="rounded-sm border border-rose-gold/25 bg-deep-black/50 p-4">
            <p className="font-body text-meta tracking-luxe uppercase text-muted-grey">Your reference</p>
            {/* The backend's reference — never one invented here. */}
            <p className="font-heading text-2xl text-rose-gold mt-1">{submitted.reference}</p>
            <p className="font-body text-meta text-muted-grey mt-2">
              Status: {submitted.status} · Submitted{" "}
              {new Date(submitted.submittedAtUtc).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-2 font-body text-body text-soft-ivory/75">
            <p>What happens next:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Management reviews your details and photographs privately.</li>
              <li>If anything needs changing, we email you a secure link to amend it.</li>
              <li>
                If you are approved we email you, and you sign in with the password you chose
                here — there is no separate activation step. Approval does not automatically
                publish your profile — Lustra Management decides whether and when a profile
                goes live.
              </li>
            </ul>
          </div>

          <LustraButton as={Link} to="/" variant="outline" size="md">
            Return home
          </LustraButton>
        </div>
      </PublicMarketingLayout>
    );
  }

  return (
    <PublicMarketingLayout
      eyebrow="Represented by Lustra"
      title="Apply to Join Our Roster"
      image={PUBLIC_IMAGES.forTalent}
      footerNote="Private by Design"
    >
      <div className="max-w-xl">
        {/* Focus + scroll target for step changes. scroll-mt clears the fixed header and the
            safe-area inset so the heading is not hidden beneath them after scrolling. */}
        <h2
          ref={stepAnchorRef}
          tabIndex={-1}
          className="scroll-mt-24 safe-top font-heading text-xl text-ivory outline-none"
        >
          Step {step + 1} of {SECTIONS.length}: {SECTIONS[step]}
        </h2>

        <p className="font-body text-body text-soft-ivory/75 mt-2">
          Lustra represents a carefully selected roster of professional adult talent. Submit
          your details and photographs for private review by our Management team.
        </p>

        <ol className="flex flex-wrap gap-x-4 gap-y-1 mt-5 mb-5" aria-label="Application progress">
          {SECTIONS.map((name, index) => (
            <li
              key={name}
              aria-current={index === step ? "step" : undefined}
              className={`font-body text-meta tracking-luxe uppercase ${
                index === step
                  ? "text-rose-gold"
                  : index < step
                    ? "text-soft-ivory/60"
                    : "text-muted-grey/60"
              }`}
            >
              {index + 1}. {name}
            </li>
          ))}
        </ol>

        {banner && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-3"
          >
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-body text-body text-destructive">{banner}</p>
          </div>
        )}

        {step === 0 && (
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

            <div className="space-y-4 pt-2 border-t border-white/[0.06]">
              <div>
                <p className="font-heading text-lg text-ivory">Choose a password</p>
                <p className="font-body text-meta text-muted-grey mt-1">
                  Your account is created when you submit. If Lustra Management approves your
                  application, you sign in with this password — there is no separate activation step.
                </p>
              </div>
              <PasswordField
                label="Password"
                autoComplete="new-password"
                showRequirements
                value={password}
                error={errors.password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
              />
              <PasswordField
                label="Confirm password"
                autoComplete="new-password"
                value={confirmPassword}
                matchValue={password}
                error={errors.confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
              />
            </div>

            <div className="pt-2">
              <LustraButton onClick={() => validateAbout() && setStep(1)} size="md">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </LustraButton>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Display / stage name" required error={errors.requestedDisplayName} htmlFor="requestedDisplayName">
              <input id="requestedDisplayName" className={inputCls} value={form.requestedDisplayName} onChange={set("requestedDisplayName")} />
            </Field>
            <Field label="Short biography" required error={errors.shortBiography} hint="A few sentences about you and your work." htmlFor="shortBiography">
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
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-rose-gold" checked={form.publishOnApproval} onChange={set("publishOnApproval")} />
              <span className="font-body text-body text-soft-ivory/80">
                Publish my profile once Management approves it. This is a preference —
                Lustra Management decides whether and when a profile is published.
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <LustraButton variant="outline" size="md" onClick={() => setStep(0)}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </LustraButton>
              <LustraButton size="md" onClick={goToPhotos} disabled={busy}>
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Continue
              </LustraButton>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <PhotographManager
              session={session}
              media={media}
              onMediaChange={setMedia}
              limits={limits}
              onError={setBanner}
            />

            <div className="flex gap-3 pt-2">
              <LustraButton variant="outline" size="md" onClick={() => setStep(1)}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </LustraButton>
              <LustraButton size="md" onClick={() => setStep(3)} disabled={!enoughPhotos}>
                Review <ArrowRight className="w-3.5 h-3.5" />
              </LustraButton>
            </div>
            {!enoughPhotos && (
              <p className="font-body text-meta text-warning">
                Add at least {limits.min} photographs to continue.
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <dl className="rounded-sm border border-white/10 divide-y divide-white/[0.06]">
              {[
                ["Legal name", `${form.legalFirstName} ${form.legalMiddleNames} ${form.legalSurname}`.replace(/\s+/g, " ").trim()],
                ["Display name", form.requestedDisplayName],
                ["Email", form.email],
                ["Cellphone", form.cellphoneNumber],
                ["WhatsApp", form.whatsAppNumber || "—"],
                ["City", form.cityFreeText || "—"],
                ["Date of birth", form.dateOfBirth],
                ["Instagram", form.instagram || "—"],
                ["Requested rate", form.requestedHourlyRate ? `${form.currencyCode} ${form.requestedHourlyRate}` : "Not specified"],
                ["Photographs", `${finalized.length}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-3 py-2.5">
                  <dt className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">{label}</dt>
                  <dd className="font-body text-body text-soft-ivory/85 text-right break-words">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-sm border border-rose-gold/25 bg-deep-black/40 p-3">
              <p className="font-body text-body text-soft-ivory/80">
                {form.publishOnApproval
                  ? "You have asked to be published once approved."
                  : "You have asked not to be published automatically."}{" "}
                Lustra Management retains final authority over whether and when any profile
                is published.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <LustraButton variant="outline" size="md" onClick={() => setStep(2)}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </LustraButton>
              <LustraButton size="md" onClick={submit} disabled={busy || !enoughPhotos}>
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit application
              </LustraButton>
            </div>
          </div>
        )}
      </div>
    </PublicMarketingLayout>
  );
}
