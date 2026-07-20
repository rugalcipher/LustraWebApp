import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { resetPasswordSchema } from "@/features/auth/schemas";
import { useResetPassword, applyServerErrors } from "@/features/auth/hooks";

/**
 * Complete a password reset via `POST /api/v1/auth/reset-password`.
 *
 * The backend requires `{ email, token, newPassword }`. The emailed link
 * carries both `email` and `token` as query parameters; if the address is
 * missing (e.g. the link was truncated) the user is asked for it rather than
 * being dead-ended.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const token = searchParams.get("token") ?? "";
  const emailFromLink = searchParams.get("email") ?? "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: emailFromLink, token, newPassword: "", confirmPassword: "" },
  });

  const resetPassword = useResetPassword();

  const onSubmit = async (values) => {
    try {
      await resetPassword.mutateAsync({
        email: values.email,
        token: values.token,
        newPassword: values.newPassword,
      });
      setDone(true);
    } catch (error) {
      applyServerErrors(error, setError);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Invalid reset link"
        subtitle="This link is missing its security token"
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-center text-muted-foreground">
          Reset links expire for your security. Request a new one and use the most recent email.
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout icon={CheckCircle2} title="Password updated" subtitle="You can now sign in">
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            For your security, every other signed-in session has been ended.
          </p>
          <Button className="w-full h-12 font-medium" onClick={() => navigate("/login", { replace: true })}>
            Sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  const busy = isSubmitting || resetPassword.isPending;

  return (
    <AuthLayout icon={Lock} title="Set a new password" subtitle="Choose a strong, unique password">
      {errors.root && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {errors.root.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <input type="hidden" {...register("token")} />

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
              readOnly={Boolean(emailFromLink)}
              placeholder="you@example.com"
              className="pl-10 h-12"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              className="pl-10 h-12"
              aria-invalid={Boolean(errors.newPassword)}
              {...register("newPassword")}
            />
          </div>
          {errors.newPassword ? (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              At least 8 characters, with upper and lower case, a number and a symbol.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="pl-10 h-12"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
