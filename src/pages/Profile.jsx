import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Lock, Shield, LogOut, ChevronRight, Loader2, Check } from "lucide-react";
import { usePrincipal } from "@/auth/PrincipalContext";
import { useLogout } from "@/auth/useLogout";
import { Monogram } from "@/lib/lustra/Brand";
import { StarDivider } from "@/lib/lustra/Brand";
import { Eyebrow } from "@/components/lustra/Primitives";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { applyServerErrors } from "@/features/auth/hooks";
import { useClientProfile, useUpdateClientProfile } from "@/features/client/hooks";
import { useCities } from "@/features/discovery/hooks";

/**
 * The client's account view and editable profile.
 *
 * Identity (name, email) comes from `/auth/me`; the editable operational profile comes
 * from `/client/profile`. Nothing here is stored client-side.
 */

const profileSchema = z.object({
  preferredName: z.string().trim().max(80, "Please keep this under 80 characters").optional(),
  phoneNumber: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^\+?[0-9\s\-()]{7,20}$/.test(v),
      "Enter a valid contact number"
    ),
  preferredCityId: z.string().optional(),
  contactPreference: z.enum(["InApp", "Email", "Phone"]),
  engagementPreferences: z.string().max(2000, "Please keep this under 2000 characters").optional(),
});

export default function Profile() {
  const { principal, isVip } = usePrincipal();
  const logout = useLogout();
  const { data: profile, isPending, isError, error } = useClientProfile();
  const { data: cities = [] } = useCities();
  const updateProfile = useUpdateClientProfile();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      preferredName: "",
      phoneNumber: "",
      preferredCityId: "",
      contactPreference: "InApp",
      engagementPreferences: "",
    },
  });

  // Seed the form once the server profile arrives, so the inputs reflect saved values
  // rather than an optimistic guess.
  useEffect(() => {
    if (!profile) return;
    reset({
      preferredName: profile.preferredName ?? "",
      phoneNumber: profile.phoneNumber ?? "",
      preferredCityId: profile.preferredCityId ?? "",
      contactPreference: profile.contactPreference ?? "InApp",
      engagementPreferences: profile.engagementPreferences ?? "",
    });
  }, [profile, reset]);

  const onSubmit = async (values) => {
    try {
      await updateProfile.mutateAsync({
        preferredName: values.preferredName?.trim() || null,
        phoneNumber: values.phoneNumber?.trim() || null,
        preferredCityId: values.preferredCityId || null,
        contactPreference: values.contactPreference,
        engagementPreferences: values.engagementPreferences?.trim() || null,
      });
      toast({ title: "Profile saved" });
    } catch (err) {
      applyServerErrors(err, setError);
    }
  };

  const busy = isSubmitting || updateProfile.isPending;
  const suspended = principal.accountStatus && principal.accountStatus !== "Active";

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-elevated-black border border-rose-gold/30 flex items-center justify-center">
          <Monogram size={36} />
        </div>
        <p className="font-heading text-2xl text-ivory mt-4">
          {profile?.preferredName || principal.displayName || "Member"}
        </p>
        <p className="text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 mt-1">
          {isVip ? "VIP Member" : "Private Member"}
        </p>
        <div className="w-full mt-5">
          <StarDivider />
        </div>
      </div>

      {suspended && (
        <div role="alert" className="mt-6 p-4 rounded-lg border border-error/30 bg-error/5">
          <p className="font-body text-sm text-error">
            Your account is currently {principal.accountStatus.toLowerCase()}. Please contact your Lustra
            representative.
          </p>
        </div>
      )}

      {/* Editable profile */}
      <div className="mt-6">
        <Eyebrow>Your Details</Eyebrow>

        {isPending ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
          </div>
        ) : isError && isApiError(error) && error.kind === "forbidden" ? (
          <p className="mt-3 font-body text-sm text-muted-grey">
            Your profile is unavailable while your account is restricted.
          </p>
        ) : isError ? (
          <p className="mt-3 font-body text-sm text-destructive">{toUserMessage(error)}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3.5" noValidate>
            {errors.root && (
              <p role="alert" className="text-xs text-destructive">
                {errors.root.message}
              </p>
            )}

            <FormField label="Preferred name" error={errors.preferredName?.message}>
              <input
                placeholder="How we should address you"
                className={inputCls}
                {...register("preferredName")}
              />
            </FormField>

            <FormField label="Contact number" error={errors.phoneNumber?.message}>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="+27 82 555 0140"
                className={inputCls}
                {...register("phoneNumber")}
              />
            </FormField>

            <FormField label="Usual city" error={errors.preferredCityId?.message}>
              <select className={inputCls} {...register("preferredCityId")}>
                <option value="">Not set</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Preferred contact method" error={errors.contactPreference?.message}>
              <select className={inputCls} {...register("contactPreference")}>
                <option value="InApp">In-app only (most discreet)</option>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
              </select>
            </FormField>

            <FormField label="Standing preferences" error={errors.engagementPreferences?.message}>
              <textarea
                rows={3}
                placeholder="Anything management should know for every engagement…"
                className={`${inputCls} resize-none`}
                {...register("engagementPreferences")}
              />
            </FormField>

            <button
              type="submit"
              disabled={busy || !isDirty}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body uppercase text-[0.65rem] tracking-luxe py-3.5 rounded-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                </>
              ) : updateProfile.isSuccess && !isDirty ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Saved
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </form>
        )}
      </div>

      <Section title="Account">
        <Row icon={Bell} label="Notifications & security" to="/settings" />
      </Section>

      <Section title="Legal">
        <Row icon={Shield} label="Terms & Conditions" to="/terms" />
        <Row icon={Lock} label="Privacy Policy" to="/privacy" />
        <Row label="Community Standards" to="/safety" />
      </Section>

      <button
        onClick={() => logout()}
        className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 border border-error/30 rounded-sm text-[0.65rem] tracking-luxe uppercase text-error hover:bg-error/5 transition"
      >
        <LogOut className="w-4 h-4" strokeWidth={1.2} /> Sign Out
      </button>

      <p className="text-center text-[0.5rem] tracking-luxe uppercase text-muted-grey/50 mt-6">
        LUSTRA.APP · Desire, Reserved.
      </p>
    </div>
  );
}

const inputCls =
  "w-full bg-card-black border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 transition [color-scheme:dark]";

function FormField({ label, error, children }) {
  return (
    <div>
      <label className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mb-1.5 block">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-6">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2 bg-card-black/50 border border-white/[0.06] rounded-lg overflow-hidden divide-y divide-white/[0.04]">
        {children}
      </div>
    </div>
  );
}

/** @param {{ icon?: import("react").ComponentType<any>; label?: import("react").ReactNode; to?: string }} props */
function Row({ icon: Icon, label, to }) {
  const content = (
    <div className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition">
      <span className="flex items-center gap-3 text-sm text-soft-ivory/85 font-body">
        {Icon && <Icon className="w-4 h-4 text-muted-grey" strokeWidth={1.2} />} {label}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-grey" strokeWidth={1.2} />
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
