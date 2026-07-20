import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, Loader2, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { useForgotPassword, applyServerErrors } from "@/features/auth/hooks";

/**
 * Request a password reset via `POST /api/v1/auth/forgot-password`.
 *
 * The API always returns 204 regardless of whether the email exists (account
 * enumeration protection), so the confirmation copy is deliberately neutral.
 */
export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const forgotPassword = useForgotPassword();

  const onSubmit = async (values) => {
    try {
      await forgotPassword.mutateAsync(values.email);
      setSent(true);
    } catch (error) {
      applyServerErrors(error, setError);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        icon={Mail}
        title="Check your email"
        subtitle="If that address has a Lustra account, a reset link is on its way."
        footer={
          <Link to="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            The link expires shortly for your security. If it doesn&apos;t arrive, check your spam
            folder before requesting another.
          </p>
          <Button variant="outline" className="w-full h-12" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  const busy = isSubmitting || forgotPassword.isPending;

  return (
    <AuthLayout
      icon={KeyRound}
      title="Reset your password"
      subtitle="We'll email you a link to set a new one"
      footer={
        <>
          Remembered it?{" "}
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
              autoFocus
              placeholder="you@example.com"
              className="pl-10 h-12"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
