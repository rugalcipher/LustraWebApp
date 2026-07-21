import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, Loader2, AlertTriangle, RotateCw, UserPlus, Users, Star, Eye, EyeOff, MailWarning,
} from "lucide-react";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { useTalentRoster, useTalentAdminPermissions } from "@/features/talentAdmin/hooks";

/**
 * The talent roster, as staff see it.
 *
 * Every row is a real profile from `GET /management/talents`, including
 * unpublished, archived and account-less ones — that is the point of a staff
 * roster. Nothing here is a fixture, and the counts come from the server's own
 * `totalCount`, never from the length of the page in hand.
 *
 * `approvedPublicMediaCount` is shown because it is the gate on publication: a
 * profile with none cannot be published, and the server refuses rather than
 * silently downgrading the request.
 */

const PAGE_SIZE = 25;

const PROFILE_STATUS = ["", "Draft", "PendingReview", "Approved", "Rejected", "Archived", "Suspended"];
const ACCOUNT_STATUS = ["", "PendingActivation", "Active", "Suspended", "Locked"];

const TRISTATE = [
  { value: "", label: "Any" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const inputCls =
  "bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2.5 font-body text-sm " +
  "text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition";

const tri = (value) => (value === "" ? null : value === "true");

function Pill({ tone, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-body text-meta tracking-wide-luxe uppercase whitespace-nowrap",
        tone
      )}
    >
      {children}
    </span>
  );
}

export default function TalentRoster() {
  const { canCreate } = useTalentAdminPermissions();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [isPublic, setIsPublic] = useState("");
  const [isFeatured, setIsFeatured] = useState("");
  const [hasActiveLogin, setHasActiveLogin] = useState("");
  const [hasPendingInvitation, setHasPendingInvitation] = useState("");
  const [pendingProfileReview, setPendingProfileReview] = useState("");
  const [page, setPage] = useState(1);

  const filters = {
    query: query || null,
    status: status || null,
    accountStatus: accountStatus || null,
    isPublic: tri(isPublic),
    isFeatured: tri(isFeatured),
    hasActiveLogin: tri(hasActiveLogin),
    hasPendingInvitation: tri(hasPendingInvitation),
    pendingProfileReview: tri(pendingProfileReview),
    page,
    pageSize: PAGE_SIZE,
  };

  const roster = useTalentRoster(filters);
  const rows = roster.data?.items ?? [];
  const total = roster.data?.totalCount ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const change = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const Select = ({ label, value, onChange, options, render }) => (
    <label className="flex flex-col gap-1">
      <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">{label}</span>
      <select value={value} onChange={onChange} aria-label={label} className={inputCls}>
        {options.map((option) =>
          typeof option === "string" ? (
            <option key={option || "any"} value={option}>
              {option ? render?.(option) ?? option : "Any"}
            </option>
          ) : (
            <option key={option.value || "any"} value={option.value}>
              {option.label}
            </option>
          )
        )}
      </select>
    </label>
  );

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">People</p>
          <h1 className="font-heading font-light text-3xl text-ivory mt-1">Talent</h1>
          <p className="font-body text-helper text-muted-grey mt-1">
            {roster.isPending ? "Loading…" : `${total} ${total === 1 ? "profile" : "profiles"}`}
          </p>
        </div>
        {canCreate && (
          <Link
            to="/admin/talent/new"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" /> Add talent
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-grey"
            strokeWidth={1.2}
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={change(setQuery)}
            placeholder="Name, slug, legal name or email…"
            aria-label="Search talent"
            className={cn(inputCls, "pl-9 w-full")}
          />
        </div>

        <Select
          label="Profile status"
          value={status}
          onChange={change(setStatus)}
          options={PROFILE_STATUS}
        />
        <Select
          label="Account status"
          value={accountStatus}
          onChange={change(setAccountStatus)}
          options={ACCOUNT_STATUS}
        />
        <Select label="Published" value={isPublic} onChange={change(setIsPublic)} options={TRISTATE} />
        <Select label="Featured" value={isFeatured} onChange={change(setIsFeatured)} options={TRISTATE} />
        <Select
          label="Active login"
          value={hasActiveLogin}
          onChange={change(setHasActiveLogin)}
          options={TRISTATE}
        />
        <Select
          label="Pending invitation"
          value={hasPendingInvitation}
          onChange={change(setHasPendingInvitation)}
          options={TRISTATE}
        />
        <Select
          label="Pending review"
          value={pendingProfileReview}
          onChange={change(setPendingProfileReview)}
          options={TRISTATE}
        />
      </div>

      {roster.isPending && (
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
          <span className="font-body text-helper text-muted-grey">Loading roster…</span>
        </Card>
      )}

      {roster.isError && (
        <Card className="p-6 space-y-3" role="alert">
          <p className="flex items-center gap-2 font-body text-body text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {toUserMessage(roster.error)}
          </p>
          <button
            onClick={() => roster.refetch()}
            className="inline-flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
          </button>
        </Card>
      )}

      {roster.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Users}
          title="No talent matches"
          body="Nothing on the roster for these filters."
        />
      )}

      {roster.isSuccess && rows.length > 0 && (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Talent</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Publication</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Photographs</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((talent) => (
                <TableRow key={talent.talentProfileId} className="hover:bg-white/[0.03]">
                  <TableCell>
                    <Link
                      to={`/admin/talent/${talent.talentProfileId}`}
                      className="font-body text-helper text-rose-gold hover:underline"
                    >
                      {talent.displayName}
                    </Link>
                    <span className="block font-body text-meta text-muted-grey truncate">
                      {talent.email ?? talent.slug}
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80">
                    {talent.cityName || "—"}
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80">
                    {talent.profileStatus}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Pill
                        tone={
                          talent.isPublic
                            ? "border-success/40 text-success bg-success/10"
                            : "border-white/15 text-muted-grey bg-white/[0.03]"
                        }
                      >
                        {talent.isPublic ? (
                          <>
                            <Eye className="w-3 h-3" aria-hidden="true" /> Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" aria-hidden="true" /> Not published
                          </>
                        )}
                      </Pill>
                      {talent.isFeatured && (
                        <Pill tone="border-rose-gold/40 text-rose-gold bg-rose-gold/10">
                          <Star className="w-3 h-3" fill="currentColor" aria-hidden="true" /> Featured
                        </Pill>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Pill
                        tone={
                          talent.hasActiveLogin
                            ? "border-success/40 text-success bg-success/10"
                            : "border-warning/40 text-warning bg-warning/10"
                        }
                      >
                        {talent.accountStatus}
                      </Pill>
                      {talent.hasPendingInvitation && (
                        <Pill tone="border-rose-gold/40 text-rose-gold bg-rose-gold/10">
                          <MailWarning className="w-3 h-3" aria-hidden="true" /> Invited
                        </Pill>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-body text-helper tabular-nums">
                    {/* The gate on publication: none means the server will refuse. */}
                    <span
                      className={
                        talent.approvedPublicMediaCount === 0 ? "text-warning" : "text-soft-ivory/80"
                      }
                    >
                      {talent.approvedPublicMediaCount} approved
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80">
                    {new Date(talent.createdAtUtc).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {roster.isSuccess && pages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="font-body text-meta text-muted-grey">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-sm border border-white/10 font-body text-meta tracking-luxe uppercase text-soft-ivory/80 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-3 py-1.5 rounded-sm border border-white/10 font-body text-meta tracking-luxe uppercase text-soft-ivory/80 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
