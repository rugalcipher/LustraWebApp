import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2, User } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import PasswordField, { PASSWORD_RULES } from "@/components/auth/PasswordField";
import * as authService from "@/services/authService";
import { toUserMessage } from "@/api/problemDetails";

/**
 * Talent invitation activation.
 *
 * The backend builds this link from `AppUrls:TalentActivationPath`
 * (`/talent/activate?token={token}`), so this route must match it exactly.
 * Note it sits ABOVE `/talent/:id` in the registry — otherwise "activate" is
 * read as a talent id and the invitee lands on a broken profile page.
 *
 * There is no public talent self-registration: an account exists only because
 * Management invited it. The token is validated against the server before the
 * form is shown, so an expired invitation says so immediately instead of after
 * the invitee has chosen a password.
 */
export default function TalentActivate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState(token ? "validating" : "invalid");
  const [info, setInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    acceptPrivacy: false,
    isAdultDeclaration: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    authService
      .validateActivationToken(token)
      .then((result) => {
        if (cancelled) return;
        setInfo(result);
        setState(result.isValid ? "ready" : "expired");
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(toUserMessage(error));
        setState("expired");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const set = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    const unmet = PASSWORD_RULES.filter((r) => !r.test(form.password));
    if (!form.password) next.password = "Choose a password";
    else if (unmet.length) next.password = unmet[0].label;
    if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match";
    if (!form.isAdultDeclaration) next.isAdultDeclaration = "You must confirm you are 18 or older";
    if (!form.acceptTerms) next.acceptTerms = "Accept the Terms of Service to continue";
    if (!form.acceptPrivacy) next.acceptPrivacy = "Accept the Privacy Policy to continue";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setMessage("");
    try {
      // Activation returns a real auth result and adopts the session, so the
      // talent lands inside their portal already signed in.
      await authService.activateTalent({
        token,
        password: form.password,
        displayName: form.displayName.trim() || null,
        acceptTerms: form.acceptTerms,
        acceptPrivacy: form.acceptPrivacy,
        isAdultDeclaration: form.isAdultDeclaration,
      });
      navigate("/talent-portal", { replace: true });
    } catch (error) {
      setMessage(toUserMessage(error));
      setSubmitting(false);
    }
  };

  if (state === "validating") {
    return (
      <AuthLayout title="Checking your invitation" subtitle="One moment…">
        <div className="flex flex-col items-center gap-4 py-6" role="status" aria-live="polite">
          <Loader2 className="w-6 h-6 animate-spin text-rose-gold" aria-hidden="true" />
          <p className="text-sm text-soft-ivory/70">Validating your activation link.</p>
        </div>
      </AuthLayout>
    );
  }

  if (state === "invalid" || state === "expired") {
    return (
      <AuthLayout
        title={state === "invalid" ? "Invalid activation link" : "This invitation is no longer valid"}
        subtitle={
          state === "invalid"
            ? "This link is missing its security token"
            : "Invitations expire — Lustra Management can issue a new one"
        }
        footer={
          <>
            Already activated?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3">
          <AlertTriangle
            className="w-4 h-4 text-destructive shrink-0 mt-0.5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-sm text-destructive" role="alert">
            {message || "Contact Lustra Management to request a new invitation."}
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Activate your account"
      subtitle={info?.email ? `Invitation for ${info.email}` : "Set your password to continue"}
      footer={
        <>
          Already activated?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {message && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {message}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name (optional)</Label>
          <div className="relative">
            <User
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="displayName"
              className="pl-10 h-12"
              placeholder="How you appear to clients"
              value={form.displayName}
              onChange={set("displayName")}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Management can change this later. Leave it blank to keep the name on your invitation.
          </p>
        </div>

        <PasswordField
          label="Create a password"
          autoComplete="new-password"
          showRequirements
          value={form.password}
          onChange={set("password")}
          error={errors.password}
        />

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirmPassword}
          matchValue={form.password}
          onChange={set("confirmPassword")}
          error={errors.confirmPassword}
        />

        <fieldset className="space-y-2.5 pt-1">
          <legend className="sr-only">Declarations</legend>
          {[
            {
              field: "isAdultDeclaration",
              label: "I confirm I am 18 years of age or older.",
            },
            {
              field: "acceptTerms",
              label: (
                <>
                  I accept the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                  .
                </>
              ),
            },
            {
              field: "acceptPrivacy",
              label: (
                <>
                  I accept the{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </>
              ),
            },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 accent-rose-gold"
                  checked={form[field]}
                  onChange={set(field)}
                  aria-invalid={Boolean(errors[field]) || undefined}
                />
                <span className="text-sm text-soft-ivory/80">{label}</span>
              </label>
              {errors[field] && <p className="mt-1 text-xs text-destructive">{errors[field]}</p>}
            </div>
          ))}
        </fieldset>

        <Button type="submit" className="w-full h-12 font-medium" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              Activating…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Activate account
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
