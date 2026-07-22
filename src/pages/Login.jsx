import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Loader2, MailCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import PasswordField from "@/components/auth/PasswordField";
import { loginSchema } from "@/features/auth/schemas";
import { useLogin, applyServerErrors, useResendVerification } from "@/features/auth/hooks";
import { isApiError } from "@/api/problemDetails";

/** Seconds to disable the resend button after a send, so a link can't be spammed out. */
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Sign in against `POST /api/v1/auth/login`.
 *
 * There is no social/OAuth provider in the Lustra API, so no provider button is
 * offered — a button that cannot work is worse than no button.
 */
export default function Login() {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const login = useLogin();
  const resend = useResendVerification();

  // When sign-in is refused because the email is unverified, we show a calm panel with a
  // resend action instead of a red "login failed" — the credentials were fine.
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = async (values) => {
    setNeedsVerification(false);
    setResent(false);
    try {
      // A failed login never leaves a session behind — mutateAsync throws and nothing is stored.
      await login.mutateAsync(values);
    } catch (error) {
      if (isApiError(error) && error.code === "auth.email_not_verified") {
        setNeedsVerification(true);
        return;
      }
      applyServerErrors(error, setError);
    }
  };

  const resendVerification = async () => {
    if (cooldown > 0 || resend.isPending) return;
    const email = watch("email");
    try {
      // The endpoint is non-disclosing: it succeeds whether or not the email exists.
      await resend.mutateAsync(email);
    } catch {
      // Swallow — we never reveal whether the address is registered.
    }
    setResent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const busy = isSubmitting || login.isPending;

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Sign in to your Lustra account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Request access
          </Link>
        </>
      }
    >
      {errors.root && !needsVerification && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {errors.root.message}
        </div>
      )}

      {needsVerification && (
        <div role="status" className="mb-4 p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-start gap-2.5">
            <MailCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-foreground/90">
              Almost there — please verify your email address to finish signing in. We sent a
              verification link when your account was set up.
            </p>
          </div>
          {resent ? (
            <p className="text-xs text-muted-foreground">
              If that address needs verifying, a new link is on its way. Please check your inbox.
            </p>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-10"
              onClick={resendVerification}
              disabled={cooldown > 0 || resend.isPending}
            >
              {resend.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                </>
              ) : cooldown > 0 ? (
                `Resend available in ${cooldown}s`
              ) : (
                "Resend verification email"
              )}
            </Button>
          )}
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

        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={watch("password") ?? ""}
          error={errors.password?.message}
          labelSuffix={
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          }
          {...register("password")}
        />

        <Button type="submit" className="w-full h-12 font-medium" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
