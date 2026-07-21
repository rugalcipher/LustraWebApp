import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, AlertTriangle, CheckCircle2, Upload, Star, ArrowRight, ArrowLeft, Trash2,
} from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import PublicMarketingLayout from "@/components/lustra/public/PublicMarketingLayout";
import { PUBLIC_IMAGES } from "@/components/lustra/public/publicImages";
import * as applications from "@/services/talentApplicationService";
import { APPLICATION_ERROR_CODES } from "@/services/talentApplicationService";
import { saveSession, loadSession, clearSession } from "@/features/talentApplication/session";
import { toUserMessage, isApiError } from "@/api/problemDetails";

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
const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AED"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

const EMPTY = {
  legalFirstName: "",
  legalMiddleNames: "",
  legalSurname: "",
  requestedDisplayName: "",
  email: "",
  cellphoneNumber: "",
  whatsAppNumber: "",
  instagram: "",
  additionalSocialUrl: "",
  cityFreeText: "",
  dateOfBirth: "",
  isAdultDeclared: false,
  shortBiography: "",
  requestedHourlyRate: "",
  currencyCode: "ZAR",
  publishOnApproval: true,
  consentToContact: false,
};

/** Age today from an ISO date. The server re-checks this at submission. */
export function ageFrom(iso) {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** Maps a refusal code onto the field that caused it, so the error lands in place. */
const CODE_TO_FIELD = {
  [APPLICATION_ERROR_CODES.adultDeclarationRequired]: "isAdultDeclared",
  [APPLICATION_ERROR_CODES.underAge]: "dateOfBirth",
  [APPLICATION_ERROR_CODES.consentRequired]: "consentToContact",
  [APPLICATION_ERROR_CODES.duplicateActive]: "email",
  [APPLICATION_ERROR_CODES.alreadyTalent]: "email",
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
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  const [session, setSession] = useState(() => loadSession());
  const [media, setMedia] = useState([]);
  const [limits, setLimits] = useState({ min: 3, max: 8 });
  const [uploads, setUploads] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const fileInput = useRef(null);

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

  const finalized = useMemo(
    () => media.filter((m) => (m.uploadStatus ?? "").toLowerCase() !== "pending"),
    [media]
  );
  const enoughPhotos = finalized.length >= limits.min && finalized.length <= limits.max;

  function validateAbout() {
    const next = {};
    if (!form.legalFirstName.trim()) next.legalFirstName = "Required";
    if (!form.legalSurname.trim()) next.legalSurname = "Required";
    if (!form.email.trim()) next.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address";
    if (!form.cellphoneNumber.trim()) next.cellphoneNumber = "Required";
    else if (!/^\+?[0-9\s()-]{7,}$/.test(form.cellphoneNumber.trim()))
      next.cellphoneNumber = "Enter a valid phone number";
    if (form.whatsAppNumber && !/^\+?[0-9\s()-]{7,}$/.test(form.whatsAppNumber.trim()))
      next.whatsAppNumber = "Enter a valid phone number";
    if (!form.dateOfBirth) next.dateOfBirth = "Required";
    else {
      const age = ageFrom(form.dateOfBirth);
      if (age !== null && age < 18) next.dateOfBirth = "You must be 18 or older to apply";
    }
    if (!form.isAdultDeclared) next.isAdultDeclared = "You must confirm you are 18 or older";
    if (!form.consentToContact) next.consentToContact = "We need your consent to contact you";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateProfile() {
    const next = {};
    if (!form.requestedDisplayName.trim()) next.requestedDisplayName = "Required";
    if (!form.shortBiography.trim()) next.shortBiography = "Required";
    else if (form.shortBiography.trim().length < 40)
      next.shortBiography = "Tell us a little more — at least 40 characters";
    if (form.requestedHourlyRate && Number.isNaN(Number(form.requestedHourlyRate)))
      next.requestedHourlyRate = "Enter a number";
    if (form.instagram && /\s/.test(form.instagram.trim()))
      next.instagram = "Enter a handle or a full URL";
    if (form.additionalSocialUrl && !/^https?:\/\/\S+$/i.test(form.additionalSocialUrl.trim()))
      next.additionalSocialUrl = "Enter a full URL beginning with https://";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /** The exact contract body. Blank optional strings are sent as null, not "". */
  function toDetails() {
    const blankToNull = (v) => (v && v.trim() ? v.trim() : null);
    return {
      legalFirstName: form.legalFirstName.trim(),
      legalMiddleNames: blankToNull(form.legalMiddleNames),
      legalSurname: form.legalSurname.trim(),
      requestedDisplayName: form.requestedDisplayName.trim(),
      email: form.email.trim(),
      cellphoneNumber: form.cellphoneNumber.trim(),
      whatsAppNumber: blankToNull(form.whatsAppNumber),
      instagram: blankToNull(form.instagram),
      additionalSocialUrl: blankToNull(form.additionalSocialUrl),
      cityId: null,
      cityFreeText: blankToNull(form.cityFreeText),
      dateOfBirth: form.dateOfBirth,
      isAdultDeclared: form.isAdultDeclared,
      shortBiography: form.shortBiography.trim(),
      requestedHourlyRate: form.requestedHourlyRate ? Number(form.requestedHourlyRate) : null,
      currencyCode: form.requestedHourlyRate ? form.currencyCode : null,
      publishOnApproval: form.publishOnApproval,
      consentToContact: form.consentToContact,
    };
  }

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

  async function uploadFiles(fileList) {
    const files = Array.from(fileList ?? []);
    if (!files.length || !session) return;

    for (const file of files) {
      const clientId = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      if (!IMAGE_TYPES.includes(file.type)) {
        setUploads((u) => ({ ...u, [clientId]: { name: file.name, error: "JPG, PNG or WebP only" } }));
        continue;
      }
      if (file.size > MAX_BYTES) {
        setUploads((u) => ({
          ...u,
          [clientId]: { name: file.name, error: "Each image must be 8MB or smaller" },
        }));
        continue;
      }

      setUploads((u) => ({ ...u, [clientId]: { name: file.name, progress: 0 } }));
      try {
        const ticket = await applications.requestUpload(session.applicationId, session.token, {
          contentType: file.type,
          expectedSizeBytes: file.size,
          fileName: file.name,
        });
        await applications.uploadToStorage(ticket, file, (fraction) =>
          setUploads((u) => ({ ...u, [clientId]: { ...u[clientId], progress: fraction } }))
        );
        // A photograph exists only once the server confirms the object landed.
        const confirmed = await applications.finalizeUpload(
          session.applicationId,
          session.token,
          ticket.mediaId
        );
        setMedia((prev) => [...prev.filter((m) => m.id !== confirmed.id), confirmed]);
        setUploads((u) => {
          const rest = { ...u };
          delete rest[clientId];
          return rest;
        });
      } catch (error) {
        setUploads((u) => ({ ...u, [clientId]: { name: file.name, error: toUserMessage(error) } }));
      }
    }
  }

  async function removePhoto(mediaId) {
    if (!session) return;
    try {
      await applications.deleteMedia(session.applicationId, session.token, mediaId);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (error) {
      setBanner(toUserMessage(error));
    }
  }

  async function persistOrder(next) {
    if (!session) return;
    setMedia(next);
    try {
      const status = await applications.reorderMedia(
        session.applicationId,
        session.token,
        next.map((m, index) => ({ mediaId: m.id, sortOrder: index, isCover: Boolean(m.isCover) }))
      );
      if (status?.media) setMedia(status.media);
    } catch (error) {
      setBanner(toUserMessage(error));
    }
  }

  const move = (index, delta) => {
    const next = [...finalized];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  };

  const setCover = (mediaId) =>
    persistOrder(finalized.map((m) => ({ ...m, isCover: m.id === mediaId })));

  async function submit() {
    if (!session || !enoughPhotos) return;
    setBusy(true);
    setBanner("");
    try {
      const result = await applications.submitApplication(session.applicationId, session.token);
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
                If you are approved we email an activation link so you can set a password.
                Approval does not automatically publish your profile — Lustra Management
                decides whether and when a profile goes live.
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
        <p className="font-body text-body text-soft-ivory/75">
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
            <p className="font-body text-body text-soft-ivory/75">
              Add {limits.min}–{limits.max} photographs (JPG, PNG or WebP, up to 8MB each).
              They are stored privately for Management review and are never published
              automatically.
            </p>

            <div
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                uploadFiles(e.dataTransfer.files);
              }}
              className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/15 px-4 py-8 cursor-pointer hover:border-rose-gold/40 transition"
            >
              <Upload className="w-5 h-5 text-rose-gold/80" strokeWidth={1.3} aria-hidden="true" />
              <p className="font-body text-body text-soft-ivory/80">Drag &amp; drop, or browse</p>
              <p className="font-body text-meta text-muted-grey">
                {finalized.length}/{limits.max} uploaded
              </p>
              <input
                ref={fileInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                multiple
                className="hidden"
                aria-label="Add photographs"
                onChange={(e) => {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {Object.entries(uploads).map(([id, u]) => (
              <div key={id} className="rounded-sm border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-body text-body text-soft-ivory/80 truncate">{u.name}</span>
                  {u.error ? (
                    <span className="font-body text-meta text-error">{u.error}</span>
                  ) : (
                    <span className="font-body text-meta text-muted-grey tabular-nums">
                      {Math.round((u.progress ?? 0) * 100)}%
                    </span>
                  )}
                </div>
                {!u.error && (
                  <div className="mt-2 h-0.5 bg-ivory/10">
                    <div
                      className="h-full bg-rose-gold origin-left"
                      style={{ transform: `scaleX(${u.progress ?? 0})` }}
                    />
                  </div>
                )}
              </div>
            ))}

            {finalized.length > 0 && (
              <ul className="space-y-2">
                {finalized.map((m, index) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-sm border border-white/10 p-2.5">
                    <span className="font-body text-meta text-muted-grey tabular-nums w-5">{index + 1}</span>
                    <span className="flex-1 min-w-0 font-body text-body text-soft-ivory/85 truncate">
                      {m.originalFileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCover(m.id)}
                      aria-label={`Set ${m.originalFileName} as cover`}
                      className={m.isCover ? "text-rose-gold" : "text-muted-grey hover:text-rose-gold"}
                    >
                      <Star className="w-4 h-4" fill={m.isCover ? "currentColor" : "none"} strokeWidth={1.4} />
                    </button>
                    <button type="button" onClick={() => move(index, -1)} aria-label={`Move ${m.originalFileName} up`} className="text-muted-grey hover:text-rose-gold">↑</button>
                    <button type="button" onClick={() => move(index, 1)} aria-label={`Move ${m.originalFileName} down`} className="text-muted-grey hover:text-rose-gold">↓</button>
                    <button
                      type="button"
                      onClick={() => removePhoto(m.id)}
                      aria-label={`Remove ${m.originalFileName}`}
                      className="text-muted-grey hover:text-error"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.4} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="font-body text-meta text-muted-grey">
              {finalized.some((m) => m.isCover)
                ? "The starred photograph is your preferred cover."
                : "Star a photograph to set your preferred cover."}
            </p>

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
