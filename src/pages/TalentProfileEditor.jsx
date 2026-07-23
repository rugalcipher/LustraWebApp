import React, { useEffect, useState } from "react";
import { Loader2, Send, History, Lock } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { formatRate } from "@/domain/talent";
import AddressAutocomplete from "@/components/address/AddressAutocomplete";
import { EMPTY_ADDRESS_INPUT, toAddressInput, validateAddress } from "@/domain/address";
import {
  presentProfileStatus, canSubmitDraft, AVAILABILITY_STATUSES,
  RATE_UNITS, presentRateUnit,
} from "@/services/talentProfileService";
import {
  useMyDraft, useMyTalentProfile, useUpdateDraft, useSubmitDraft,
  useMyVersions, useMyRates, useSaveRate, useDeleteRate,
  useMyBaseAddress, useUpdateMyBaseAddress, useMyAgreedRate,
} from "@/features/talent/hooks";
import { formatMinor } from "@/services/talentGradeService";

/**
 * The talent's profile draft.
 *
 * Saving edits the DRAFT. Nothing here reaches a client until the draft is submitted and
 * Lustra approves it, and the page says so at every point where a talent might assume
 * otherwise. Fields management owns — verification, featuring, publication, the slug —
 * are not editable and are not rendered as though they were.
 */
export default function TalentProfileEditor() {
  const { data: profile } = useMyTalentProfile();
  const { data: draft, isPending, isError, error } = useMyDraft();
  const updateDraft = useUpdateDraft();
  const submitDraft = useSubmitDraft();

  const [form, setForm] = useState(null);
  const [showVersions, setShowVersions] = useState(false);

  // Seed the form once the draft arrives. Keyed on the draft's identity so switching
  // accounts cannot leave the previous talent's text in the fields.
  useEffect(() => {
    if (!draft) return;
    setForm({
      displayName: draft.displayName ?? "",
      headline: draft.headline ?? "",
      shortBiography: draft.shortBiography ?? "",
      fullBiography: draft.fullBiography ?? "",
      dateOfBirth: draft.dateOfBirth ?? "",
      isAgePublic: draft.isAgePublic,
      availabilityStatus: draft.availabilityStatus,
      travelAvailable: draft.travelAvailable,
      eventAvailable: draft.eventAvailable,
    });
  }, [draft?.talentProfileId, draft]);

  if (isPending || !form) {
    return (
      <div className="lustra-marble min-h-screen py-24 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="lustra-marble min-h-screen px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">Couldn't load your draft</p>
        <p className="mt-3 font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      </div>
    );
  }

  const status = presentProfileStatus(draft.profileStatus);
  const locked = !status.isEditable;

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    try {
      await updateDraft.mutateAsync({
        displayName: form.displayName.trim(),
        headline: form.headline.trim() || null,
        shortBiography: form.shortBiography.trim() || null,
        fullBiography: form.fullBiography.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        isAgePublic: form.isAgePublic,
        // City/region are chosen from reference data on the onboarding flow; the draft
        // preserves whatever is already set rather than silently clearing it.
        cityId: draft.cityId,
        regionId: draft.regionId,
        availabilityStatus: form.availabilityStatus,
        travelAvailable: form.travelAvailable,
        eventAvailable: form.eventAvailable,
        coverMediaId: draft.coverMediaId,
      });
      toast({
        title: "Draft saved",
        description: "Your changes are saved but not published. Submit them for review when ready.",
      });
    } catch (err) {
      toast({ title: "Couldn't save", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const submit = async () => {
    try {
      await submitDraft.mutateAsync();
      toast({
        title: "Submitted for review",
        description: "Lustra will review your profile and let you know.",
      });
    } catch (err) {
      toast({ title: "Couldn't submit", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Talent Portal"
        title="Your Profile"
        subtitle="Edit your draft, then submit it to Lustra for review."
      />

      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        {/* Status is stated before the form, so the talent knows whether editing is
            even possible before they start typing. */}
        <Card
          className={cn(
            "p-4 border",
            status.isLive ? "border-success/25" : "border-white/[0.06]"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <Eyebrow>Status</Eyebrow>
              <p className={cn("font-heading text-xl mt-1", status.isLive ? "text-success" : "text-ivory")}>
                {status.label}
              </p>
            </div>
            {profile?.slug && (
              <span className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">
                /{profile.slug}
              </span>
            )}
          </div>
          <p className="font-body text-[0.65rem] text-muted-grey mt-2 leading-relaxed">
            {status.detail}
          </p>
          {draft.reviewNotes && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <p className="text-[0.55rem] tracking-wide-luxe uppercase text-rose-gold/80">
                Notes from Lustra
              </p>
              <p className="font-body text-sm text-soft-ivory/85 mt-1.5 leading-relaxed whitespace-pre-line">
                {draft.reviewNotes}
              </p>
            </div>
          )}
        </Card>

        <MyAgreedRateCard />

        <form onSubmit={save} className="space-y-5">
          <Card className="p-5 space-y-4">
            <Eyebrow>About You</Eyebrow>

            <Field label="Display name" required>
              <input
                value={form.displayName}
                onChange={(e) => set("displayName")(e.target.value)}
                disabled={locked}
                maxLength={100}
                className={inputClass}
              />
            </Field>

            <Field label="Headline" hint="One line clients see first.">
              <input
                value={form.headline}
                onChange={(e) => set("headline")(e.target.value)}
                disabled={locked}
                maxLength={160}
                className={inputClass}
              />
            </Field>

            <Field label="Short biography" hint="Shown on your card in discovery.">
              <textarea
                value={form.shortBiography}
                onChange={(e) => set("shortBiography")(e.target.value)}
                disabled={locked}
                rows={3}
                maxLength={500}
                className={textareaClass}
              />
            </Field>

            <Field label="Full biography" hint="Shown on your profile page.">
              <textarea
                value={form.fullBiography}
                onChange={(e) => set("fullBiography")(e.target.value)}
                disabled={locked}
                rows={6}
                maxLength={4000}
                className={textareaClass}
              />
            </Field>
          </Card>

          <Card className="p-5 space-y-4">
            <Eyebrow>Age</Eyebrow>
            <Field
              label="Date of birth"
              hint="Lustra uses this to verify you are over 18. Only your AGE is ever shown publicly, and only if you allow it — never the date itself."
            >
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth")(e.target.value)}
                disabled={locked}
                className={inputClass}
              />
            </Field>
            <Toggle
              label="Show my age on my public profile"
              checked={form.isAgePublic}
              onChange={set("isAgePublic")}
              disabled={locked}
            />
          </Card>

          <Card className="p-5 space-y-4">
            <Eyebrow>Engagements</Eyebrow>

            <Field label="Availability status">
              <select
                value={form.availabilityStatus}
                onChange={(e) => set("availabilityStatus")(e.target.value)}
                disabled={locked}
                className={inputClass}
              >
                {AVAILABILITY_STATUSES.map((s) => (
                  <option key={s.value} value={s.value} className="bg-noir">
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Toggle
              label="Available to travel"
              checked={form.travelAvailable}
              onChange={set("travelAvailable")}
              disabled={locked}
            />
            <Toggle
              label="Available for events"
              checked={form.eventAvailable}
              onChange={set("eventAvailable")}
              disabled={locked}
            />
          </Card>

          {!locked && (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <LustraButton type="submit" className="flex-1" disabled={updateDraft.isPending}>
                {updateDraft.isPending ? "Saving…" : "Save draft"}
              </LustraButton>
              {canSubmitDraft(draft.profileStatus) && (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitDraft.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-sm border border-rose-gold/40 text-rose-gold font-body text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={1.3} />
                  {submitDraft.isPending ? "Submitting…" : "Submit for review"}
                </button>
              )}
            </div>
          )}

          {!locked && (
            <p className="font-body text-[0.6rem] text-muted-grey leading-relaxed">
              Saving keeps your changes private. Submitting sends them to Lustra — your live
              profile only changes once they approve.
            </p>
          )}
        </form>

        <RateCard />

        <BaseAddressCard />

        <Card className="p-4">
          <button
            onClick={() => setShowVersions((v) => !v)}
            className="w-full flex items-center justify-between gap-2"
          >
            <Eyebrow>Approved Versions</Eyebrow>
            <History className="w-3.5 h-3.5 text-muted-grey" strokeWidth={1.2} />
          </button>
          {showVersions && <Versions />}
        </Card>
      </div>
    </div>
  );
}

/**
 * The talent's PRIVATE base/working address.
 *
 * This is never shown publicly — only its coarse suburb/city/province is ever projected, and
 * only where the product decides to. The exact street, unit, coordinates and Google place id
 * stay with Lustra. It saves independently of the draft (it is operational data, not part of
 * the reviewed public profile), so there is no submit-for-review step.
 */
function BaseAddressCard() {
  const { data: address, isPending } = useMyBaseAddress();
  const save = useUpdateMyBaseAddress();
  const [form, setForm] = useState(EMPTY_ADDRESS_INPUT);
  const [errors, setErrors] = useState({});
  const [seeded, setSeeded] = useState(false);

  // Seed once from the server value; a null base address seeds the empty form.
  useEffect(() => {
    if (seeded || isPending) return;
    setForm(address ? { ...address } : EMPTY_ADDRESS_INPUT);
    setSeeded(true);
  }, [address, isPending, seeded]);

  const onSave = async () => {
    const validation = validateAddress(form, { required: false });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    try {
      await save.mutateAsync(toAddressInput(form));
      toast({ title: "Base address saved", description: "This stays private to Lustra." });
    } catch (err) {
      toast({ title: "Couldn't save", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-rose-gold/70" strokeWidth={1.4} aria-hidden="true" />
        <Eyebrow>Private base address</Eyebrow>
      </div>
      <p className="font-body text-[0.6rem] text-muted-grey leading-relaxed">
        Where you are based, for Lustra's use only. Clients never see your street address or exact
        location — only a broad area, and only if the product shows it. Leave it blank to keep it unset.
      </p>

      {isPending ? (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-4 h-4 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : (
        <>
          <AddressAutocomplete value={form} onChange={setForm} errors={errors} idPrefix="base-addr" label="Search your address" />
          <LustraButton type="button" onClick={onSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save base address"}
          </LustraButton>
        </>
      )}
    </Card>
  );
}

/**
 * The talent's OWN agreed rate — read-only. Shows their agreed payout per hour and currency,
 * nothing else. The client rate, the grade, the share and the margin are all staff-only and the
 * DTO does not carry them, so there is nothing here to leak. Management controls the amount; the
 * talent cannot edit it. The per-appointment payout and total appear on each appointment.
 */
function MyAgreedRateCard() {
  const { data, isPending } = useMyAgreedRate();

  return (
    <Card className="p-5 space-y-3">
      <Eyebrow>My agreed rate</Eyebrow>
      {isPending ? (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-4 h-4 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : !data || !data.isConfigured ? (
        <p className="font-body text-sm text-soft-ivory/80 leading-relaxed">
          Your agreed rate has not been configured yet.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-body text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">
              Agreed payout / hr
            </span>
            <span className="font-heading text-xl text-ivory whitespace-nowrap">
              {formatMinor(data.payoutHourlyMinor, data.currency)}
            </span>
          </div>
          {data.updatedAtUtc && (
            <p className="font-body text-[0.55rem] text-muted-grey">
              Last updated {new Date(data.updatedAtUtc).toLocaleDateString()}.
            </p>
          )}
        </>
      )}
      <p className="font-body text-[0.6rem] text-muted-grey leading-relaxed pt-1 border-t border-white/[0.06]">
        Set by Lustra — you cannot change it here. Booking-specific payout and total appear on
        each appointment.
      </p>
    </Card>
  );
}

/** The talent's rate card. Rates marked non-public are visible only to Lustra. */
function RateCard() {
  const { data: rates, isPending } = useMyRates();
  const saveRate = useSaveRate();
  const deleteRate = useDeleteRate();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: "", unit: "PerEvening", amount: "", isPublic: true });

  const add = async (event) => {
    event.preventDefault();
    const amount = Number(draft.amount);
    if (!draft.label.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Check the rate",
        description: "A label and an amount greater than zero are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveRate.mutateAsync({
        input: {
          label: draft.label.trim(),
          unit: draft.unit,
          amount,
          currencyCode: null,
          notes: null,
          isPublic: draft.isPublic,
          isActive: true,
          sortOrder: (rates?.length ?? 0) + 1,
        },
      });
      setDraft({ label: "", unit: "PerEvening", amount: "", isPublic: true });
      setAdding(false);
      toast({ title: "Rate added" });
    } catch (err) {
      toast({ title: "Couldn't add", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Eyebrow>Rate Card</Eyebrow>
        <button
          onClick={() => setAdding((a) => !a)}
          className="text-[0.55rem] tracking-luxe uppercase text-rose-gold/80 hover:text-rose-gold transition"
        >
          {adding ? "Cancel" : "Add rate"}
        </button>
      </div>

      <p className="font-body text-[0.6rem] text-muted-grey mt-2 leading-relaxed">
        Rates are indicative. Lustra agrees the final figure with the client on every booking.
      </p>

      {adding && (
        <form onSubmit={add} className="mt-4 space-y-3 p-3.5 rounded-sm border border-white/10">
          <input
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="Label (e.g. Dinner engagement)"
            maxLength={80}
            className={inputClass}
          />
          <div className="flex gap-2">
            <select
              value={draft.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
              className={cn(inputClass, "flex-1")}
            >
              {RATE_UNITS.map((u) => (
                <option key={u.value} value={u.value} className="bg-noir">
                  {u.label}
                </option>
              ))}
            </select>
            <input
              value={draft.amount}
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              placeholder="Amount"
              inputMode="decimal"
              className={cn(inputClass, "flex-1")}
            />
          </div>
          <Toggle
            label="Show this rate publicly"
            checked={draft.isPublic}
            onChange={(v) => setDraft((d) => ({ ...d, isPublic: v }))}
          />
          <LustraButton type="submit" size="sm" className="w-full" disabled={saveRate.isPending}>
            {saveRate.isPending ? "Adding…" : "Add rate"}
          </LustraButton>
        </form>
      )}

      {isPending ? null : (rates ?? []).length === 0 ? (
        <p className="font-body text-sm text-muted-grey mt-4">No rates yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rates.map((rate) => (
            <div
              key={rate.id}
              className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
            >
              <div className="min-w-0">
                <p className="font-body text-sm text-ivory truncate">{rate.label}</p>
                <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-0.5">
                  {presentRateUnit(rate.unit)}
                  {!rate.isPublic && " · Lustra only"}
                  {!rate.isActive && " · Inactive"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-heading text-base text-light-rose-gold">
                  {formatRate(rate.amount, rate.currencyCode)}
                </span>
                <button
                  onClick={() => deleteRate.mutate(rate.id)}
                  className="text-[0.55rem] tracking-luxe uppercase text-muted-grey hover:text-error transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * Approved profile snapshots.
 *
 * `snapshotJson` is an opaque server payload; only the metadata is rendered. Parsing and
 * displaying arbitrary stored JSON would risk surfacing internal fields that were never
 * meant for the talent.
 */
function Versions() {
  const { data: versions, isPending } = useMyVersions(true);

  if (isPending) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="w-4 h-4 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <p className="font-body text-sm text-muted-grey mt-3">
        No approved versions yet. Your first appears once Lustra approves your profile.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {versions.map((version) => (
        <div
          key={version.versionNumber}
          className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
        >
          <div className="min-w-0">
            <p className="font-body text-sm text-soft-ivory/85">Version {version.versionNumber}</p>
            {version.changeSummary && (
              <p className="font-body text-[0.65rem] text-muted-grey mt-0.5 truncate">
                {version.changeSummary}
              </p>
            )}
          </div>
          <span className="text-[0.55rem] text-muted-grey shrink-0">
            {new Date(version.createdAtUtc).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

const inputClass =
  "w-full bg-transparent border border-white/10 rounded-sm px-3 py-2.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition disabled:opacity-50";

const textareaClass = cn(inputClass, "resize-none leading-relaxed");

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="text-[0.6rem] tracking-luxe uppercase text-muted-grey">
        {label}
        {required && <span className="text-rose-gold/70"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <span className="block font-body text-[0.6rem] text-muted-grey/80 mt-1.5 leading-relaxed">
          {hint}
        </span>
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className="w-full flex items-center justify-between gap-4 disabled:opacity-50"
    >
      <span className="font-body text-sm text-soft-ivory/85 text-left">{label}</span>
      <span
        className={cn(
          "relative w-11 h-6 rounded-full border transition shrink-0",
          checked ? "bg-rose-gold/30 border-rose-gold/50" : "bg-card-black border-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full transition-all",
            checked ? "left-[1.375rem] bg-rose-gold" : "left-0.5 bg-muted-grey"
          )}
        />
      </span>
    </button>
  );
}
