import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useVerifyEmail, useResendVerification } from "@/features/auth/hooks";
import { toUserMessage } from "@/api/problemDetails";

/**
 * Completes email verification from the link in the account email.
 *
 * The backend builds that link from `AppUrls:EmailVerificationPath`, which is
 * `/verify-email?userId={userId}&token={token}` — this route has to match it
 * exactly or every verification email dead-ends on a 404.
 *
 * Verification is attempted once, automatically, on mount: the user already
 * expressed intent by clicking the link, so making them press another button
 * adds a step and no safety. The guard ref keeps React's development
 * double-invoke from firing the mutation twice, which would surface the second
 * (now consumed) attempt as a spurious failure.
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const token = searchParams.get("token") ?? "";

  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const attempted = useRef(false);
  const [state, setState] = useState(userId && token ? "verifying" : "invalid");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!userId || !token || attempted.current) return;
    attempted.current = true;

    verify
      .mutateAsync({ userId, token })
      .then(() => setState("verified"))
      .catch((error) => {
        setMessage(toUserMessage(error));
        setState("failed");
      });
    // The mutation is stable for the life of this page; the link parameters drive it.
     
  }, [userId, token]);

  const onResend = async (event) => {
    event.preventDefault();
    setResent(false);
    try {
      await resend.mutateAsync(resendEmail);
      // Deliberately not "we sent it to that address" — that would confirm
      // whether an account exists to anyone who can type an email in.
      setResent(true);
    } catch (error) {
      setMessage(toUserMessage(error));
    }
  };

  if (state === "verifying") {
    return (
      <AuthLayout title="Confirming your email" subtitle="One moment…">
        <div className="flex flex-col items-center gap-4 py-6" role="status" aria-live="polite">
          <Loader2 className="w-6 h-6 animate-spin text-rose-gold" aria-hidden="true" />
          <p className="text-sm text-soft-ivory/70">Verifying your address.</p>
        </div>
      </AuthLayout>
    );
  }

  if (state === "verified") {
    return (
      <AuthLayout
        title="Email confirmed"
        subtitle="Your Lustra account is ready"
        footer={
          <>
            Need help?{" "}
            <Link to="/" className="text-primary font-medium hover:underline">
              Return home
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 text-center py-2" role="status">
          <CheckCircle2 className="w-10 h-10 text-success" strokeWidth={1.2} aria-hidden="true" />
          <p className="text-sm text-soft-ivory/75">
            Thank you — your email address has been confirmed. You can sign in now.
          </p>
          <Button asChild className="w-full h-12 font-medium">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // invalid | failed — both offer the same recovery: request a fresh link.
  return (
    <AuthLayout
      title={state === "invalid" ? "Invalid verification link" : "We could not confirm that link"}
      subtitle={
        state === "invalid"
          ? "This link is missing its security details"
          : "The link may have expired or already been used"
      }
      footer={
        <>
          Already confirmed?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3">
          <AlertTriangle
            className="w-4 h-4 text-destructive shrink-0 mt-0.5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-sm text-destructive" role="alert">
            {message || "Open the most recent verification email, or request a new link below."}
          </p>
        </div>

        {resent ? (
          <p className="text-sm text-soft-ivory/75" role="status">
            If that address has an account awaiting verification, a new link is on its way.
          </p>
        ) : (
          <form onSubmit={onResend} className="space-y-3" noValidate>
            <div className="space-y-2">
              <Label htmlFor="resend-email">Email</Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pl-10 h-12"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 font-medium" disabled={resend.isPending}>
              {resend.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                "Send a new link"
              )}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
