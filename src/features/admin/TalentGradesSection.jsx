import React, { useState } from "react";
import { Loader2, Plus, Archive, RotateCcw, Check, X, Pencil } from "lucide-react";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { formatMinor } from "@/services/talentGradeService";
import {
  useTalentGrades, useCreateGrade, useUpdateGrade, useArchiveGrade, useRestoreGrade, useCanManageGrades,
} from "@/features/admin/gradeHooks";

/**
 * Admin "Talent grades" configuration. Money is entered and shown in rand but stored in minor
 * units. Grades are archived, never deleted, so historical bookings always resolve.
 */
const inputCls =
  "w-full bg-deep-black/60 border border-white/10 rounded-sm px-2.5 py-2 font-body text-base text-ivory focus:outline-none focus:border-rose-gold/50";

function GradeForm({ initial, onSubmit, onCancel, busy, currency = "ZAR" }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [rank, setRank] = useState(initial?.rank ?? 1);
  const [clientRand, setClientRand] = useState(initial ? initial.clientHourlyRateMinor / 100 : "");
  const [share, setShare] = useState(initial?.defaultTalentSharePercent ?? 50);

  const payoutMinor = Number(clientRand) > 0 ? Math.round(Number(clientRand) * 100 * Number(share) / 100) : 0;

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      rank: Number(rank),
      currencyCode: currency,
      clientHourlyRateMinor: Math.round(Number(clientRand) * 100),
      defaultTalentSharePercent: Number(share),
    });
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
      <label className="col-span-2 sm:col-span-1">
        <span className="block text-[0.5rem] tracking-luxe uppercase text-muted-grey mb-1">Name</span>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        <span className="block text-[0.5rem] tracking-luxe uppercase text-muted-grey mb-1">Rank</span>
        <input className={inputCls} type="number" min={1} value={rank} onChange={(e) => setRank(e.target.value)} />
      </label>
      <label>
        <span className="block text-[0.5rem] tracking-luxe uppercase text-muted-grey mb-1">Client /hr</span>
        <input className={inputCls} type="number" min={0} step="1" value={clientRand} onChange={(e) => setClientRand(e.target.value)} required />
      </label>
      <label>
        <span className="block text-[0.5rem] tracking-luxe uppercase text-muted-grey mb-1">Share %</span>
        <input className={inputCls} type="number" min={0} max={100} value={share} onChange={(e) => setShare(e.target.value)} />
      </label>
      <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
        <span className="text-[0.55rem] text-muted-grey">Payout {formatMinor(payoutMinor, currency)}</span>
        <button type="submit" disabled={busy} className="ml-auto p-2 rounded-sm border border-rose-gold/50 text-rose-gold hover:bg-rose-gold/10 disabled:opacity-50" aria-label="Save grade">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="p-2 rounded-sm border border-white/15 text-muted-grey" aria-label="Cancel">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}

export default function TalentGradesSection() {
  const { data: grades = [], isPending } = useTalentGrades(true);
  const canManage = useCanManageGrades();
  const create = useCreateGrade();
  const update = useUpdateGrade();
  const archive = useArchiveGrade();
  const restore = useRestoreGrade();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const run = async (promise, ok) => {
    try { await promise; toast({ title: ok }); return true; }
    catch (e) { toast({ title: "Couldn't save", description: toUserMessage(e), variant: "destructive" }); return false; }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Eyebrow>Talent grades</Eyebrow>
        {canManage && !adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-rose-gold hover:underline">
            <Plus className="w-3.5 h-3.5" /> Add grade
          </button>
        )}
      </div>
      <p className="font-body text-sm text-muted-grey">
        Client hourly rate and the default talent share per tier. The doubling defaults are the
        launch configuration — edit freely. Archived grades stay on historical records.
      </p>

      {adding && (
        <div className="rounded-md border border-white/10 p-3">
          <GradeForm
            busy={create.isPending}
            onCancel={() => setAdding(false)}
            onSubmit={async (input) => { if (await run(create.mutateAsync(input), "Grade created")) setAdding(false); }}
          />
        </div>
      )}

      {isPending ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-rose-gold" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[0.5rem] tracking-luxe uppercase text-muted-grey border-b border-white/[0.06]">
                <th className="py-2 pr-3">Grade</th>
                <th className="py-2 pr-3">Client /hr</th>
                <th className="py-2 pr-3">Share</th>
                <th className="py-2 pr-3">Default payout</th>
                <th className="py-2 pr-3">Assigned</th>
                <th className="py-2 pr-3">State</th>
                {canManage && <th className="py-2" />}
              </tr>
            </thead>
            <tbody className="font-body text-sm text-soft-ivory/85">
              {grades.map((g) => (
                editingId === g.id ? (
                  <tr key={g.id}><td colSpan={canManage ? 7 : 6} className="py-2">
                    <GradeForm
                      initial={g} currency={g.currencyCode} busy={update.isPending}
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (input) => {
                        if (await run(update.mutateAsync({ id: g.id, input }), "Grade updated")) setEditingId(null);
                      }}
                    />
                  </td></tr>
                ) : (
                  <tr key={g.id} className={g.isActive ? "" : "opacity-50"}>
                    <td className="py-2 pr-3">{g.name} <span className="text-muted-grey text-[0.6rem]">#{g.rank}</span></td>
                    <td className="py-2 pr-3 tabular-nums">{formatMinor(g.clientHourlyRateMinor, g.currencyCode)}</td>
                    <td className="py-2 pr-3 tabular-nums">{g.defaultTalentSharePercent}%</td>
                    <td className="py-2 pr-3 tabular-nums text-light-rose-gold">{formatMinor(g.defaultTalentPayoutMinor, g.currencyCode)}</td>
                    <td className="py-2 pr-3 tabular-nums">{g.assignedTalentCount}</td>
                    <td className="py-2 pr-3">
                      <span className={g.isActive ? "text-success text-[0.6rem] uppercase tracking-luxe" : "text-muted-grey text-[0.6rem] uppercase tracking-luxe"}>
                        {g.isActive ? "Active" : "Archived"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-2 text-right whitespace-nowrap">
                        <button onClick={() => setEditingId(g.id)} className="p-1.5 text-muted-grey hover:text-rose-gold" aria-label={`Edit ${g.name}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {g.isActive ? (
                          <button onClick={() => run(archive.mutateAsync(g.id), "Grade archived")} className="p-1.5 text-muted-grey hover:text-warning" aria-label={`Archive ${g.name}`}>
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => run(restore.mutateAsync(g.id), "Grade restored")} className="p-1.5 text-muted-grey hover:text-success" aria-label={`Restore ${g.name}`}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
