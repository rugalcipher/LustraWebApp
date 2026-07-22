import React, { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import AddressAutocomplete from "@/components/address/AddressAutocomplete";
import { EMPTY_ADDRESS_INPUT, isAddressProvided, toAddressInput } from "@/domain/address";
import { AVAILABILITY_STATUSES } from "@/services/talentProfileService";
import { useCities } from "@/features/discovery/hooks";
import { useUpdateTalent } from "@/features/talentAdmin/hooks";

/**
 * The Management/Admin Talent-record edit form.
 *
 * Lives inside the existing Talent detail shell (the "Public profile" tab) rather than a second
 * management surface. It edits the permitted profile fields plus the PRIVATE base address via the
 * shared AddressAutocomplete — visible only to authorised staff, never on a public/client page.
 *
 * The whole update replaces every scalar field the server's ApplyFields touches, so this seeds
 * ALL of them from the record and submits them — an omitted field would be cleared, not left
 * alone. Categories and rates are left unchanged (their own surfaces manage them). The server
 * re-enforces the Talent.Manage permission and revalidates.
 */
const inputCls =
  "w-full bg-deep-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body " +
  "text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50";

function Field({ label, htmlFor, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
        {label}
      </label>
      {children}
      {error && <p className="font-body text-meta text-error" role="alert">{error}</p>}
    </div>
  );
}

function seed(talent) {
  return {
    displayName: talent.displayName ?? "",
    legalFirstName: talent.legalFirstName ?? "",
    legalSurname: talent.legalSurname ?? "",
    headline: talent.headline ?? "",
    shortBiography: talent.shortBiography ?? "",
    fullBiography: talent.fullBiography ?? "",
    dateOfBirth: talent.dateOfBirth ?? "",
    isAgePublic: Boolean(talent.isAgePublic),
    cityId: talent.cityId ?? "",
    regionId: talent.regionId ?? null,
    cellphoneNumber: talent.cellphoneNumber ?? "",
    whatsAppNumber: talent.whatsAppNumber ?? "",
    instagramUrl: talent.instagramUrl ?? "",
    additionalSocialUrl: talent.additionalSocialUrl ?? "",
    availabilityStatus: talent.availabilityStatus ?? "Available",
    travelAvailable: Boolean(talent.travelAvailable),
    eventAvailable: Boolean(talent.eventAvailable),
    baseAddress: talent.baseAddress ? { ...talent.baseAddress } : { ...EMPTY_ADDRESS_INPUT },
  };
}

export default function TalentEditForm({ profileId, talent, onDone }) {
  const [form, setForm] = useState(() => seed(talent));
  const [errors, setErrors] = useState({});
  const { data: cities = [] } = useCities();
  const update = useUpdateTalent(profileId);

  const set = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.displayName.trim()) next.displayName = "A display name is required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const blank = (v) => (v && v.trim() ? v.trim() : null);
    try {
      await update.mutateAsync({
        displayName: form.displayName.trim(),
        legalFirstName: blank(form.legalFirstName),
        legalSurname: blank(form.legalSurname),
        headline: blank(form.headline),
        shortBiography: blank(form.shortBiography),
        fullBiography: blank(form.fullBiography),
        dateOfBirth: form.dateOfBirth || null,
        isAgePublic: form.isAgePublic,
        cityId: form.cityId || null,
        regionId: form.regionId || null,
        cellphoneNumber: blank(form.cellphoneNumber),
        whatsAppNumber: blank(form.whatsAppNumber),
        instagramUrl: blank(form.instagramUrl),
        additionalSocialUrl: blank(form.additionalSocialUrl),
        availabilityStatus: form.availabilityStatus || null,
        travelAvailable: form.travelAvailable,
        eventAvailable: form.eventAvailable,
        // Left unchanged — categories and rates have their own surfaces.
        categoryIds: null,
        rates: null,
        // The private base address; sent only when a real locator is present.
        baseAddress: isAddressProvided(form.baseAddress) ? toAddressInput(form.baseAddress) : null,
      });
      toast({ title: "Talent updated" });
      onDone?.();
    } catch (err) {
      toast({ title: "Couldn't save", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Display name" htmlFor="edit-displayName" error={errors.displayName}>
          <input id="edit-displayName" className={inputCls} value={form.displayName} onChange={set("displayName")} maxLength={100} />
        </Field>
        <Field label="Headline" htmlFor="edit-headline">
          <input id="edit-headline" className={inputCls} value={form.headline} onChange={set("headline")} maxLength={160} />
        </Field>
        <Field label="Legal first name" htmlFor="edit-legalFirst">
          <input id="edit-legalFirst" className={inputCls} value={form.legalFirstName} onChange={set("legalFirstName")} />
        </Field>
        <Field label="Legal surname" htmlFor="edit-legalSurname">
          <input id="edit-legalSurname" className={inputCls} value={form.legalSurname} onChange={set("legalSurname")} />
        </Field>
      </div>

      <Field label="Short biography" htmlFor="edit-shortBio">
        <textarea id="edit-shortBio" rows={3} className={inputCls} value={form.shortBiography} onChange={set("shortBiography")} maxLength={500} />
      </Field>
      <Field label="Full biography" htmlFor="edit-fullBio">
        <textarea id="edit-fullBio" rows={5} className={inputCls} value={form.fullBiography} onChange={set("fullBiography")} maxLength={4000} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="City" htmlFor="edit-city">
          <select id="edit-city" className={inputCls} value={form.cityId} onChange={set("cityId")}>
            <option value="" className="bg-noir">Not set</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id} className="bg-noir">{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Date of birth" htmlFor="edit-dob">
          <input id="edit-dob" type="date" className={inputCls} value={form.dateOfBirth} onChange={set("dateOfBirth")} />
        </Field>
        <Field label="Cellphone" htmlFor="edit-cell">
          <input id="edit-cell" className={inputCls} value={form.cellphoneNumber} onChange={set("cellphoneNumber")} />
        </Field>
        <Field label="WhatsApp" htmlFor="edit-whatsapp">
          <input id="edit-whatsapp" className={inputCls} value={form.whatsAppNumber} onChange={set("whatsAppNumber")} />
        </Field>
        <Field label="Instagram" htmlFor="edit-instagram">
          <input id="edit-instagram" className={inputCls} value={form.instagramUrl} onChange={set("instagramUrl")} placeholder="https://instagram.com/…" />
        </Field>
        <Field label="Other link" htmlFor="edit-social">
          <input id="edit-social" className={inputCls} value={form.additionalSocialUrl} onChange={set("additionalSocialUrl")} placeholder="https://…" />
        </Field>
        <Field label="Availability" htmlFor="edit-availability">
          <select id="edit-availability" className={inputCls} value={form.availabilityStatus} onChange={set("availabilityStatus")}>
            {AVAILABILITY_STATUSES.map((s) => (
              <option key={s.value} value={s.value} className="bg-noir">{s.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-rose-gold" checked={form.isAgePublic} onChange={set("isAgePublic")} />
          <span className="font-body text-body text-soft-ivory/80">Show age publicly</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-rose-gold" checked={form.travelAvailable} onChange={set("travelAvailable")} />
          <span className="font-body text-body text-soft-ivory/80">Available to travel</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-rose-gold" checked={form.eventAvailable} onChange={set("eventAvailable")} />
          <span className="font-body text-body text-soft-ivory/80">Available for events</span>
        </label>
      </div>

      {/* Private base address — staff-only, never shown on a public/client page. */}
      <div className="rounded-lg border border-white/[0.06] p-4 space-y-2">
        <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
          Private base address
        </p>
        <p className="font-body text-[0.7rem] text-muted-grey/80">
          Staff-only. The public profile shows only city/region. A legacy value shows as unverified
          until upgraded by selecting a Google place.
        </p>
        <AddressAutocomplete
          value={form.baseAddress}
          onChange={(next) => setForm((prev) => ({ ...prev, baseAddress: next }))}
          idPrefix="talent-edit-addr"
          label="Search the address"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={update.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-rose-gold/15 border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/25 disabled:opacity-50"
        >
          {update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save changes
        </button>
        <button
          type="button"
          onClick={() => onDone?.()}
          className="px-5 py-2.5 rounded-sm border border-white/15 font-body text-meta tracking-luxe uppercase text-soft-ivory/80 hover:text-ivory"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
