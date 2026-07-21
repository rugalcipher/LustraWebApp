import React from "react";
import { Loader2, Eye, EyeOff, History } from "lucide-react";
import { useAppointmentVisibilityHistory } from "@/features/appointments/hooks";
import { useManagementStaff } from "@/features/admin/hooks";

/**
 * Who changed an appointment's client visibility, when and why.
 *
 * The backend records `changedByUserId` and nothing else — deliberately. A
 * display name captured at the time goes stale when someone is renamed, and one
 * resolved at read time is a second query the audit trail should not depend on
 * to be correct. So the id is the record, and a name is a courtesy.
 *
 * That courtesy is resolved from the staff directory the console has already
 * loaded, and only when the reader holds the permission to read it. **A failed
 * or forbidden lookup must not break this panel**: an unresolved actor falls
 * back to a shortened id, which is still enough to trace in the audit log.
 *
 * `internalReason` is staff-to-staff and is never shown to the client.
 */
export default function VisibilityHistory({ appointmentId }) {
  const history = useAppointmentVisibilityHistory(appointmentId);
  const staff = useManagementStaff();

  const nameFor = (userId) => {
    const match = staff.data?.items?.find((u) => u.id === userId);
    // Not "Unknown user": the change is known, the name simply is not.
    return match?.displayName ?? `User ${String(userId).slice(0, 8)}`;
  };

  if (history.isPending) {
    return (
      <p className="flex items-center gap-2 font-body text-meta text-muted-grey">
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading history…
      </p>
    );
  }

  if (history.isError) {
    return (
      <p className="font-body text-meta text-muted-grey">
        The visibility history could not be loaded.
      </p>
    );
  }

  const entries = history.data ?? [];
  if (entries.length === 0) {
    return (
      <p className="font-body text-meta text-muted-grey">
        Client visibility has not been changed since this appointment was recorded.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-sm border border-white/10 p-3 space-y-1">
          <p className="flex items-center gap-2 font-body text-helper text-soft-ivory/90">
            {entry.newValue ? (
              <Eye className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
            )}
            {entry.previousValue ? "Visible" : "Hidden"} → {entry.newValue ? "Visible" : "Hidden"}
          </p>
          <p className="flex items-center gap-1.5 font-body text-meta text-muted-grey">
            <History className="w-3 h-3 shrink-0" aria-hidden="true" />
            {nameFor(entry.changedByUserId)} · {new Date(entry.createdAtUtc).toLocaleString()}
          </p>
          {entry.internalReason && (
            <p className="font-body text-helper text-soft-ivory/75 whitespace-pre-line">
              {entry.internalReason}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
