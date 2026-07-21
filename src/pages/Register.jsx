import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Mail, User, Loader2, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import PasswordField from "@/components/auth/PasswordField";
import { toast } from "@/components/ui/use-toast";
import { registerSchema } from "@/features/auth/schemas";
import {
  useRegisterClient,
  useResendVerification,
  usePostAuthRedirect,
  applyServerErrors,
} from "@/features/auth/hooks";

/**
 * Client registration against `POST /api/v1/auth/client/register`.
 *
 * Lustra is an adults-only platform and there is no public Talent
 * self-registration — this form creates Client accounts only. The API returns a
 * session immediately, but the account stays unverified until the emailed link
 * is followed, so the verification step is shown before continuing.
 */
export default function Register() {
  const [registered, setRegistered] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      isAdultDeclaration: false,
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const registerClient = useRegisterClient();
  const resendVerification = useResendVerification();
  const redirect = usePostAuthRedirect();

  const onSubmit = async (values) => {
    try {
      const result = await registerClient.mutateAsync({
        email: values.email,
        password: values.password,
        displayName: values.displayName,
        acceptTerms: values.acceptTerms,
        acceptPrivacy: values.acceptPrivacy,
        isAdultDeclaration: values.isAdultDeclaration,
      });
      setRegistered(result);
    } catch (error) {
      applyServerErrors(error, setError);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification.mutateAsync(registered.user.email);
      toast({ title: "Verification email sent", description: "Check your inbox for the new link." });
    } catch {
      toast({
        title: "Couldn't resend",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  if (registered) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a verification link to ${registered.user.email}`}
      >
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Your account is ready. Follow the link in your email to verify your address — verification
            is required before you can submit an inquiry.
          </p>
          <Button className="w-full h-12 font-medium" onClick={() => redirect(registered)}>
            Continue to Lustra
          </Button>
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleResend}
            disabled={resendVerification.isPending}
          >
            {resendVerification.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  const busy = isSubmitting || registerClient.isPending;

  return (
    <AuthLayout
      icon={UserPlus}
      title="Request access"
      subtitle="Create your Lustra client account"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {errors.root && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {errors.root.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="displayName">Name</Label>
          <div className="relative">
            <User
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="displayName"
              autoComplete="name"
              autoFocus
              placeholder="How we should address you"
              className="pl-10 h-12"
              aria-invalid={Boolean(errors.displayName)}
              {...register("displayName")}
            />
          </div>
          {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-10 h-12"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <PasswordField
          label="Password"
          autoComplete="new-password"
          showRequirements
          value={watch("password") ?? ""}
          error={errors.password?.message}
          {...register("password")}
        />

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={watch("confirmPassword") ?? ""}
          matchValue={watch("password") ?? ""}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <div className="space-y-3 pt-2">
          <ConsentCheckbox
            id="isAdultDeclaration"
            checked={watch("isAdultDeclaration")}
            onChange={(v) => setValue("isAdultDeclaration", v, { shouldValidate: true })}
            error={errors.isAdultDeclaration?.message}
          >
            I confirm I am 18 years of age or older.
          </ConsentCheckbox>

          <ConsentCheckbox
            id="acceptTerms"
            checked={watch("acceptTerms")}
            onChange={(v) => setValue("acceptTerms", v, { shouldValidate: true })}
            error={errors.acceptTerms?.message}
          >
            I accept the{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            .
          </ConsentCheckbox>

          <ConsentCheckbox
            id="acceptPrivacy"
            checked={watch("acceptPrivacy")}
            onChange={(v) => setValue("acceptPrivacy", v, { shouldValidate: true })}
            error={errors.acceptPrivacy?.message}
          >
            I accept the{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </ConsentCheckbox>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

function ConsentCheckbox({ id, checked, onChange, error, children }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          aria-invalid={Boolean(error)}
          className="mt-0.5"
        />
        <Label htmlFor={id} className="text-sm font-normal leading-snug text-muted-foreground">
          {children}
        </Label>
      </div>
      {error && <p className="mt-1 ml-7 text-xs text-destructive">{error}</p>}
    </div>
  );
}
