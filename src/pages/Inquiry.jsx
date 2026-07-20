import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Lock, Calendar, Clock, MapPin, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarDivider } from "@/lib/lustra/Brand";
import { Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { toUserMessage } from "@/api/problemDetails";
import { applyServerErrors } from "@/features/auth/hooks";
import { clearIntendedAction } from "@/features/auth/intendedAction";
import { useTalentProfile, useDiscoveryFilterOptions, useTaxonomy } from "@/features/discovery/hooks";
import { useCreateInquiry, useInquiryIdempotencyKey } from "@/features/inquiries/hooks";
import { inquirySchema, toCreateInquiryInput } from "@/features/inquiries/schema";
import { useClientProfile } from "@/features/client/hooks";

/**
 * Submit a booking inquiry.
 *
 * This creates a REQUEST FOR MANAGEMENT REVIEW — not a booking, not a price, not a
 * contract. On success the client is routed to the real inquiry detail; no fake
 * management chat is created and nothing is auto-confirmed.
 */
export default function Inquiry() {
  const { id: slug } = useParams();
  const navigate = useNavigate();

  const { talent, isLoading: talentLoading, notFound } = useTalentProfile(slug);
  const { cities, engagementCategories, isLoading: optionsLoading } = useDiscoveryFilterOptions();
  const { data: venueTypes = [] } = useTaxonomy("venue-types");
  const { data: clientProfile } = useClientProfile();

  const createInquiry = useCreateInquiry();
  const idempotency = useInquiryIdempotencyKey();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      engagementCategoryId: "",
      preferredDate: "",
      alternativeDate: "",
      preferredStartTime: "",
      estimatedDurationMinutes: "",
      cityId: "",
      venueTypeId: "",
      attendeeCount: "",
      travelRequired: false,
      clientMessage: "",
      additionalRequirements: "",
      acknowledged: false,
    },
  });

  // Prefill the city from the talent's location, falling back to the client's own
  // preferred city. Only ever a starting point — the client can change it.
  useEffect(() => {
    if (optionsLoading) return;
    const current = watch("cityId");
    if (current) return;

    const talentCity = talent?.city ? cities.find((c) => c.name === talent.city) : null;
    const preferred = clientProfile?.preferredCityId
      ? cities.find((c) => c.id === clientProfile.preferredCityId)
      : null;
    const chosen = talentCity ?? preferred;
    if (chosen) setValue("cityId", chosen.id);
  }, [optionsLoading, cities, talent?.city, clientProfile?.preferredCityId, setValue, watch]);

  const onSubmit = async (values) => {
    if (!talent) return;
    try {
      const result = await createInquiry.mutateAsync({
        input: toCreateInquiryInput(values, talent.talentProfileId),
        // The SAME key for every retry of this submission — a double-tap or a network
        // retry replays the original inquiry instead of creating a second.
        idempotencyKey: idempotency.key(),
      });

      // The intent that brought a guest here is fulfilled; a new form is a new intent.
      clearIntendedAction();
      idempotency.reset();
      reset();

      navigate(`/app/inquiries/${result.inquiryId}`, { replace: true });
    } catch (error) {
      applyServerErrors(error, setError);
    }
  };

  if (talentLoading) {
    return (
      <div className="px-6 py-32 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  // A talent may have been paused or withdrawn between browsing and submitting — say so
  // plainly rather than presenting a form that cannot succeed.
  if (notFound || !talent) {
    return (
      <div className="px-6 py-32 text-center">
        <p className="font-heading text-2xl text-ivory">This profile is unavailable</p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          They may no longer be accepting inquiries. Our concierge can suggest alternatives.
        </p>
        <LustraButton as={Link} to="/app/discover" variant="outline" size="sm" className="mt-6">
          Return to Discover
        </LustraButton>
      </div>
    );
  }

  const busy = isSubmitting || createInquiry.isPending;
  const acknowledged = watch("acknowledged");

  return (
    <div className="lustra-marble min-h-screen">
      <header className="sticky top-0 z-40 bg-noir/85 backdrop-blur-md border-b border-white/[0.05] safe-top">
        <div className="max-w-luxe mx-auto px-5 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-ivory" aria-label="Back">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.4} />
          </button>
          <span className="font-heading text-lg text-ivory">Booking Inquiry</span>
          <span className="w-5" />
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-luxe mx-auto px-5 py-6 pb-32" noValidate>
        {/* Talent summary */}
        <div className="flex items-center gap-3 mb-6">
          {talent.cover && (
            <img
              src={talent.cover}
              alt={talent.name}
              className="w-14 h-14 rounded-full object-cover border border-rose-gold/30"
            />
          )}
          <div>
            <p className="font-heading text-xl text-ivory leading-none">{talent.name}</p>
            <p className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey mt-1">{talent.headline}</p>
          </div>
        </div>

        <StarDivider label="Inquiry Details" />

        {errors.root && (
          <div role="alert" className="mt-5 p-3 rounded-sm bg-destructive/10 text-destructive text-sm">
            {errors.root.message}
          </div>
        )}

        {/* Engagement — real taxonomy ids, never labels */}
        <div className="mt-6">
          <Eyebrow>Engagement Type</Eyebrow>
          {optionsLoading ? (
            <p className="mt-3 font-body text-[0.65rem] text-muted-grey">Loading options…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {engagementCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setValue("engagementCategoryId", category.id, { shouldValidate: true })}
                  className={cn(
                    "py-2.5 px-3 text-[0.6rem] tracking-wide-luxe uppercase rounded-sm border transition text-left",
                    watch("engagementCategoryId") === category.id
                      ? "border-rose-gold/50 text-rose-gold bg-rose-gold/5"
                      : "border-white/[0.08] text-soft-ivory/70"
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
          {errors.engagementCategoryId && (
            <p className="mt-2 text-xs text-destructive">{errors.engagementCategoryId.message}</p>
          )}
        </div>

        {/* Date / time */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Field label="Preferred Date" icon={Calendar} error={errors.preferredDate?.message}>
            <input type="date" className={inputCls} {...register("preferredDate")} />
          </Field>
          <Field label="Preferred Time" icon={Clock} error={errors.preferredStartTime?.message}>
            <input type="time" className={inputCls} {...register("preferredStartTime")} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Alternative Date" icon={Calendar} error={errors.alternativeDate?.message}>
            <input type="date" className={inputCls} {...register("alternativeDate")} />
          </Field>
          <Field
            label="Est. Duration (minutes)"
            icon={Clock}
            error={errors.estimatedDurationMinutes?.message}
          >
            <input
              type="number"
              min="1"
              placeholder="e.g. 240"
              className={inputCls}
              {...register("estimatedDurationMinutes")}
            />
          </Field>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="City" icon={MapPin} error={errors.cityId?.message}>
            <select className={inputCls} {...register("cityId")}>
              <option value="">Select a city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Venue Type" icon={MapPin} error={errors.venueTypeId?.message}>
            <select className={inputCls} {...register("venueTypeId")}>
              <option value="">Not sure yet</option>
              {venueTypes.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Attendees" icon={Users} error={errors.attendeeCount?.message}>
            <input type="number" min="0" placeholder="Optional" className={inputCls} {...register("attendeeCount")} />
          </Field>
          <div className="flex items-end">
            <label
              className={cn(
                "flex items-center gap-2 text-[0.65rem] tracking-wide-luxe uppercase cursor-pointer py-2.5",
                watch("travelRequired") ? "text-rose-gold" : "text-soft-ivory/70"
              )}
            >
              <input type="checkbox" className="accent-rose-gold w-3.5 h-3.5" {...register("travelRequired")} />
              Travel required
            </label>
          </div>
        </div>

        {/* Message */}
        <div className="mt-5">
          <Eyebrow>Your Message to Management</Eyebrow>
          <textarea
            rows={4}
            placeholder="Share the nature of your engagement, tone, and any specific requests…"
            className="w-full mt-3 bg-card-black border border-white/[0.08] rounded-sm px-3 py-3 text-sm font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 resize-none transition"
            {...register("clientMessage")}
          />
          {errors.clientMessage && (
            <p className="mt-1 text-xs text-destructive">{errors.clientMessage.message}</p>
          )}
        </div>

        {/* Acknowledgement */}
        <label className="flex items-start gap-2.5 mt-5 cursor-pointer">
          <input type="checkbox" className="accent-rose-gold w-4 h-4 mt-0.5 shrink-0" {...register("acknowledged")} />
          <span className="text-[0.65rem] text-muted-grey leading-relaxed font-body">
            I understand this is an inquiry, not a confirmed booking. All arrangements are handled
            discreetly by Lustra management. I agree to the{" "}
            <Link to="/terms" className="text-rose-gold underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-rose-gold underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.acknowledged && (
          <p className="mt-1 ml-7 text-xs text-destructive">{errors.acknowledged.message}</p>
        )}

        <p className="text-[0.6rem] text-muted-grey flex items-center gap-1.5 mt-5">
          <Lock className="w-3 h-3" strokeWidth={1.2} /> All interactions are private and discreet.
        </p>

        {createInquiry.isError && !errors.root && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {toUserMessage(createInquiry.error)}
          </p>
        )}

        {/* Submit bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-noir/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom">
          <div className="max-w-luxe mx-auto px-5 py-3">
            <LustraButton type="submit" disabled={!acknowledged || busy} size="lg" className="w-full">
              {busy ? "Sending…" : "Send Inquiry"}
            </LustraButton>
          </div>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full bg-card-black border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 transition [color-scheme:dark]";

function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-1.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" strokeWidth={1.2} />} {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
