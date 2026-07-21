import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Loader2, AlertTriangle, RotateCw, Lock } from "lucide-react";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import ConfirmAction from "@/features/talentApplication/ConfirmAction";
import {
  useRoles, useRole, usePermissionCatalogue, useSetRolePermissions,
} from "@/features/admin/hooks";

/**
 * Roles and the permission catalogue.
 *
 * Everything shown comes from the server: the roles, the permissions each grants
 * and the catalogue they are chosen from. **Nothing is assumed about any role.**
 * SuperAdmin is not hardcoded as holding everything — if its grants change in the
 * database, this screen shows the change, because it renders the data rather
 * than a belief about it.
 *
 * A system role is still editable where the backend allows it; the flag is shown
 * so an operator knows they are touching something the platform depends on.
 */
export default function AdminRoles() {
  const roles = useRoles();
  const catalogue = usePermissionCatalogue();

  const [selectedRole, setSelectedRole] = useState(null);
  const role = useRole(selectedRole ?? undefined);
  const save = useSetRolePermissions(selectedRole ?? undefined);

  const [draft, setDraft] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState("");

  // Select the first role once the list arrives, so the page is never a bare list.
  useEffect(() => {
    if (!selectedRole && roles.data?.length) setSelectedRole(roles.data[0].name);
  }, [roles.data, selectedRole]);

  // Drop any pending edit when the selection changes — carrying it across would
  // silently apply one role's changes to another.
  useEffect(() => {
    setDraft(null);
    setActionError("");
  }, [selectedRole]);

  const granted = draft ?? role.data?.permissions ?? [];
  const grantedSet = useMemo(() => new Set(granted), [granted]);
  const dirty = draft !== null;

  const toggle = (permission) =>
    setDraft(
      grantedSet.has(permission)
        ? granted.filter((p) => p !== permission)
        : [...granted, permission]
    );

  async function apply() {
    setActionError("");
    try {
      await save.mutateAsync(draft ?? []);
      setDraft(null);
      setConfirming(false);
    } catch (error) {
      setActionError(toUserMessage(error));
    }
  }

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5">
      <div>
        <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">People</p>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">Roles &amp; permissions</h1>
        <p className="font-body text-helper text-muted-grey mt-1">
          What each role grants. The server enforces these — this screen only edits them.
        </p>
      </div>

      {roles.isPending && (
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
          <span className="font-body text-helper text-muted-grey">Loading roles…</span>
        </Card>
      )}

      {roles.isError && (
        <Card className="p-6 space-y-3" role="alert">
          <p className="flex items-center gap-2 font-body text-body text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {toUserMessage(roles.error)}
          </p>
          <button
            onClick={() => roles.refetch()}
            className="inline-flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
          </button>
        </Card>
      )}

      {roles.isSuccess && (roles.data ?? []).length === 0 && (
        <EmptyState icon={ShieldCheck} title="No roles" body="No roles are configured." />
      )}

      {roles.isSuccess && (roles.data ?? []).length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-[18rem_1fr] gap-5">
          <Card className="p-3">
            <ul className="space-y-1" role="tablist" aria-label="Roles">
              {roles.data.map((item) => (
                <li key={item.id}>
                  <button
                    role="tab"
                    aria-selected={selectedRole === item.name}
                    onClick={() => setSelectedRole(item.name)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-sm transition",
                      selectedRole === item.name
                        ? "bg-rose-gold/10 text-rose-gold border-l-2 border-rose-gold"
                        : "text-soft-ivory/75 hover:bg-white/5 border-l-2 border-transparent"
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-body text-helper truncate">{item.name}</span>
                      <span className="font-body text-meta text-muted-grey tabular-nums">
                        {item.permissionCount}
                      </span>
                    </span>
                    {item.isSystemRole && (
                      <span className="flex items-center gap-1 font-body text-meta text-muted-grey mt-0.5">
                        <Lock className="w-3 h-3" aria-hidden="true" /> System role
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 space-y-4 min-w-0">
            {role.isPending && (
              <p className="flex items-center gap-2 font-body text-helper text-muted-grey">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading role…
              </p>
            )}

            {role.isError && (
              <p className="font-body text-helper text-destructive" role="alert">
                {toUserMessage(role.error)}
              </p>
            )}

            {role.isSuccess && (
              <>
                <div>
                  <h2 className="font-heading text-xl text-ivory">{role.data.name}</h2>
                  {role.data.description && (
                    <p className="font-body text-helper text-muted-grey mt-0.5">
                      {role.data.description}
                    </p>
                  )}
                  <p className="font-body text-meta text-muted-grey mt-1">
                    {granted.length} of{" "}
                    {(catalogue.data ?? []).reduce((n, g) => n + g.permissions.length, 0)}{" "}
                    permissions granted
                    {role.data.isSystemRole && " · system role"}
                  </p>
                </div>

                {actionError && (
                  <p className="font-body text-meta text-destructive" role="alert">
                    {actionError}
                  </p>
                )}

                {catalogue.isPending && (
                  <p className="font-body text-helper text-muted-grey">Loading catalogue…</p>
                )}

                {catalogue.isSuccess &&
                  (catalogue.data ?? []).map((group) => (
                    <div key={group.category} className="space-y-2">
                      <p className="font-body text-meta tracking-wide-luxe uppercase text-rose-gold/80">
                        {group.category}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.permissions.map((permission) => {
                          const on = grantedSet.has(permission.name);
                          return (
                            <button
                              key={permission.name}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggle(permission.name)}
                              className={cn(
                                "px-2.5 py-1 rounded-sm border font-body text-meta transition",
                                on
                                  ? "border-success/40 text-success bg-success/10"
                                  : "border-white/10 text-muted-grey hover:text-soft-ivory"
                              )}
                            >
                              {permission.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                {dirty && (
                  <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => setConfirming(true)}
                      disabled={save.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
                    >
                      {save.isPending && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      )}
                      Save permissions
                    </button>
                    <button
                      onClick={() => setDraft(null)}
                      className="px-4 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85"
                    >
                      Discard
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      <ConfirmAction
        open={confirming}
        title={`Replace permissions for ${selectedRole}`}
        description={`This role will grant exactly ${granted.length} permission${
          granted.length === 1 ? "" : "s"
        }. Anything not selected is revoked, for every account holding this role, immediately.`}
        confirmLabel="Replace permissions"
        onConfirm={apply}
        onCancel={() => {
          setConfirming(false);
          setActionError("");
        }}
        busy={save.isPending}
        error={actionError}
      />
    </div>
  );
}
