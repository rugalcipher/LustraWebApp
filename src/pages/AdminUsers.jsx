import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShieldCheck, UserCheck, UserX, UserPlus, Loader2 } from "lucide-react";
import { Card, Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { useAdminUsers, useSuspendUser, useReactivateUser } from "@/features/admin/hooks";

/**
 * Admin → Users. Real accounts from `/admin/users`.
 *
 * This page previously rendered nine hard-coded people — including invented
 * `admin@lustra.app` and `owner@lustra.app` accounts. Fabricated administrators on an
 * admin screen are worse than an empty list: they suggest the platform has staff and
 * oversight it does not, and nobody can tell the fake rows from the real ones.
 *
 * Search, role and status filtering all run server-side.
 */

const ROLE_FILTERS = ["All", "Client", "Talent", "Management", "Admin", "SuperAdmin"];

const ROLE_BADGE = {
  Client: "text-soft-ivory border-white/20",
  Talent: "text-rose-gold border-rose-gold/30",
  Management: "text-warning border-warning/30",
  Admin: "text-error border-error/30",
  SuperAdmin: "text-error border-error/50 bg-error/5",
};

const STATUS_BADGE = {
  Active: "text-success border-success/30",
  Suspended: "text-error border-error/30",
  Locked: "text-error border-error/30",
  PendingVerification: "text-warning border-warning/30",
};

export default function AdminUsers() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const users = useAdminUsers({
    search: query || null,
    role: roleFilter === "All" ? null : roleFilter,
  });
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();

  const rows = users.data?.items ?? [];
  const activeCount = rows.filter((u) => u.accountStatus === "Active").length;
  const suspendedCount = rows.filter((u) => u.accountStatus === "Suspended").length;
  const staffCount = rows.filter((u) =>
    u.roles.some((r) => ["Management", "Admin", "SuperAdmin"].includes(r))
  ).length;

  const act = async (user) => {
    try {
      if (user.accountStatus === "Suspended") {
        await reactivate.mutateAsync(user.id);
        toast({ title: "Account reactivated" });
      } else {
        const reason = window.prompt("Reason for suspending this account:");
        if (!reason?.trim()) return;
        await suspend.mutateAsync({ userId: user.id, reason: reason.trim() });
        toast({ title: "Account suspended" });
      }
    } catch (err) {
      toast({ title: "Couldn't update", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const busy = suspend.isPending || reactivate.isPending;

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <Eyebrow>Administrator</Eyebrow>
          <h1 className="font-heading font-light text-3xl text-ivory mt-1">Users</h1>
          <p className="font-body text-sm text-muted-grey mt-2">
            All registered members, talent, staff and administrators.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full sm:w-auto sm:min-w-[22rem]">
          <Tile icon={UserCheck} tone="text-success" value={activeCount} label="Active" />
          <Tile icon={UserX} tone="text-error" value={suspendedCount} label="Suspended" />
          <Tile icon={ShieldCheck} tone="text-rose-gold" value={staffCount} label="Staff" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link
          to="/admin/users/new"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
        >
          <UserPlus className="w-3.5 h-3.5" aria-hidden="true" /> Add staff
        </Link>
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-grey"
            strokeWidth={1.2}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search users"
            className="w-full bg-deep-black/60 border border-white/[0.08] rounded-sm pl-9 pr-3 py-2.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-[0.6rem] tracking-wide-luxe uppercase font-body transition",
                roleFilter === role
                  ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                  : "border-white/10 text-muted-grey hover:text-soft-ivory"
              )}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {users.isPending ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : users.isError ? (
        <Card className="p-6">
          <p className="font-body text-sm text-muted-grey">{toUserMessage(users.error)}</p>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState title="No users found" body="Try a different search or role filter." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                {["User", "Roles", "Status", "Last login", ""].map((h) => (
                  <TableHead
                    key={h}
                    className="text-[0.55rem] tracking-luxe uppercase text-muted-grey"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                <TableRow key={user.id} className="border-white/[0.04]">
                  <TableCell>
                    <Link
                      to={`/admin/users/${user.id}`}
                      className="font-body text-sm text-rose-gold hover:underline"
                    >
                      {user.displayName}
                    </Link>
                    <p className="font-body text-[0.6rem] text-muted-grey">{user.email}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={cn(
                            "inline-flex text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full",
                            ROLE_BADGE[role] ?? "text-muted-grey border-white/15"
                          )}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full",
                        STATUS_BADGE[user.accountStatus] ?? "text-muted-grey border-white/15"
                      )}
                    >
                      {user.accountStatus}
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-[0.65rem] text-muted-grey">
                    {user.lastLoginAtUtc
                      ? new Date(user.lastLoginAtUtc).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => act(user)}
                      disabled={busy}
                      className="text-[0.55rem] tracking-luxe uppercase text-muted-grey hover:text-ivory border border-white/15 hover:border-white/30 rounded-sm px-2.5 py-1.5 transition disabled:opacity-40"
                    >
                      {user.accountStatus === "Suspended" ? "Reactivate" : "Suspend"}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function Tile({ icon: Icon, tone, value, label }) {
  return (
    <Card className="p-3 text-center">
      <Icon className={cn("w-4 h-4 mx-auto", tone)} strokeWidth={1.2} />
      <p className="font-heading text-xl text-ivory mt-1">{value}</p>
      <p className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey">{label}</p>
    </Card>
  );
}
