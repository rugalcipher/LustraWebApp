import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, AlertTriangle, ShieldAlert, LogOut } from "lucide-react";
import { Card } from "@/components/lustra/Primitives";
import PasswordField from "@/components/auth/PasswordField";
import { usePasswordPolicy } from "@/features/auth/passwordPolicy";
import { usePrincipal } from "@/auth/PrincipalContext";
import { useAuth } from "@/auth/AuthProvider";
import { useLogout } from "@/auth/useLogout";
import { changePassword } from "@/services/authService";
import { toUserMessage } from "@/api/problemDetails";

/**
 * The mandatory password change.
 *
 * Reached when an administrator has issued a temporary password or forced a
 * reset. Until the change succeeds the API refuses every authenticated route
 * with `auth.password_change_required`, so there is genuinely nothing else the
 * account can do — the screen says that rather than pretending it is a
 * suggestion.
 *
 * There is deliberately **no dismiss, no skip and no back**. The only two ways
 * out are changing the password or signing out, and signing out is offered
 * because someone handed a temporary password on a shared machine must be able
 * to leave without first choosing a permanent one.
 *
 * The requirement checklist comes from the live policy endpoint, so the rules
 * shown here are the rules that will be applied — see `passwordPolicy`.
 */
export default function ChangePasswordRequired() {
  const navigate = useNavigate();
  const { principal } = usePrincipal();
  const auth = useAuth();
  const logout = useLogout();
  const { rules } = usePasswordPolicy();

  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = "Enter the password you signed in with";
    if (!form.newPassword) next.newPassword = "Choose a new password";
    else {
      // The rules the SERVER is enforcing, fetched — not a copy of them.
      const unmet = rules.filter((rule) => !rule.test(form.newPassword));
      if (unmet.length) next.newPassword = unmet[0].label;
      else if (form.newPassword === form.currentPassword)
        next.newPassword = "Choose a password you have not used here before";
    }
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = "Passwords do not match";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setBanner("");
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      // The restriction lives on the token and in the account state. Re-read the
      // session so the new, unrestricted principal replaces the old one before
      // navigating — otherwise the guard would bounce straight back here.
      await auth.refreshUser?.();
      navigate("/", { replace: true });
    } catch (error) {
      setBanner(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lustra-marble min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <KeyRound className="w-8 h-8 text-rose-gold mx-auto" strokeWidth={1.2} aria-hidden="true" />
          <h1 className="font-heading font-light text-3xl text-ivory mt-3">
            Choose a new password
          </h1>
          {principal.email && (
            <p className="font-body text-helper text-muted-grey mt-1">{principal.email}</p>
          )}
        </div>

        <Card className="p-5 space-y-4">
          <p
            className="flex items-start gap-2 rounded-sm border border-warning/30 bg-warning/[0.07] p-3"
            role="status"
          >
            <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <span className="font-body text-body text-soft-ivory/85">
              Your password was set for you, so this account cannot be used until you replace
              it. Nothing else is available until you do.
            </span>
          </p>

          {banner && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-3"
            >
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
              <p className="font-body text-body text-destructive">{banner}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <PasswordField
              label="Current password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={set("currentPassword")}
              error={errors.currentPassword}
              hint="The temporary password you were given."
            />
            <PasswordField
              label="New password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={set("newPassword")}
              error={errors.newPassword}
              showRequirements
            />
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              error={errors.confirmPassword}
              matchValue={form.newPassword}
            />

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
              Set new password
            </button>
          </form>

          {/* The only other way out. Someone on a shared machine must be able to leave. */}
          <button
            type="button"
            onClick={() => logout()}
            className="w-full inline-flex items-center justify-center gap-2 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Sign out instead
          </button>
        </Card>
      </div>
    </div>
  );
}
