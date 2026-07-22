import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Loader2, AlertTriangle, CheckCircle2, KeyRound, Copy, Check,
} from "lucide-react";
import { Card } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { isApiError, toUserMessage } from "@/api/problemDetails";
import { useCreateTalent } from "@/features/talentAdmin/hooks";
import { TALENT_LOGIN_MODES, TALENT_ADMIN_ERROR_CODES } from "@/services/talentAdminService";
import { useTaxonomyAdmin } from "@/features/admin/hooks";
import AddressAutocomplete from "@/components/address/AddressAutocomplete";
import { EMPTY_ADDRESS_INPUT, isAddressProvided, toAddressInput } from "@/domain/address";

/**
 * Add a talent directly, without waiting for a public application.
 *
 * Three things this page has to state plainly rather than imply:
 *
 *  1. **The account is always created.** `TalentProfiles.UserId` is non-nullable
 *     and unique, so a profile cannot exist without an owner. What the operator
 *     chooses is whether the person is handed a way in.
 *  2. **A PendingActivation account genuinely cannot sign in.** It is a real
 *     account with no password. "Profile exists, login not active yet" — not a
 *     placeholder, and not a working login waiting to be discovered.
 *  3. **Publication is refused, not downgraded.** Asking to publish a profile
 *     with no approved photograph returns `talent_admin.not_publishable`, and
 *     the operator is told the profile was NOT published.
 *
 * The temporary password, when one is generated, appears exactly once — in the
 * response to this request. There is no route that will produce it again, so the
 * page says so before the operator navigates away.
 */

const SECTIONS = [
  "Internal identity",
  "Public profile",
  "Location and links",
  "Categories and rates",
  "Login setup",
  "Review",
];

const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AED"];

const EMPTY = {
  email: "",
  legalFirstName: "",
  legalSurname: "",
  displayName: "",
  headline: "",
  shortBiography: "",
  fullBiography: "",
  dateOfBirth: "",
  isAgePublic: false,
  cityId: "",
  cellphoneNumber: "",
  whatsAppNumber: "",
  instagramUrl: "",
  additionalSocialUrl: "",
  availabilityStatus: "Available",
  travelAvailable: false,
  eventAvailable: false,
  categoryIds: [],
  rates: [],
  baseAddress: { ...EMPTY_ADDRESS_INPUT },
  loginMode: TALENT_LOGIN_MODES.invitation,
  publishImmediately: false,
  isFeatured: false,
  internalNote: "",
};

const inputCls =
  "w-full bg-deep-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body " +
  "text-ivory placeholder:text-muted-grey/70 focus:outline-none focus:border-rose-gold/50";

/** Maps a refusal code onto the field that caused it, so the error lands in place. */
const CODE_TO_FIELD = {
  [TALENT_ADMIN_ERROR_CODES.emailInUse]: "email",
  [TALENT_ADMIN_ERROR_CODES.emailRequired]: "email",
  [TALENT_ADMIN_ERROR_CODES.displayNameRequired]: "displayName",
  [TALENT_ADMIN_ERROR_CODES.underAge]: "dateOfBirth",
};

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

/** The temporary password, shown once. Copyable, never persisted. */
function OneTimeSecret({ value }) {
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
        Give this to the talent now. It is not stored in readable form and no screen will show
        it again — if it is lost, set a new one. They must change it when they first sign in.
      </p>
    </div>
  );
}

export default function TalentCreate() {
  const navigate = useNavigate();
  const create = useCreateTalent();
  const categories = useTaxonomyAdmin("talent-categories");

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [created, setCreated] = useState(null);

  const set = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  function validateIdentity() {
    const next = {};
    if (!form.email.trim()) next.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address";
    if (form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth);
      const eighteen = new Date();
      eighteen.setFullYear(eighteen.getFullYear() - 18);
      if (dob > eighteen) next.dateOfBirth = "Talent must be 18 or older";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateProfile() {
    const next = {};
    if (!form.displayName.trim()) next.displayName = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const blank = (v) => (v && v.trim() ? v.trim() : null);

  /** The exact contract body. */
  function toRequest() {
    return {
      email: form.email.trim(),
      profile: {
        displayName: form.displayName.trim(),
        legalFirstName: blank(form.legalFirstName),
        legalSurname: blank(form.legalSurname),
        headline: blank(form.headline),
        shortBiography: blank(form.shortBiography),
        fullBiography: blank(form.fullBiography),
        dateOfBirth: form.dateOfBirth || null,
        isAgePublic: form.isAgePublic,
        cityId: form.cityId || null,
        regionId: null,
        cellphoneNumber: blank(form.cellphoneNumber),
        whatsAppNumber: blank(form.whatsAppNumber),
        instagramUrl: blank(form.instagramUrl),
        additionalSocialUrl: blank(form.additionalSocialUrl),
        availabilityStatus: form.availabilityStatus || null,
        travelAvailable: form.travelAvailable,
        eventAvailable: form.eventAvailable,
        categoryIds: form.categoryIds.length ? form.categoryIds : null,
        rates: form.rates.length ? form.rates : null,
        baseAddress: isAddressProvided(form.baseAddress) ? toAddressInput(form.baseAddress) : null,
      },
      loginMode: form.loginMode,
      publishImmediately: form.publishImmediately,
      isFeatured: form.isFeatured,
      internalNote: blank(form.internalNote),
    };
  }

  async function submit() {
    setBanner("");
    try {
      const result = await create.mutateAsync(toRequest());
      setCreated(result);
    } catch (error) {
      const code = isApiError(error) ? error.code : undefined;
      const field = code ? CODE_TO_FIELD[code] : undefined;
      if (field) {
        setErrors((prev) => ({ ...prev, [field]: toUserMessage(error) }));
        setStep(field === "displayName" ? 1 : 0);
      }
      if (code === TALENT_ADMIN_ERROR_CODES.notPublishable) {
        // Refused, not downgraded. Say exactly what is missing.
        setBanner(
          "The talent was not created because publication was requested but the profile has no " +
            "approved public photograph. Create the profile without publishing, add and approve " +
            "at least one photograph, then publish."
        );
        setStep(4);
        return;
      }
      setBanner(toUserMessage(error));
    }
  }

  const addRate = () =>
    setForm((prev) => ({
      ...prev,
      rates: [
        ...prev.rates,
        { label: "", unit: "Hour", amount: 0, currencyCode: "ZAR", isPublic: true, notes: null },
      ],
    }));

  const setRate = (index, key, value) =>
    setForm((prev) => ({
      ...prev,
      rates: prev.rates.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    }));

  const removeRate = (index) =>
    setForm((prev) => ({ ...prev, rates: prev.rates.filter((_, i) => i !== index) }));

  if (created) {
    return (
      <div className="px-5 lg:px-8 py-6 space-y-5 max-w-3xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-7 h-7 text-success shrink-0" strokeWidth={1.2} aria-hidden="true" />
          <h1 className="font-heading font-light text-2xl text-ivory">Talent created</h1>
        </div>

        <Card className="p-5 space-y-3">
          <dl className="divide-y divide-white/[0.06]">
            {[
              ["Profile", created.slug],
              ["Account status", created.accountStatus],
              ["Login mode", created.loginMode],
              ["Published", created.published ? "Yes" : "No — publish separately"],
              [
                "Activation email",
                created.activationEmailSent ? "Sent" : "Not sent",
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2">
                <dt className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                  {label}
                </dt>
                <dd className="font-body text-helper text-soft-ivory/85 text-right">{value}</dd>
              </div>
            ))}
          </dl>

          {created.accountStatus === "PendingActivation" && (
            <p className="font-body text-body text-soft-ivory/80">
              This account is <strong>PendingActivation</strong>: it exists but cannot sign in
              until the talent sets a password. When they activate an invitation, it adopts this
              profile rather than creating a second one.
            </p>
          )}
        </Card>

        {created.temporaryPassword && <OneTimeSecret value={created.temporaryPassword} />}

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/admin/talent/${created.talentProfileId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
          >
            Open talent <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <Link
            to="/admin/talent"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-white/25"
          >
            Back to roster
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-3xl">
      <Link
        to="/admin/talent"
        className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Talent
      </Link>

      <div>
        <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">People</p>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">Add talent</h1>
      </div>

      <ol className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Progress">
        {SECTIONS.map((name, index) => (
          <li
            key={name}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              "font-body text-meta tracking-luxe uppercase",
              index === step ? "text-rose-gold" : index < step ? "text-soft-ivory/60" : "text-muted-grey/60"
            )}
          >
            {index + 1}. {name}
          </li>
        ))}
      </ol>

      {banner && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-3"
        >
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <p className="font-body text-body text-destructive">{banner}</p>
        </div>
      )}

      <Card className="p-5 space-y-4">
        {step === 0 && (
          <>
            <Field label="Email" required error={errors.email} hint="The account is created against this address." htmlFor="email">
              <input id="email" type="email" className={inputCls} value={form.email} onChange={set("email")} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Legal first name" htmlFor="legalFirstName">
                <input id="legalFirstName" className={inputCls} value={form.legalFirstName} onChange={set("legalFirstName")} />
              </Field>
              <Field label="Legal surname" htmlFor="legalSurname">
                <input id="legalSurname" className={inputCls} value={form.legalSurname} onChange={set("legalSurname")} />
              </Field>
            </div>
            <Field label="Date of birth" error={errors.dateOfBirth} htmlFor="dateOfBirth">
              <input id="dateOfBirth" type="date" className={inputCls} value={form.dateOfBirth} onChange={set("dateOfBirth")} />
            </Field>
            <Field label="Internal note" hint="Management only. Never shown to the talent or a client." htmlFor="internalNote">
              <textarea id="internalNote" rows={3} className={inputCls} value={form.internalNote} onChange={set("internalNote")} />
            </Field>
            <button
              onClick={() => validateIdentity() && setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
            >
              Continue <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Display name" required error={errors.displayName} htmlFor="displayName">
              <input id="displayName" className={inputCls} value={form.displayName} onChange={set("displayName")} />
            </Field>
            <Field label="Headline" htmlFor="headline">
              <input id="headline" className={inputCls} value={form.headline} onChange={set("headline")} />
            </Field>
            <Field label="Short biography" htmlFor="shortBiography">
              <textarea id="shortBiography" rows={3} className={inputCls} value={form.shortBiography} onChange={set("shortBiography")} />
            </Field>
            <Field label="Full biography" htmlFor="fullBiography">
              <textarea id="fullBiography" rows={5} className={inputCls} value={form.fullBiography} onChange={set("fullBiography")} />
            </Field>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-rose-gold" checked={form.isAgePublic} onChange={set("isAgePublic")} />
              <span className="font-body text-body text-soft-ivory/80">Show age on the public profile</span>
            </label>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85">
                Back
              </button>
              <button
                onClick={() => validateProfile() && setStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cellphone" htmlFor="cellphoneNumber">
                <input id="cellphoneNumber" className={inputCls} placeholder="+27 …" value={form.cellphoneNumber} onChange={set("cellphoneNumber")} />
              </Field>
              <Field label="WhatsApp" htmlFor="whatsAppNumber">
                <input id="whatsAppNumber" className={inputCls} value={form.whatsAppNumber} onChange={set("whatsAppNumber")} />
              </Field>
            </div>
            <Field label="Instagram" htmlFor="instagramUrl">
              <input id="instagramUrl" className={inputCls} placeholder="https://instagram.com/…" value={form.instagramUrl} onChange={set("instagramUrl")} />
            </Field>
            <Field label="Other link" htmlFor="additionalSocialUrl">
              <input id="additionalSocialUrl" className={inputCls} placeholder="https://…" value={form.additionalSocialUrl} onChange={set("additionalSocialUrl")} />
            </Field>

            <div className="rounded-lg border border-white/[0.06] p-4 space-y-2">
              <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                Private base address (optional)
              </p>
              <p className="font-body text-[0.7rem] text-muted-grey/80">
                Staff-only — never shown publicly. The public profile shows only city/region.
              </p>
              <AddressAutocomplete
                value={form.baseAddress}
                onChange={(next) => setForm((prev) => ({ ...prev, baseAddress: next }))}
                idPrefix="admin-base-addr"
                label="Search the address"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-rose-gold" checked={form.travelAvailable} onChange={set("travelAvailable")} />
                <span className="font-body text-body text-soft-ivory/80">Available to travel</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-rose-gold" checked={form.eventAvailable} onChange={set("eventAvailable")} />
                <span className="font-body text-body text-soft-ivory/80">Available for events</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-1.5">
              <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                Categories
              </p>
              {categories.isPending && (
                <p className="font-body text-meta text-muted-grey">Loading categories…</p>
              )}
              {categories.isSuccess && (categories.data ?? []).length === 0 && (
                <p className="font-body text-meta text-muted-grey">
                  No categories are configured yet.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {(categories.data ?? []).map((category) => {
                  const on = form.categoryIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          categoryIds: on
                            ? prev.categoryIds.filter((id) => id !== category.id)
                            : [...prev.categoryIds, category.id],
                        }))
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full border font-body text-meta tracking-wide-luxe uppercase transition",
                        on
                          ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                          : "border-white/10 text-muted-grey hover:text-soft-ivory"
                      )}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">Rates</p>
              {form.rates.map((rate, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <input
                    aria-label={`Rate ${index + 1} label`}
                    placeholder="Label"
                    className={cn(inputCls, "col-span-4")}
                    value={rate.label}
                    onChange={(e) => setRate(index, "label", e.target.value)}
                  />
                  <input
                    aria-label={`Rate ${index + 1} unit`}
                    placeholder="Unit"
                    className={cn(inputCls, "col-span-2")}
                    value={rate.unit}
                    onChange={(e) => setRate(index, "unit", e.target.value)}
                  />
                  <input
                    aria-label={`Rate ${index + 1} amount`}
                    inputMode="decimal"
                    className={cn(inputCls, "col-span-2")}
                    value={rate.amount}
                    onChange={(e) => setRate(index, "amount", Number(e.target.value) || 0)}
                  />
                  <select
                    aria-label={`Rate ${index + 1} currency`}
                    className={cn(inputCls, "col-span-2")}
                    value={rate.currencyCode}
                    onChange={(e) => setRate(index, "currencyCode", e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRate(index)}
                    className="col-span-2 px-2 py-2.5 rounded-sm border border-white/10 font-body text-meta uppercase text-muted-grey hover:text-error"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRate}
                className="px-3 py-1.5 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40"
              >
                Add rate
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85">
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <fieldset className="space-y-3">
              <legend className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey mb-2">
                How does this talent get in?
              </legend>

              {[
                {
                  value: TALENT_LOGIN_MODES.none,
                  title: "Profile only — no login yet",
                  body:
                    "The account is created but has no password and cannot sign in " +
                    "(PendingActivation). Nobody is contacted. Use this when Lustra is building " +
                    "a profile before the talent is ready to be involved.",
                },
                {
                  value: TALENT_LOGIN_MODES.invitation,
                  title: "Send an activation invitation",
                  body:
                    "Emails a link so they choose their own password. Activating it adopts this " +
                    "profile — it does not create a second one. The preferred route.",
                },
                {
                  value: TALENT_LOGIN_MODES.temporaryPassword,
                  title: "Set a temporary password",
                  body:
                    "For onboarding in person. The password is shown once on the next screen " +
                    "and can never be retrieved again. They must change it when they sign in.",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex gap-3 rounded-sm border p-3 cursor-pointer transition",
                    form.loginMode === option.value
                      ? "border-rose-gold/50 bg-rose-gold/[0.06]"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <input
                    type="radio"
                    name="loginMode"
                    className="mt-1 w-4 h-4 accent-rose-gold shrink-0"
                    checked={form.loginMode === option.value}
                    onChange={() => setForm((prev) => ({ ...prev, loginMode: option.value }))}
                  />
                  <span>
                    <span className="block font-body text-body text-ivory">{option.title}</span>
                    <span className="block font-body text-meta text-muted-grey mt-0.5">
                      {option.body}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="rounded-sm border border-white/10 p-3 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4 accent-rose-gold" checked={form.publishImmediately} onChange={set("publishImmediately")} />
                <span className="font-body text-body text-soft-ivory/80">
                  Publish this profile immediately
                </span>
              </label>
              <p className="font-body text-meta text-warning">
                Publication needs at least one approved public photograph. A profile created
                here has none yet, so this will be refused unless media already exists. Create
                first, add and approve a photograph, then publish.
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-rose-gold" checked={form.isFeatured} onChange={set("isFeatured")} />
                <span className="font-body text-body text-soft-ivory/80">Feature this profile</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85">
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
              >
                Review <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <dl className="divide-y divide-white/[0.06]">
              {[
                ["Display name", form.displayName],
                ["Email", form.email],
                ["Legal name", `${form.legalFirstName} ${form.legalSurname}`.trim() || "—"],
                ["Date of birth", form.dateOfBirth || "—"],
                ["Categories", form.categoryIds.length ? `${form.categoryIds.length} selected` : "None"],
                ["Rates", form.rates.length ? `${form.rates.length} defined` : "None"],
                ["Login", form.loginMode],
                ["Publish now", form.publishImmediately ? "Requested" : "No"],
                ["Featured", form.isFeatured ? "Yes" : "No"],
              ].map(([label, value]) => (
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

            <p className="font-body text-meta text-muted-grey">
              An account is always created — a profile cannot exist without an owner. The login
              choice above decides only whether this person can currently sign in.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85">
                Back
              </button>
              <button
                onClick={submit}
                disabled={create.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
              >
                {create.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                Create talent
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
