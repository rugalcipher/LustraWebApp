import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, UploadCloud, X, ImageIcon, AlertCircle } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import PublicMarketingLayout from "@/components/lustra/public/PublicMarketingLayout";
import { PUBLIC_IMAGES } from "@/components/lustra/public/publicImages";

/**
 * Public TALENT APPLICATION — for adults applying to be represented by Lustra
 * (distinct from the CLIENT Request Access page at /request-access). Submitting
 * is an application, NOT automatic acceptance; Management reviews manually.
 * Uploaded images are private application material and are never auto-published.
 */

const CATEGORIES = ["Model", "Host", "Event Companion", "Performer", "Brand Ambassador", "Dancer", "Presenter"];
const TRAVEL = ["Available to travel internationally", "Available regionally", "Local engagements only"];
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIN_IMAGES = 3;
const MAX_IMAGES = 8;
const MAX_BYTES = 8 * 1024 * 1024;

export default function TalentApplication() {
  const [form, setForm] = useState({
    fullName: "", displayName: "", email: "", phone: "", dob: "", city: "", region: "",
    primaryCategory: "", additionalCategories: "", experience: "", bio: "", languages: "",
    travel: "", citiesServed: "", instagram: "", otherLink: "",
  });
  const [images, setImages] = useState([]); // { id, file, url }
  const [consent, setConsent] = useState({ age: false, accurate: false, review: false, terms: false });
  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setC = (k, v) => setConsent((c) => ({ ...c, [k]: v }));

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => () => images.forEach((im) => URL.revokeObjectURL(im.url)), [images]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    let err = null;
    setImages((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= MAX_IMAGES) { err = `You can add up to ${MAX_IMAGES} images.`; break; }
        if (!IMG_TYPES.includes(f.type)) { err = "Please use JPG, PNG or WebP images."; continue; }
        if (f.size > MAX_BYTES) { err = "Each image must be under 8MB."; continue; }
        next.push({ id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`, file: f, url: URL.createObjectURL(f) });
      }
      return next;
    });
    setErrors((e) => ({ ...e, images: err }));
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Required";
    if (!form.email.trim()) e.email = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.dob) e.dob = "Required";
    else {
      const age = (Date.now() - new Date(form.dob).getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 18) e.dob = "You must be at least 18.";
    }
    if (!form.city.trim()) e.city = "Required";
    if (!form.primaryCategory) e.primaryCategory = "Required";
    if (images.length < MIN_IMAGES) e.images = `Please add at least ${MIN_IMAGES} images.`;
    else if (images.length > MAX_IMAGES) e.images = `Up to ${MAX_IMAGES} images.`;
    if (!(consent.age && consent.accurate && consent.review && consent.terms)) e.consent = "Please confirm all statements.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    // Mock submission — real upload/review happens server-side later. No auto-approval.
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1300);
  };

  return (
    <PublicMarketingLayout
      eyebrow="Represented by Lustra"
      title="Apply to Join Our Roster"
      image={PUBLIC_IMAGES.forTalent}
      footerNote="Private by Design"
      bareTop={submitted}
    >
      {submitted ? (
        <div className="max-w-md">
          <div className="w-16 h-16 rounded-full border border-rose-gold/40 flex items-center justify-center">
            <Check className="w-7 h-7 text-rose-gold" strokeWidth={1.2} />
          </div>
          <h1 className="font-heading font-light text-3xl sm:text-4xl text-ivory mt-6">Application Received</h1>
          <p className="font-body text-sm text-soft-ivory/70 mt-4 leading-relaxed">
            Thank you for your interest in being represented by Lustra. Our Management team will review your details
            privately and contact you if your application progresses.
          </p>
          <div className="mt-6 p-4 bg-card-black/60 border border-rose-gold/20 rounded-md">
            <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">Reference</p>
            <p className="font-heading text-lg text-light-rose-gold mt-1">
              LUSTRA-T-{Math.random().toString(36).slice(2, 8).toUpperCase()}
            </p>
          </div>
          <LustraButton as={Link} to="/" variant="outline" size="md" className="mt-8">
            Return Home
          </LustraButton>
        </div>
      ) : (
        <>
          <p className="font-body text-sm sm:text-base text-soft-ivory/75 leading-relaxed max-w-md">
            Lustra represents a carefully selected roster of professional adult talent. Submit your details and
            portfolio for private review by our Management team.
          </p>

          <form onSubmit={submit} className="mt-8 max-w-xl space-y-9" noValidate>
            {/* Personal details */}
            <section>
              <SectionLabel>Personal Details</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" value={form.fullName} onChange={(v) => set("fullName", v)} error={errors.fullName} placeholder="Your full name" />
                <Field label="Preferred / display name" value={form.displayName} onChange={(v) => set("displayName", v)} placeholder="Optional" />
                <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} error={errors.email} placeholder="you@email.com" />
                <Field label="Phone number" type="tel" value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} placeholder="+1 …" />
                <Field label="Date of birth" type="date" value={form.dob} onChange={(v) => set("dob", v)} error={errors.dob} />
                <Field label="City" value={form.city} onChange={(v) => set("city", v)} error={errors.city} placeholder="Your city" />
                <Field label="Province / region" value={form.region} onChange={(v) => set("region", v)} placeholder="Your region" />
              </div>
            </section>

            {/* Talent information */}
            <section>
              <SectionLabel>Talent Information</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField label="Primary category" value={form.primaryCategory} onChange={(v) => set("primaryCategory", v)} options={CATEGORIES} error={errors.primaryCategory} />
                <Field label="Additional categories" value={form.additionalCategories} onChange={(v) => set("additionalCategories", v)} placeholder="e.g. Host, Dancer" />
                <SelectField label="Travel availability" value={form.travel} onChange={(v) => set("travel", v)} options={TRAVEL} />
                <Field label="Languages" value={form.languages} onChange={(v) => set("languages", v)} placeholder="e.g. English, French" />
                <Field label="Cities / regions served" value={form.citiesServed} onChange={(v) => set("citiesServed", v)} placeholder="e.g. Paris, Monaco" />
                <Field label="Professional experience" value={form.experience} onChange={(v) => set("experience", v)} placeholder="e.g. 3 years" />
                <Field label="Instagram / portfolio link" value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="https://…" />
                <Field label="Other social / professional link" value={form.otherLink} onChange={(v) => set("otherLink", v)} placeholder="https://…" />
              </div>
              <div className="mt-4">
                <TextArea label="Short biography" value={form.bio} onChange={(v) => set("bio", v)} placeholder="A few sentences about you and your work." />
              </div>
            </section>

            {/* Portfolio images */}
            <section>
              <SectionLabel>Portfolio Images</SectionLabel>
              <p className="font-body text-[0.7rem] text-muted-grey leading-relaxed -mt-2 mb-3">
                Add {MIN_IMAGES}–{MAX_IMAGES} images (JPG, PNG or WebP, up to 8MB each): a clear head-and-shoulders
                photograph, a full-length photograph, and a recent lifestyle or professional image. Images are
                private application material for Management review and are never published automatically.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
                className={cnDrop(dragActive)}
              >
                <UploadCloud className="w-6 h-6 text-rose-gold/80" strokeWidth={1.3} />
                <p className="mt-2 font-body text-xs text-soft-ivory/80">
                  Drag &amp; drop images here, or <span className="text-rose-gold">browse</span>
                </p>
                <p className="mt-1 font-body text-[0.6rem] text-muted-grey">{images.length}/{MAX_IMAGES} selected</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </div>

              {errors.images && <FieldError>{errors.images}</FieldError>}

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {images.map((im) => (
                    <div key={im.id} className="relative aspect-[3/4] rounded-sm overflow-hidden border border-white/[0.08] bg-card-black group">
                      <img src={im.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-noir/70 to-transparent" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(im.id); }}
                        aria-label="Remove image"
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-noir/80 border border-white/15 flex items-center justify-center text-soft-ivory hover:text-rose-gold hover:border-rose-gold/50 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="aspect-[3/4] rounded-sm border border-dashed border-white/15 flex flex-col items-center justify-center text-muted-grey hover:border-rose-gold/40 hover:text-rose-gold transition"
                    >
                      <ImageIcon className="w-4 h-4" strokeWidth={1.3} />
                      <span className="mt-1 text-[0.55rem] tracking-luxe uppercase">Add</span>
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Consent */}
            <section>
              <SectionLabel>Consent</SectionLabel>
              <div className="space-y-2.5">
                <CheckRow checked={consent.age} onChange={(v) => setC("age", v)}>I confirm that I am at least 18 years old.</CheckRow>
                <CheckRow checked={consent.accurate} onChange={(v) => setC("accurate", v)}>I confirm that the information and images provided are mine and accurate.</CheckRow>
                <CheckRow checked={consent.review} onChange={(v) => setC("review", v)}>I consent to Lustra Management reviewing my application.</CheckRow>
                <CheckRow checked={consent.terms} onChange={(v) => setC("terms", v)}>
                  I agree to the <Link to="/privacy" className="text-rose-gold/90 hover:text-light-rose-gold underline underline-offset-2">Privacy Policy</Link> and{" "}
                  <Link to="/terms" className="text-rose-gold/90 hover:text-light-rose-gold underline underline-offset-2">Talent Application Terms</Link>.
                </CheckRow>
              </div>
              {errors.consent && <FieldError>{errors.consent}</FieldError>}
            </section>

            <LustraButton type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
              {submitting ? "Submitting…" : "Submit Application"}
            </LustraButton>
          </form>
        </>
      )}
    </PublicMarketingLayout>
  );
}

function cnDrop(active) {
  return [
    "flex flex-col items-center justify-center text-center rounded-md border border-dashed px-4 py-8 cursor-pointer transition",
    active ? "border-rose-gold/60 bg-rose-gold/[0.06]" : "border-white/15 bg-card-black/40 hover:border-rose-gold/40",
  ].join(" ");
}

function SectionLabel({ children }) {
  return <p className="font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 mb-4">{children}</p>;
}

function FieldError({ children }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 font-body text-[0.65rem] text-error">
      <AlertCircle className="w-3 h-3" strokeWidth={1.6} /> {children}
    </p>
  );
}

const fieldCls =
  "w-full bg-card-black border rounded-sm px-3.5 py-2.5 text-sm text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 transition";

/** @param {{ label?: string; value?: string; onChange?: (v: string) => void; placeholder?: string; type?: string; error?: string }} props */
function Field({ label, value, onChange, placeholder, type = "text", error }) {
  return (
    <div>
      <label className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${fieldCls} ${error ? "border-error/50" : "border-white/[0.08]"}`}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

/** @param {{ label?: string; value?: string; onChange?: (v: string) => void; placeholder?: string }} props */
function TextArea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-1.5 block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`${fieldCls} border-white/[0.08] resize-none`}
      />
    </div>
  );
}

/** @param {{ label?: string; value?: string; onChange?: (v: string) => void; options?: string[]; error?: string }} props */
function SelectField({ label, value, onChange, options = [], error }) {
  return (
    <div>
      <label className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldCls} ${error ? "border-error/50" : "border-white/[0.08]"} appearance-none`}
      >
        <option value="" disabled>Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

/** @param {{ checked?: boolean; onChange?: (v: boolean) => void; children?: import("react").ReactNode }} props */
function CheckRow({ checked, onChange, children }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-rose-gold w-4 h-4 mt-0.5 shrink-0" />
      <span className="text-[0.68rem] text-muted-grey leading-relaxed">{children}</span>
    </label>
  );
}
