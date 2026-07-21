import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, KeyRound, Copy, Check } from "lucide-react";
import { Card } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { isApiError, toUserMessage } from "@/api/problemDetails";
import { useProvisionStaff, useRoles } from "@/features/admin/hooks";
import { STAFF_LOGIN_MODES, ACCOUNT_ADMIN_ERROR_CODES } from "@/services/adminService";

/**
 * Create a Management or Admin account.
 *
 * The caller never chooses a password. `loginMode` decides how the person gets
 * in: a set-your-own-password email, a temporary password returned once, or
 * nothing yet. That is deliberate — a password typed by one person and given to
 * another has been known to two people from the moment it existed, and the
 * backend's generator produces one against the CONFIGURED Identity policy rather
 * than a pattern that could drift from the validator.
 *
 * There is consequently no password field here, and so nothing for the shared
 * PasswordField to validate: the value is generated server-side and shown once.
 */

const inputCls =
  "w-full bg-deep-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body " +
  "text-ivory placeholder:text-muted-grey/70 focus:outline-none focus:border-rose-gold/50";

function Field({ label, error, children, hint, required, htmlFor }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey"
      >
        {label}
        {required && <span className="text-rose-gold"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="font-body text-meta text-muted-grey">{hint}</p>}
      {error && (
        <p className="font-body text-meta text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AdminStaffProvision() {
  const navigate = useNavigate();
  const provision = useProvisionStaff();
  const roles = useRoles();

  const [form, setForm] = useState({
    email: "",
    displayName: "",
    phoneNumber: "",
    roles: [],
    loginMode: STAFF_LOGIN_MODES.passwordReset,
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const set = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function submit() {
    const next = {};
    if (!form.email.trim()) next.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address";
    if (!form.displayName.trim()) next.displayName = "Required";
    if (form.roles.length === 0) next.roles = "Choose at least one role";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBanner("");
    try {
      const result = await provision.mutateAsync({
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        roles: form.roles,
        loginMode: form.loginMode,
      });
      setCreated(result);
    } catch (error) {
      if (isApiError(error) && error.code === ACCOUNT_ADMIN_ERROR_CODES.lastSuperAdmin) {
        setBanner(
          "This would leave the platform with no usable SuperAdmin, so the account was NOT created."
        );
        return;
      }
      setBanner(toUserMessage(error));
    }
  }

  if (created) {
    return (
      <div className="px-5 lg:px-8 py-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-7 h-7 text-success shrink-0" strokeWidth={1.2} aria-hidden="true" />
          <h1 className="font-heading font-light text-2xl text-ivory">Staff account created</h1>
        </div>

        <Card className="p-5">
          <dl className="divide-y divide-white/[0.06]">
            {[
              ["Email", created.email],
              ["Account status", created.accountStatus],
              ["Roles", created.roles.join(", ") || "None"],
              ["Login mode", created.loginMode],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2">
                <dt className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                  {label}
                </dt>
                <dd className="font-body text-helper text-soft-ivory/85 text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {created.temporaryPassword && (
          <div className="rounded-sm border border-warning/40 bg-warning/[0.07] p-4 space-y-2">
            <p className="flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-warning">
              <KeyRound className="w-3.5 h-3.5" aria-hidden="true" /> Temporary password — shown once
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 font-mono text-lg text-ivory break-all">
                {created.temporaryPassword}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(created.temporaryPassword);
                  setCopied(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/15 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy
                  </>
                )}
              </button>
            </div>
            <p className="font-body text-meta text-muted-grey">
              Give this to them now. It is not stored in readable form and no screen will show it
              again. They must change it when they first sign in.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/admin/users/${created.userId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
          >
            Open account
          </button>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85"
          >
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-2xl">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Users
      </Link>

      <div>
        <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">People</p>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">Add staff</h1>
      </div>

      {banner && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-3"
        >
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <p className="font-body text-body text-destructive">{banner}</p>
        </div>
      )}

      <Card className="p-5 space-y-4">
        <Field label="Email" required error={errors.email} htmlFor="email">
          <input id="email" type="email" className={inputCls} value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Display name" required error={errors.displayName} htmlFor="displayName">
          <input id="displayName" className={inputCls} value={form.displayName} onChange={set("displayName")} />
        </Field>
        <Field label="Phone" htmlFor="phoneNumber">
          <input id="phoneNumber" className={inputCls} value={form.phoneNumber} onChange={set("phoneNumber")} />
        </Field>

        <div className="space-y-1.5">
          <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
            Roles <span className="text-rose-gold">*</span>
          </p>
          {roles.isPending && <p className="font-body text-meta text-muted-grey">Loading roles…</p>}
          <div className="flex flex-wrap gap-2">
            {(roles.data ?? []).map((role) => {
              const on = form.roles.includes(role.name);
              return (
                <button
                  key={role.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      roles: on
                        ? prev.roles.filter((r) => r !== role.name)
                        : [...prev.roles, role.name],
                    }));
                    setErrors((prev) => ({ ...prev, roles: undefined }));
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full border font-body text-meta tracking-wide-luxe uppercase transition",
                    on
                      ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                      : "border-white/10 text-muted-grey hover:text-soft-ivory"
                  )}
                >
                  {role.name}
                </button>
              );
            })}
          </div>
          {errors.roles && (
            <p className="font-body text-meta text-error" role="alert">
              {errors.roles}
            </p>
          )}
        </div>

        <fieldset className="space-y-3">
          <legend className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey mb-2">
            How do they get in?
          </legend>
          {[
            {
              value: STAFF_LOGIN_MODES.passwordReset,
              title: "Email a set-your-password link",
              body: "They choose their own password. Nobody else ever knows it.",
            },
            {
              value: STAFF_LOGIN_MODES.temporaryPassword,
              title: "Set a temporary password",
              body:
                "Generated against the configured password policy and shown once on the next " +
                "screen. They must change it when they sign in.",
            },
            {
              value: STAFF_LOGIN_MODES.none,
              title: "No way in yet",
              body: "The account exists but cannot sign in. Give them access later.",
            },
          ].map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex gap-3 rounded-sm border p-3 cursor-pointer transition",
                form.loginMode === option.value
                  ? "border-rose-gold/50 bg-rose-gold/[0.06]"
                  : "border-white/10 hover:border-white/20"
              )}
            >
              <input
                type="radio"
                name="loginMode"
                className="mt-1 w-4 h-4 accent-rose-gold shrink-0"
                checked={form.loginMode === option.value}
                onChange={() => setForm((prev) => ({ ...prev, loginMode: option.value }))}
              />
              <span>
                <span className="block font-body text-body text-ivory">{option.title}</span>
                <span className="block font-body text-meta text-muted-grey mt-0.5">
                  {option.body}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <button
          onClick={submit}
          disabled={provision.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
        >
          {provision.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
          Create staff account
        </button>
      </Card>
    </div>
  );
}
