import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, RotateCw, KeyRound, Lock, Unlock, MailCheck, Mail,
  LogOut, ShieldAlert, Copy, Check, UserRound, ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { isApiError, toUserMessage } from "@/api/problemDetails";
import ConfirmAction from "@/features/talentApplication/ConfirmAction";
import {
  useUserSecurity, useEffectivePermissions, useUserSecurityAction,
  useSetUserTemporaryPassword, useSetUserRoles, useRoles,
} from "@/features/admin/hooks";
import { ACCOUNT_ADMIN_ERROR_CODES } from "@/services/adminService";

/**
 * One account, in full.
 *
 * **Nothing here displays a password, a password hash, a security stamp, a reset
 * token or a refresh token.** The API returns none of them: `hasPassword` is a
 * boolean and the session state is a count. The single value that ever appears
 * is a temporary password, shown once in the response that created it, with a
 * warning that no screen will produce it again.
 *
 * Effective permissions are rendered exactly as returned, with the role that
 * granted each one. The UI asserts nothing about what any role — including
 * SuperAdmin — implies: the grants live in the database, the server is the
 * authority, and a hardcoded assumption here would eventually be a lie.
 *
 * `admin.last_superadmin` is surfaced as a refusal, not swallowed. It is a
 * Conflict rather than a validation failure: the request was well-formed and the
 * actor was authorised — it is the resulting state that is refused, because
 * nobody may lock everyone, themselves included, out of the platform.
 */

const TABS = ["Account status", "Roles", "Effective permissions", "Sessions & security"];

function Rows({ entries }) {
  return (
    <dl className="divide-y divide-white/[0.06]">
      {entries
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">{label}</dt>
            <dd className="font-body text-helper text-soft-ivory/85 text-right break-words">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function OneTimeSecret({ value, onDismiss }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-sm border border-warning/40 bg-warning/[0.07] p-4 space-y-2">
      <p className="flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-warning">
        <KeyRound className="w-3.5 h-3.5" aria-hidden="true" /> Temporary password — shown once
      </p>
      <div className="flex items-center gap-3">
        <code className="flex-1 font-mono text-lg text-ivory break-all">{value}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value);
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
        Every session has been revoked. It is not stored in readable form — if it is lost, set a
        new one.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
      >
        Dismiss
      </button>
    </div>
  );
}

export default function AdminUserDetail() {
  const { id } = useParams();
  const security = useUserSecurity(id);
  const permissions = useEffectivePermissions(id);
  const roleCatalogue = useRoles();

  const [tab, setTab] = useState(TABS[0]);
  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState("");
  const [secret, setSecret] = useState(null);
  const [draftRoles, setDraftRoles] = useState(null);

  const act = useUserSecurityAction(id);
  const temporary = useSetUserTemporaryPassword(id);
  const setRoles = useSetUserRoles(id);

  const busy = act.isPending || temporary.isPending || setRoles.isPending;
  const close = () => {
    setDialog(null);
    setActionError("");
  };

  /** Surfaces the final-SuperAdmin refusal as what it is, never as a success. */
  function report(error) {
    if (isApiError(error) && error.code === ACCOUNT_ADMIN_ERROR_CODES.lastSuperAdmin) {
      setActionError(
        "This would leave the platform with no usable SuperAdmin, so it was NOT applied. " +
          "Grant SuperAdmin to another active account first, then try again."
      );
      return;
    }
    setActionError(toUserMessage(error));
  }

  async function confirm(reason) {
    setActionError("");
    try {
      if (dialog === "lock") await act.mutateAsync({ kind: "lock", reason });
      else if (dialog === "unlock") await act.mutateAsync({ kind: "unlock" });
      else if (dialog === "confirm-email") await act.mutateAsync({ kind: "confirm-email" });
      else if (dialog === "resend-verification")
        await act.mutateAsync({ kind: "resend-verification" });
      else if (dialog === "force-password-reset")
        await act.mutateAsync({ kind: "force-password-reset" });
      else if (dialog === "revoke-sessions") await act.mutateAsync({ kind: "revoke-sessions" });
      else if (dialog === "temporary-password") {
        const result = await temporary.mutateAsync();
        if (result?.temporaryPassword) setSecret(result.temporaryPassword);
      } else if (dialog === "roles") {
        await setRoles.mutateAsync(draftRoles ?? []);
        setDraftRoles(null);
      }
      close();
    } catch (error) {
      report(error);
    }
  }

  if (security.isPending) {
    return (
      <div className="px-5 lg:px-8 py-6">
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
          <span className="font-body text-helper text-muted-grey">Loading account…</span>
        </Card>
      </div>
    );
  }

  if (security.isError) {
    return (
      <div className="px-5 lg:px-8 py-6">
        <Card className="p-6 space-y-3" role="alert">
          <p className="flex items-center gap-2 font-body text-body text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {toUserMessage(security.error)}
          </p>
          <button
            onClick={() => security.refetch()}
            className="inline-flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
          </button>
        </Card>
      </div>
    );
  }

  const state = security.data;
  const roles = draftRoles ?? permissions.data?.roles ?? [];
  const allRoles = roleCatalogue.data ?? [];

  const Action = ({ onClick, icon: Icon, tone, children }) => (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border font-body text-meta tracking-luxe uppercase disabled:opacity-40",
        tone ?? "border-white/12 text-soft-ivory/85 hover:border-rose-gold/40"
      )}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {children}
    </button>
  );

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Users
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">Account</p>
          <h1 className="font-heading font-light text-3xl text-ivory mt-1 flex items-center gap-3">
            <UserRound className="w-6 h-6 text-muted-grey" strokeWidth={1.3} aria-hidden="true" />
            {state.accountStatus}
          </h1>
        </div>
        {state.talentProfileId && (
          <Link
            to={`/admin/talent/${state.talentProfileId}`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40"
          >
            Associated talent profile
          </Link>
        )}
      </div>

      {secret && <OneTimeSecret value={secret} onDismiss={() => setSecret(null)} />}

      {actionError && !dialog && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-3"
        >
          <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <p className="font-body text-body text-destructive">{actionError}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06]" role="tablist">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              "px-3 py-2 font-body text-meta tracking-luxe uppercase transition border-b-2 -mb-px",
              tab === name
                ? "border-rose-gold text-rose-gold"
                : "border-transparent text-muted-grey hover:text-soft-ivory"
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "Account status" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-5">
          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg text-ivory">Status</h2>
            <Rows
              entries={[
                ["Account status", state.accountStatus],
                ["Email confirmed", state.emailConfirmed ? "Yes" : "No"],
                // A boolean only. The password itself is never readable.
                ["Password set", state.hasPassword ? "Yes" : "No"],
                ["Must change password", state.mustChangePassword ? "Yes" : "No"],
                [
                  "Required since",
                  state.mustChangePasswordSetAtUtc
                    ? new Date(state.mustChangePasswordSetAtUtc).toLocaleString()
                    : null,
                ],
                ["Locked out", state.isLockedOut ? "Yes" : "No"],
                [
                  "Lockout ends",
                  state.lockoutEndUtc ? new Date(state.lockoutEndUtc).toLocaleString() : null,
                ],
                ["Failed sign-in attempts", String(state.accessFailedCount)],
              ]}
            />
          </Card>

          <Card className="p-5 space-y-2">
            <h2 className="font-heading text-lg text-ivory">Actions</h2>
            {state.isLockedOut ? (
              <Action
                onClick={() => setDialog("unlock")}
                icon={Unlock}
                tone="border-success/40 text-success hover:bg-success/10"
              >
                Unlock
              </Action>
            ) : (
              <Action
                onClick={() => setDialog("lock")}
                icon={Lock}
                tone="border-warning/40 text-warning hover:bg-warning/10"
              >
                Lock account
              </Action>
            )}
            {!state.emailConfirmed && (
              <>
                <Action onClick={() => setDialog("confirm-email")} icon={MailCheck}>
                  Confirm email
                </Action>
                <Action onClick={() => setDialog("resend-verification")} icon={Mail}>
                  Resend verification
                </Action>
              </>
            )}
            <Action onClick={() => setDialog("force-password-reset")} icon={KeyRound}>
              Force password reset
            </Action>
            <Action
              onClick={() => setDialog("temporary-password")}
              icon={KeyRound}
              tone="border-warning/40 text-warning hover:bg-warning/10"
            >
              Set temporary password
            </Action>
          </Card>
        </div>
      )}

      {tab === "Roles" && (
        <Card className="p-5 space-y-4">
          <h2 className="font-heading text-lg text-ivory">Roles</h2>
          {roleCatalogue.isPending && (
            <p className="font-body text-helper text-muted-grey">Loading roles…</p>
          )}
          {roleCatalogue.isSuccess && allRoles.length === 0 && (
            <p className="font-body text-helper text-muted-grey">No roles are configured.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {allRoles.map((role) => {
              const on = roles.includes(role.name);
              return (
                <button
                  key={role.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setDraftRoles(
                      on ? roles.filter((r) => r !== role.name) : [...roles, role.name]
                    )
                  }
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
          {draftRoles && (
            <div className="flex gap-3">
              <button
                onClick={() => setDialog("roles")}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
              >
                Replace roles
              </button>
              <button
                onClick={() => setDraftRoles(null)}
                className="px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85"
              >
                Discard
              </button>
            </div>
          )}
          <p className="font-body text-meta text-muted-grey">
            Assigning roles replaces the whole set. The server refuses any change that would
            leave the platform without a usable SuperAdmin.
          </p>
        </Card>
      )}

      {tab === "Effective permissions" && (
        <Card className="p-5 space-y-4">
          <h2 className="font-heading text-lg text-ivory">Effective permissions</h2>
          {permissions.isPending && (
            <p className="flex items-center gap-2 font-body text-helper text-muted-grey">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading…
            </p>
          )}
          {permissions.isError && (
            <p className="font-body text-helper text-destructive" role="alert">
              {toUserMessage(permissions.error)}
            </p>
          )}
          {permissions.isSuccess && (
            <>
              <p className="font-body text-meta text-muted-grey">
                {permissions.data.permissions.length} permission
                {permissions.data.permissions.length === 1 ? "" : "s"} from{" "}
                {permissions.data.roles.length} role
                {permissions.data.roles.length === 1 ? "" : "s"}. This is what the server
                computed — nothing is inferred here from a role name.
              </p>
              {permissions.data.sources.length === 0 ? (
                <p className="font-body text-helper text-muted-grey">
                  This account holds no permissions.
                </p>
              ) : (
                permissions.data.sources.map((source) => (
                  <div key={source.role} className="space-y-1.5">
                    <p className="flex items-center gap-2 font-body text-meta tracking-wide-luxe uppercase text-rose-gold">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> {source.role}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {source.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-0.5 rounded-sm border border-white/10 font-body text-meta text-soft-ivory/80"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </Card>
      )}

      {tab === "Sessions & security" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-5">
          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg text-ivory">Sessions</h2>
            <Rows
              entries={[
                ["Active sessions", String(state.activeSessionCount)],
                [
                  "Last sign-in",
                  state.lastLoginAtUtc ? new Date(state.lastLoginAtUtc).toLocaleString() : "Never",
                ],
              ]}
            />
            <p className="font-body text-meta text-muted-grey">
              Individual sessions are not listed and no token is ever displayed. Revoking signs
              the account out everywhere at once.
            </p>
          </Card>
          <Card className="p-5 space-y-2">
            <h2 className="font-heading text-lg text-ivory">Security</h2>
            <Action
              onClick={() => setDialog("revoke-sessions")}
              icon={LogOut}
              tone="border-warning/40 text-warning hover:bg-warning/10"
            >
              Revoke all sessions
            </Action>
          </Card>
        </div>
      )}

      <ConfirmAction
        open={dialog === "lock"}
        title="Lock account"
        description="The user cannot sign in and every session is revoked. The reason is recorded."
        confirmLabel="Lock account"
        tone="destructive"
        reason
        reasonLabel="Reason"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
      <ConfirmAction
        open={dialog === "unlock"}
        title="Unlock account"
        description="The lockout is lifted and the failed-attempt counter is cleared."
        confirmLabel="Unlock"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
      <ConfirmAction
        open={dialog === "confirm-email"}
        title="Confirm email"
        description="Marks the address as confirmed on your authority, without the user clicking a link."
        confirmLabel="Confirm email"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
      <ConfirmAction
        open={dialog === "resend-verification"}
        title="Resend verification"
        description="Sends the verification email again to the address on the account."
        confirmLabel="Resend"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
      <ConfirmAction
        open={dialog === "force-password-reset"}
        title="Force a password reset"
        description="Revokes every session and emails a reset link. Their current password is never read or revealed — they choose a new one."
        confirmLabel="Force reset"
        tone="destructive"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
      <ConfirmAction
        open={dialog === "temporary-password"}
        title="Set a temporary password"
        description="Every session is revoked. The temporary password is shown once on this screen and can never be retrieved again."
        confirmLabel="Set temporary password"
        tone="destructive"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
      <ConfirmAction
        open={dialog === "revoke-sessions"}
        title="Revoke all sessions"
        description="Signs the account out on every device. They can sign in again with their existing password."
        confirmLabel="Revoke sessions"
        tone="destructive"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
      <ConfirmAction
        open={dialog === "roles"}
        title="Replace roles"
        description={`This account will hold exactly: ${(draftRoles ?? []).join(", ") || "no roles"}. Any role not listed is removed.`}
        confirmLabel="Replace roles"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
    </div>
  );
}
