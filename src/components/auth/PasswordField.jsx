import React, { forwardRef, useId, useMemo, useState } from "react";
import { Lock, Eye, EyeOff, Check, X, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePasswordPolicy, strengthFor } from "@/features/auth/passwordPolicy";

/**
 * The single password control used by every password field in the app.
 *
 * It exists because the requirements are identical everywhere and were being
 * re-implemented (or omitted) per page: reveal toggle, caps-lock warning,
 * strength meter, live requirement checklist, confirm-match state and real
 * labels. Centralising them means a fix lands once.
 *
 * The requirement list comes from `GET /public/password-policy`, which reads the
 * live ASP.NET Identity options — the same object that rejects the password. The
 * frontend holds no copy of those numbers, so changing the policy server-side
 * changes this checklist without a redeploy. It is FEEDBACK, not authorization:
 * the server revalidates and its field errors are mapped back onto the control.
 *
 * If the policy cannot be fetched the control shows the conservative assumption
 * and says the requirements are unconfirmed. It never falls back to something
 * weaker than the server might be enforcing.
 *
 * Accessibility: the toggle is a real button with `aria-pressed` and an
 * `aria-label` that states the resulting action; the checklist and caps-lock
 * warning are announced politely; errors are wired via `aria-describedby` and
 * `aria-invalid`. Nothing here ever renders an existing password — the value is
 * always supplied by the user in this session.
 */

const STRENGTH = [
  { label: "", bar: "", text: "" },
  { label: "Weak", bar: "bg-error", text: "text-error" },
  { label: "Fair", bar: "bg-warning", text: "text-warning" },
  { label: "Strong", bar: "bg-rose-gold", text: "text-rose-gold" },
  { label: "Excellent", bar: "bg-success", text: "text-success" },
];

/**
 * @typedef {object} PasswordFieldProps
 * @property {import("react").ReactNode} [label]
 * @property {import("react").ReactNode} [labelSuffix] Rendered at the end of the label row (e.g. a "Forgot password?" link).
 * @property {string} [value]
 * @property {string} [error]
 * @property {import("react").ReactNode} [hint]
 * @property {boolean} [showRequirements] Live checklist + strength meter (creation fields).
 * @property {string} [matchValue] Compare against this and show a match indicator.
 * @property {string} [autoComplete]
 * @property {string} [className]
 * @property {string} [id]
 * @property {(event: import("react").ChangeEvent<HTMLInputElement>) => void} [onChange]
 * @property {(event: import("react").FocusEvent<HTMLInputElement>) => void} [onBlur]
 * @property {string} [name]
 */

/** @type {import("react").ForwardRefExoticComponent<PasswordFieldProps & import("react").RefAttributes<HTMLInputElement>>} */
const PasswordField = forwardRef(function PasswordField(
  {
    label = "Password",
    labelSuffix,
    value = "",
    error,
    hint,
    /** Show the live requirement checklist + strength meter (creation fields). */
    showRequirements = false,
    /** Compare against this value and show a match indicator (confirm fields). */
    matchValue,
    autoComplete = "current-password",
    className,
    id: providedId,
    onChange,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const [revealed, setRevealed] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const { rules, isFallback } = usePasswordPolicy();
  const strength = useMemo(() => strengthFor(value, rules), [value, rules]);
  const results = useMemo(
    () => rules.map((r) => ({ ...r, ok: r.test(value ?? "") })),
    [value, rules]
  );

  const confirming = matchValue !== undefined;
  const matches = confirming && value.length > 0 && value === matchValue;
  const mismatched = confirming && value.length > 0 && value !== matchValue;

  const describedBy =
    [
      error ? `${id}-error` : null,
      hint ? `${id}-hint` : null,
      capsLock ? `${id}-caps` : null,
      showRequirements ? `${id}-rules` : null,
      confirming ? `${id}-match` : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const trackCaps = (event) => {
    // getModifierState is absent on synthetic events without a native key event.
    if (typeof event.getModifierState === "function") {
      setCapsLock(event.getModifierState("CapsLock"));
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {labelSuffix ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>{label}</Label>
          {labelSuffix}
        </div>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}

      <div className="relative">
        <Lock
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          id={id}
          type={revealed ? "text" : "password"}
          autoComplete={autoComplete}
          className="pl-10 pr-11 h-12"
          value={value}
          onChange={onChange}
          onKeyUp={trackCaps}
          onKeyDown={trackCaps}
          onBlur={(e) => {
            setCapsLock(false);
            props.onBlur?.(e);
          }}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          {...props}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-pressed={revealed}
          aria-label={revealed ? "Hide password" : "Show password"}
          title={revealed ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-sm text-muted-foreground hover:text-rose-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-gold/70 transition-colors"
        >
          {revealed ? (
            <EyeOff className="w-4 h-4" strokeWidth={1.4} aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" strokeWidth={1.4} aria-hidden="true" />
          )}
        </button>
      </div>

      {capsLock && (
        <p
          id={`${id}-caps`}
          role="status"
          className="flex items-center gap-1.5 text-xs text-warning"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          Caps Lock is on
        </p>
      )}

      {showRequirements && (
        <div id={`${id}-rules`} className="space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    strength >= step ? STRENGTH[strength].bar : "bg-ivory/15"
                  )}
                />
              ))}
            </div>
            <span
              className={cn("text-xs tabular-nums", STRENGTH[strength].text)}
              role="status"
              aria-live="polite"
            >
              {STRENGTH[strength].label}
            </span>
          </div>

          {isFallback && (
            <p className="text-xs text-warning" role="status">
              We could not confirm the current requirements. These are the strictest we
              apply — your password is checked again when you submit.
            </p>
          )}

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {results.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  r.ok ? "text-success" : "text-muted-foreground"
                )}
              >
                {r.ok ? (
                  <Check className="w-3 h-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <X className="w-3 h-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                )}
                <span>{r.label}</span>
                <span className="sr-only">{r.ok ? " — met" : " — not met"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirming && (
        <p
          id={`${id}-match`}
          role="status"
          aria-live="polite"
          className={cn(
            "text-xs",
            matches && "text-success",
            mismatched && "text-error",
            !matches && !mismatched && "sr-only"
          )}
        >
          {matches ? "Passwords match" : mismatched ? "Passwords do not match" : ""}
        </p>
      )}

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});

export default PasswordField;
