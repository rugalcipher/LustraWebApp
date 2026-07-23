import React, { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Check, Loader2, Lock, ShieldAlert } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { createIdempotencyScope } from "@/api/idempotency";
import { useTaxonomy, useCities } from "@/features/discovery/hooks";
import {
  useConversationClientSummary,
  useManagementConversation,
} from "@/features/management/hooks";
import { useCreateAppointment, useClientAddressesForBooking } from "@/features/appointments/hooks";
import { useCommercialTerms } from "@/features/talentAdmin/commercialHooks";
import { formatMinor } from "@/services/talentGradeService";
import AddressAutocomplete from "@/components/address/AddressAutocomplete";
import { EMPTY_ADDRESS_INPUT, isAddressProvided, toAddressInput, formatAddressLine } from "@/domain/address";

/**
 * CREATE APPOINTMENT — management records an engagement it has already arranged.
 *
 * This is the end of the real Lustra workflow, not the start of one: management has
 * discussed the arrangement with the client in conversation AND confirmed the slot with
 * the talent privately. Only then is the schedule entry written.
 *
 * Nothing here is client-facing. The client is never asked to confirm, never sees the
 * record, and is not notified when it is created. Opened with `?conversationId=…`, the
 * form prefills the client and the talent from that thread, so staff type the operational
 * detail only.
 */

const inputCls =
  "w-full bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition";

const labelCls = "block text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mb-1.5";

export default function CreateAppointment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const conversationId = params.get("conversationId");
  const conversation = useManagementConversation(conversationId ?? undefined);
  const clientSummary = useConversationClientSummary(conversationId ?? undefined);

  const categories = useTaxonomy("engagement-categories");
  const venueTypes = useTaxonomy("venue-types");
  const cities = useCities();

  const create = useCreateAppointment();

  // Minted once, when the form opens, and reused for every retry — so a resubmit after a
  // timeout replays the original instead of double-booking the talent.
  const idempotency = useRef(createIdempotencyScope()).current;

  const [form, setForm] = useState({
    engagementCategoryId: "",
    confirmedDate: "",
    startTime: "",
    endTime: "",
    durationMinutes: "",
    cityId: "",
    venueTypeId: "",
    venueName: "",
    generalLocation: "",
    privateLocationDetails: "",
    talentInstructions: "",
    clientVisibleNotes: "",
    agreedAmount: "",
    currencyCode: "ZAR",
    // Optional per-booking rate overrides, entered as MAJOR currency and converted to minor
    // units on submit. Setting either makes the reason required and affects only this booking.
    clientHourlyRateOverride: "",
    talentHourlyPayoutOverride: "",
    pricingOverrideReason: "",
  });
  const [talentConfirmed, setTalentConfirmed] = useState(false);
  // The structured, Google-verified confidential address. Optional: when left empty the
  // appointment keeps only the free-text location fields, exactly as before.
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_INPUT);
  // "" = new inline address; otherwise a saved-address id to snapshot server-side.
  const [savedAddressId, setSavedAddressId] = useState("");

  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  const clientUserId = clientSummary.data?.userId ?? null;
  const savedAddresses = useClientAddressesForBooking(clientUserId);
  const talentProfileId = conversation.data?.talentProfileId ?? null;
  const talentName = conversation.data?.talentDisplayName ?? null;

  // The talent's configured commercial terms, so staff see the rate a booking will use before
  // they create it. Gated server-side and in the hook on TalentCommercialTerms.View — a viewer
  // without it simply gets no preview, never a partial figure.
  const commercialTerms = useCommercialTerms(talentProfileId ?? undefined);
  const terms = commercialTerms.data ?? null;

  const durationMinutes = form.durationMinutes ? Number(form.durationMinutes) : 0;
  // Overrides are typed in MAJOR currency; convert to minor units, treating blank/invalid as
  // "no override". An override wins over the talent's default terms, for this booking only.
  const toOverrideMinor = (major) => {
    const trimmed = String(major).trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  };
  const totalMinorFor = (hourlyMinor) =>
    hourlyMinor != null && durationMinutes > 0 ? Math.round((hourlyMinor * durationMinutes) / 60) : null;

  const clientOverrideMinor = toOverrideMinor(form.clientHourlyRateOverride);
  const talentOverrideMinor = toOverrideMinor(form.talentHourlyPayoutOverride);
  const hasOverride = clientOverrideMinor != null || talentOverrideMinor != null;
  const overrideNeedsReason = hasOverride && !form.pricingOverrideReason.trim();

  // Effective hourly figures for the live preview — an override replaces the default.
  const previewCurrency = terms?.currency ?? "ZAR";
  const effClientHourlyMinor = clientOverrideMinor ?? terms?.clientHourlyRateMinor ?? null;
  const effTalentHourlyMinor = talentOverrideMinor ?? terms?.talentHourlyPayoutMinor ?? null;
  const previewClientTotalMinor = totalMinorFor(effClientHourlyMinor);
  const previewTalentTotalMinor = totalMinorFor(effTalentHourlyMinor);
  const previewMarginMinor =
    previewClientTotalMinor != null && previewTalentTotalMinor != null
      ? previewClientTotalMinor - previewTalentTotalMinor
      : null;

  const ready = Boolean(clientUserId && talentProfileId);

  const canSubmit = useMemo(
    () =>
      ready &&
      Boolean(form.engagementCategoryId) &&
      Boolean(form.confirmedDate) &&
      talentConfirmed &&
      !overrideNeedsReason &&
      !create.isPending,
    [ready, form.engagementCategoryId, form.confirmedDate, talentConfirmed, overrideNeedsReason, create.isPending]
  );

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      const result = await create.mutateAsync({
        idempotencyKey: idempotency.key(),
        input: {
          clientUserId,
          talentProfileId,
          conversationId,
          engagementCategoryId: form.engagementCategoryId,
          confirmedDate: form.confirmedDate || null,
          startTime: form.startTime ? `${form.startTime}:00` : null,
          endTime: form.endTime ? `${form.endTime}:00` : null,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
          cityId: form.cityId || null,
          venueTypeId: form.venueTypeId || null,
          venueName: form.venueName || null,
          generalLocation: form.generalLocation || null,
          privateLocationDetails: form.privateLocationDetails || null,
          talentInstructions: form.talentInstructions || null,
          clientVisibleNotes: form.clientVisibleNotes || null,
          agreedAmount: form.agreedAmount ? Number(form.agreedAmount) : null,
          additionalCosts: null,
          currencyCode: form.currencyCode || "ZAR",
          // Per-booking overrides (minor units). A reason is required whenever either is set;
          // it affects only this booking, never the talent's default terms.
          clientHourlyRateOverrideMinor: clientOverrideMinor,
          talentHourlyPayoutOverrideMinor: talentOverrideMinor,
          pricingOverrideReason: hasOverride ? form.pricingOverrideReason.trim() || null : null,
          talentAvailabilityConfirmed: true,
          // A chosen saved address wins: the backend copies it onto the appointment and records
          // it as the source, without mutating the client's saved address. Otherwise an inline
          // verified address is snapshotted (and no saved address is created).
          clientAddressId: savedAddressId || null,
          addressSnapshot:
            savedAddressId || !isAddressProvided(addressForm) ? null : toAddressInput(addressForm),
        },
      });

      // The engagement is on the books; the key must not be reused for the next one.
      idempotency.reset();
      toast({ title: "Appointment created", description: "It is on the management calendar." });
      navigate(
        conversationId ? `/management-conversations/${conversationId}` : `/agency-calendar`,
        { replace: true, state: { createdBookingId: result.bookingId } }
      );
    } catch (err) {
      toast({
        title: "Couldn't create the appointment",
        description: toUserMessage(err),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full">
      <InternalHeader
        eyebrow="Management"
        title="Create Appointment"
        subtitle="Record an engagement you have already arranged with the client and confirmed with the talent."
      />

      <div className="px-5 lg:px-8 py-6 space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
        </button>

        <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
          <div className="xl:col-span-2 space-y-5">
            {/* Prefilled context — read-only. Retyping the client or talent invites the
                mistyped-id class of bug the API guards against. */}
            <Card className="p-4">
              <Eyebrow>Engagement</Eyebrow>

              {!conversationId ? (
                <p className="mt-3 font-body text-sm text-muted-grey">
                  Open this from a conversation so the client and talent are carried over.{" "}
                  <Link to="/management-conversations" className="text-rose-gold hover:underline">
                    Go to conversations
                  </Link>
                  .
                </p>
              ) : conversation.isPending || clientSummary.isPending ? (
                <p className="mt-3 inline-flex items-center gap-2 font-body text-sm text-muted-grey">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.4} /> Loading the
                  conversation…
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Prefilled label="Client" value={clientSummary.data?.displayName} />
                  <Prefilled label="Talent" value={talentName} />
                </div>
              )}

              {!talentProfileId && conversationId && !conversation.isPending && (
                <p className="mt-3 font-body text-xs text-warning">
                  This conversation is not about a specific talent. Assign one before creating an
                  appointment.
                </p>
              )}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="category">
                    Engagement type
                  </label>
                  <select
                    id="category"
                    value={form.engagementCategoryId}
                    onChange={set("engagementCategoryId")}
                    className={inputCls}
                  >
                    <option value="" className="bg-noir">
                      Select…
                    </option>
                    {(categories.data ?? []).map((c) => (
                      <option key={c.id} value={c.id} className="bg-noir">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls} htmlFor="date">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={form.confirmedDate}
                    onChange={set("confirmedDate")}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls} htmlFor="start">
                    Start time
                  </label>
                  <input
                    id="start"
                    type="time"
                    value={form.startTime}
                    onChange={set("startTime")}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls} htmlFor="end">
                    End time
                  </label>
                  <input
                    id="end"
                    type="time"
                    value={form.endTime}
                    onChange={set("endTime")}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls} htmlFor="duration">
                    Duration (minutes)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    min="0"
                    value={form.durationMinutes}
                    onChange={set("durationMinutes")}
                    className={inputCls}
                    placeholder="240"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <Eyebrow>Location</Eyebrow>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="city">
                    City
                  </label>
                  <select id="city" value={form.cityId} onChange={set("cityId")} className={inputCls}>
                    <option value="" className="bg-noir">
                      Select…
                    </option>
                    {(cities.data ?? []).map((c) => (
                      <option key={c.id} value={c.id} className="bg-noir">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls} htmlFor="venueType">
                    Venue type
                  </label>
                  <select
                    id="venueType"
                    value={form.venueTypeId}
                    onChange={set("venueTypeId")}
                    className={inputCls}
                  >
                    <option value="" className="bg-noir">
                      Select…
                    </option>
                    {(venueTypes.data ?? []).map((v) => (
                      <option key={v.id} value={v.id} className="bg-noir">
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls} htmlFor="venueName">
                    Venue
                  </label>
                  <input
                    id="venueName"
                    value={form.venueName}
                    onChange={set("venueName")}
                    className={inputCls}
                    placeholder="The Residence"
                  />
                </div>

                <div>
                  <label className={labelCls} htmlFor="area">
                    General area
                  </label>
                  <input
                    id="area"
                    value={form.generalLocation}
                    onChange={set("generalLocation")}
                    className={inputCls}
                    placeholder="City centre"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className={labelCls} htmlFor="private">
                  Exact address — confidential
                </label>
                <input
                  id="private"
                  value={form.privateLocationDetails}
                  onChange={set("privateLocationDetails")}
                  className={inputCls}
                  placeholder="Apartment 4, private entrance"
                />
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.55rem] text-muted-grey">
                  <Lock className="w-2.5 h-2.5" strokeWidth={1.3} />
                  Management and the assigned talent only.
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mb-2">
                  Verified address (optional)
                </p>

                {/* Choose one of the client's saved addresses, or enter a new one inline. */}
                {(savedAddresses.data?.length ?? 0) > 0 && (
                  <div className="mb-3">
                    <label className={labelCls} htmlFor="savedAddress">
                      Client's saved address
                    </label>
                    <select
                      id="savedAddress"
                      value={savedAddressId}
                      onChange={(e) => setSavedAddressId(e.target.value)}
                      className={inputCls}
                    >
                      <option value="" className="bg-noir">
                        Enter a new address…
                      </option>
                      {savedAddresses.data.map((a) => (
                        <option key={a.id} value={a.id} className="bg-noir">
                          {a.label} — {formatAddressLine(a.address) || "address"}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[0.55rem] text-muted-grey">
                      Choosing one snapshots its details onto this appointment. It is never changed.
                    </p>
                  </div>
                )}

                {!savedAddressId && (
                  <AddressAutocomplete
                    value={addressForm}
                    onChange={setAddressForm}
                    label="Search the appointment address"
                    idPrefix="appt-addr"
                  />
                )}
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.55rem] text-muted-grey">
                  <Lock className="w-2.5 h-2.5" strokeWidth={1.3} />
                  Snapshotted onto this appointment. Choosing one here does not save it to the client.
                </p>
              </div>
            </Card>

            <Card className="p-4">
              <Eyebrow>Notes</Eyebrow>
              <div className="mt-3 space-y-3">
                <div>
                  <label className={labelCls} htmlFor="talentInstructions">
                    Instructions for the talent
                  </label>
                  <textarea
                    id="talentInstructions"
                    rows={3}
                    maxLength={4000}
                    value={form.talentInstructions}
                    onChange={set("talentInstructions")}
                    className={`${inputCls} resize-none`}
                    placeholder="Report to the concierge desk at 18:30 and ask for Michel."
                  />
                  <p className="mt-1.5 text-[0.55rem] text-muted-grey">
                    The talent reads this. It is their brief — not a note about the client.
                  </p>
                </div>

                <div>
                  <label className={labelCls} htmlFor="internalNotes">
                    Management notes
                  </label>
                  <textarea
                    id="internalNotes"
                    rows={3}
                    maxLength={4000}
                    value={form.clientVisibleNotes}
                    onChange={set("clientVisibleNotes")}
                    className={`${inputCls} resize-none`}
                    placeholder="Arranged by conversation on the 12th."
                  />
                  <p className="mt-1.5 text-[0.55rem] text-muted-grey">
                    Kept on the internal record. The talent does not see it.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right rail — the acknowledgement and the commit. */}
          <div className="space-y-5">
            <Card className="p-4">
              <Eyebrow>Talent availability</Eyebrow>

              <label className="mt-3 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={talentConfirmed}
                  onChange={(e) => setTalentConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-rose-gold shrink-0"
                />
                <span className="font-body text-sm text-soft-ivory/90 leading-relaxed">
                  Talent availability has been confirmed.
                </span>
              </label>

              <p className="mt-3 font-body text-[0.65rem] text-muted-grey leading-relaxed">
                Confirm this only after you have spoken to{" "}
                {talentName ? <span className="text-soft-ivory">{talentName}</span> : "the talent"}{" "}
                yourself. Lustra sends no acceptance request — the talent is told the appointment
                exists, not asked to approve it.
              </p>

              {!talentConfirmed && (
                <p className="mt-3 inline-flex items-start gap-1.5 text-[0.6rem] text-warning">
                  <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={1.4} />
                  Required before the appointment can be created.
                </p>
              )}
            </Card>

            <Card className="p-4">
              <Eyebrow>Commercial</Eyebrow>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className={labelCls} htmlFor="amount">
                    Agreed amount
                  </label>
                  <input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.agreedAmount}
                    onChange={set("agreedAmount")}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="currency">
                    Currency
                  </label>
                  <input
                    id="currency"
                    value={form.currencyCode}
                    onChange={set("currencyCode")}
                    maxLength={3}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="mt-2 font-body text-[0.55rem] text-muted-grey leading-relaxed">
                Recorded for internal reference only. No money moves through Lustra, and the
                talent does not see this figure.
              </p>

              {/*
                The priced snapshot the booking will actually carry — computed from the talent's
                commercial terms (or the override below) and the duration. Management only; the
                client will see just the total, the talent just their payout.
              */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="font-body text-[0.55rem] tracking-wide-luxe uppercase text-rose-gold/90">
                  Booking price {hasOverride ? "(overridden)" : "(from talent terms)"}
                </p>
                {terms?.isConfigured || hasOverride ? (
                  <dl className="mt-2 space-y-1.5">
                    <PreviewRow label="Client / hr" value={formatMinor(effClientHourlyMinor, previewCurrency)} />
                    <PreviewRow
                      label={`Client total${durationMinutes > 0 ? "" : " (set duration)"}`}
                      value={formatMinor(previewClientTotalMinor, previewCurrency)}
                    />
                    <PreviewRow label="Talent / hr" value={formatMinor(effTalentHourlyMinor, previewCurrency)} />
                    <PreviewRow label="Talent total" value={formatMinor(previewTalentTotalMinor, previewCurrency)} />
                    <div className="flex justify-between gap-3 pt-1.5 border-t border-white/10">
                      <dt className="font-body text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Margin</dt>
                      <dd className="font-body text-[0.7rem] text-success">
                        {formatMinor(previewMarginMinor, previewCurrency)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 font-body text-[0.6rem] text-warning leading-relaxed">
                    This talent has no commercial terms configured. The booking will be created
                    unpriced unless you set an override below.
                  </p>
                )}
              </div>

              {/* Per-booking override — sticks to this booking only, needs a reason. */}
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <p className={labelCls}>Override rates (optional, per hour)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls} htmlFor="clientOverride">Client / hr</label>
                    <input
                      id="clientOverride"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.clientHourlyRateOverride}
                      onChange={set("clientHourlyRateOverride")}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="talentOverride">Talent / hr</label>
                    <input
                      id="talentOverride"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.talentHourlyPayoutOverride}
                      onChange={set("talentHourlyPayoutOverride")}
                      className={inputCls}
                    />
                  </div>
                </div>
                {hasOverride && (
                  <div>
                    <label className={labelCls} htmlFor="overrideReason">
                      Reason (required)
                    </label>
                    <input
                      id="overrideReason"
                      value={form.pricingOverrideReason}
                      onChange={set("pricingOverrideReason")}
                      placeholder="Why this booking departs from the standard rate"
                      className={inputCls}
                    />
                    {overrideNeedsReason && (
                      <p className="mt-1 inline-flex items-start gap-1.5 text-[0.6rem] text-warning">
                        <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={1.4} />
                        A reason is required to override the rate.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-sm bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body text-[0.65rem] tracking-luxe uppercase font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {create.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.6} /> Creating…
                </>
              ) : (
                <>
                  <CalendarPlus className="w-3.5 h-3.5" strokeWidth={1.6} /> Create appointment
                </>
              )}
            </button>

            <p className="font-body text-[0.55rem] text-muted-grey text-center leading-relaxed">
              The client is not notified and will not see this record.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="font-body text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">{label}</dt>
      <dd className="font-body text-[0.7rem] text-soft-ivory/85">{value}</dd>
    </div>
  );
}

function Prefilled({ label, value }) {
  return (
    <div className="rounded-sm border border-white/[0.06] bg-deep-black/40 px-3 py-2.5">
      <p className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey">{label}</p>
      <p className="font-body text-sm text-ivory mt-0.5 inline-flex items-center gap-1.5">
        {value ? (
          <>
            <Check className="w-3 h-3 text-rose-gold shrink-0" strokeWidth={1.6} />
            {value}
          </>
        ) : (
          <span className="text-muted-grey">—</span>
        )}
      </p>
    </div>
  );
}
