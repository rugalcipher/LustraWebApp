import React, { useState, useMemo } from "react";
import { Search, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { Card, Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const USERS = [
  { id: "u1", name: "A. Laurent", email: "a.laurent@lustra.app", role: "client", status: "active", joined: "Jan 2026", bookings: 7 },
  { id: "u2", name: "Isabelle Moreau", email: "isabelle@lustra.app", role: "talent", status: "active", joined: "Dec 2025", bookings: 0 },
  { id: "u3", name: "V. Castellan", email: "concierge@lustra.app", role: "management", status: "active", joined: "Nov 2025", bookings: 0 },
  { id: "u4", name: "Director", email: "admin@lustra.app", role: "admin", status: "active", joined: "Nov 2025", bookings: 0 },
  { id: "u5", name: "M. DuPont", email: "m.dupont@lustra.app", role: "client", status: "active", joined: "Feb 2026", bookings: 3 },
  { id: "u6", name: "Camille Roux", email: "camille@lustra.app", role: "talent", status: "pending", joined: "Jul 2026", bookings: 0 },
  { id: "u7", name: "R. Halberd", email: "r.halberd@lustra.app", role: "client", status: "active", joined: "Dec 2025", bookings: 12 },
  { id: "u8", name: "S. Kowalski", email: "s.kowalski@lustra.app", role: "client", status: "suspended", joined: "Jul 2026", bookings: 2 },
  { id: "u9", name: "System Owner", email: "owner@lustra.app", role: "superadmin", status: "active", joined: "Nov 2025", bookings: 0 },
];

const ROLE_FILTERS = ["all", "client", "talent", "management", "admin", "superadmin"];

const ROLE_BADGE = {
  client: "text-soft-ivory border-white/20",
  talent: "text-rose-gold border-rose-gold/30",
  management: "text-warning border-warning/30",
  admin: "text-error border-error/30",
  superadmin: "text-error border-error/50 bg-error/5",
};

const STATUS_BADGE = {
  active: "text-success border-success/30",
  pending: "text-warning border-warning/30",
  suspended: "text-error border-error/30",
};

export default function AdminUsers() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = useMemo(
    () =>
      USERS.filter(
        (u) =>
          (roleFilter === "all" || u.role === roleFilter) &&
          (u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase()))
      ),
    [query, roleFilter]
  );

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <Eyebrow>Administrator</Eyebrow>
          <h1 className="font-heading font-light text-3xl text-ivory mt-1">Users</h1>
          <p className="font-body text-sm text-muted-grey mt-2">
            All registered members, talent, staff, and administrators.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full sm:w-auto sm:min-w-[22rem]">
          <Card className="p-3 text-center">
            <UserCheck className="w-4 h-4 text-success mx-auto" strokeWidth={1.2} />
            <p className="font-heading text-xl text-ivory mt-1">{USERS.filter((u) => u.status === "active").length}</p>
            <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">Active</p>
          </Card>
          <Card className="p-3 text-center">
            <ShieldCheck className="w-4 h-4 text-warning mx-auto" strokeWidth={1.2} />
            <p className="font-heading text-xl text-ivory mt-1">{USERS.filter((u) => u.status === "pending").length}</p>
            <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">Pending</p>
          </Card>
          <Card className="p-3 text-center">
            <UserX className="w-4 h-4 text-error mx-auto" strokeWidth={1.2} />
            <p className="font-heading text-xl text-ivory mt-1">{USERS.filter((u) => u.status === "suspended").length}</p>
            <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">Suspended</p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-grey" strokeWidth={1.2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-deep-black/60 border border-white/[0.08] rounded-sm pl-9 pr-3 py-2.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto lustra-scroll-hide">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full border text-[0.6rem] tracking-wide-luxe uppercase font-body transition",
                roleFilter === r ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10" : "border-white/10 text-muted-grey hover:text-soft-ivory"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No users found" body="Adjust your search or filter." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">Member</TableHead>
                <TableHead className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">Role</TableHead>
                <TableHead className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">Status</TableHead>
                <TableHead className="text-[0.55rem] tracking-luxe uppercase text-muted-grey hidden sm:table-cell">Joined</TableHead>
                <TableHead className="text-[0.55rem] tracking-luxe uppercase text-muted-grey text-right">Bookings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell>
                    <p className="font-body text-sm text-ivory">{u.name}</p>
                    <p className="font-body text-[0.6rem] text-muted-grey">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full", ROLE_BADGE[u.role])}>
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full", STATUS_BADGE[u.status])}>
                      {u.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-xs text-soft-ivory/70 hidden sm:table-cell">{u.joined}</TableCell>
                  <TableCell className="font-heading text-base text-light-rose-gold text-right">{u.bookings}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}