import React, { useState } from "react";
import { Loader2, Check, AlertTriangle, RotateCcw } from "lucide-react";
import { Card } from "@/components/lustra/Primitives";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { formatMinor } from "@/services/talentGradeService";
import { useTalentGrades } from "@/features/admin/gradeHooks";
import {
  useCommercialTerms, useCanManageCommercialTerms, useSetCommercialTerms,
} from "@/features/talentAdmin/commercialHooks";

const inputCls = "w-full bg-deep-black/60 border border-white/10 rounded-sm px-2.5 py-2 font-body text-base text-ivory focus:outline-none focus:border-rose-gold/50";

function Row({ label, value, strong }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">{label}</span>
      <span className={strong ? "font-heading text-light-rose-gold" : "font-body text-helper text-soft-ivory/85"}>{value}</span>
    </div>
  );
}

/**
 * The staff-only Commercial terms section on the Management talent record. Shows the client rate,
 * talent payout and gross margin, and lets a manager set grade-linked or custom pricing. Never
 * shown to the talent or the client.
 */
export default function CommercialTermsPanel({ profileId }) {
  const { data: terms, isPending } = useCommercialTerms(profileId);
  const canManage = useCanManageCommercialTerms();
  const { data: grades = [] } = useTalentGrades(false);
  const { set, resetPayout } = useSetCommercialTerms(profileId);
  const [editing, setEditing] = useState(false);

  if (isPending) {
    return <Card className="p-5 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-rose-gold" /></Card>;
  }

  const t = terms;
  const currency = t?.currency ?? "ZAR";

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-ivory">Commercial terms</h2>
        {canManage && !editing && (
          <button onClick={() => setEditing(true)} className="text-[0.6rem] tracking-luxe uppercase text-rose-gold hover:underline">
            {t?.isConfigured ? "Edit" : "Configure"}
          </button>
        )}
      </div>

      {!t?.isConfigured && !editing && (
        <div className="rounded-md border border-warning/40 bg-warning/[0.06] p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span className="font-body text-helper text-soft-ivory/85">Pricing required — this talent has no commercial terms yet.</span>
        </div>
      )}

      {t?.isConfigured && !editing && (
        <div className="space-y-1">
          <Row label="Pricing mode" value={t.pricingMode === "GradeLinked" ? `Grade-linked${t.gradeName ? ` — ${t.gradeName}` : ""}` : "Custom"} />
          <Row label="Client / hour" value={formatMinor(t.clientHourlyRateMinor, currency)} />
          <Row label="Talent payout / hour" value={`${formatMinor(t.talentHourlyPayoutMinor, currency)}${t.payoutIsGradeDefault ? " (grade default)" : " (override)"}`} />
          <Row label="Gross margin / hour" value={formatMinor(t.grossMarginMinor, currency)} strong />
          <Row label="Currency" value={currency} />
          {t.updatedAtUtc && <Row label="Last updated" value={new Date(t.updatedAtUtc).toLocaleDateString()} />}
          {canManage && t.pricingMode === "GradeLinked" && !t.payoutIsGradeDefault && (
            <button
              onClick={async () => {
                try { await resetPayout.mutateAsync(); toast({ title: "Payout reset to grade default" }); }
                catch (e) { toast({ title: "Couldn't reset", description: toUserMessage(e), variant: "destructive" }); }
              }}
              className="mt-2 inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-rose-gold hover:underline"
            >
              <RotateCcw className="w-3 h-3" /> Reset payout to grade default
            </button>
          )}
        </div>
      )}

      {editing && canManage && (
        <CommercialForm
          terms={t}
          grades={grades}
          busy={set.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={async (input) => {
            try { await set.mutateAsync(input); toast({ title: "Commercial terms saved" }); setEditing(false); }
            catch (e) { toast({ title: "Couldn't save", description: toUserMessage(e), variant: "destructive" }); }
          }}
        />
      )}

      <p className="font-body text-[0.6rem] text-muted-grey">
        Staff-only. The talent never sees the client rate or margin; the client never sees the payout.
      </p>
    </Card>
  );
}

function CommercialForm({ terms, grades, busy, onSubmit, onCancel }) {
  const [mode, setMode] = useState(terms?.pricingMode === "Custom" ? "Custom" : "GradeLinked");
  const [gradeId, setGradeId] = useState(terms?.gradeId ?? grades[0]?.id ?? "");
  const [useDefault, setUseDefault] = useState(terms?.payoutIsGradeDefault ?? true);
  const [payoutRand, setPayoutRand] = useState(terms?.talentHourlyPayoutMinor ? terms.talentHourlyPayoutMinor / 100 : "");
  const [clientRand, setClientRand] = useState(terms?.clientHourlyRateMinor && terms.pricingMode === "Custom" ? terms.clientHourlyRateMinor / 100 : "");

  const grade = grades.find((g) => g.id === gradeId);
  const gradeDefaultPayout = grade ? Math.round(grade.clientHourlyRateMinor * grade.defaultTalentSharePercent / 100) : 0;

  const submit = (e) => {
    e.preventDefault();
    if (mode === "GradeLinked") {
      onSubmit({
        pricingMode: "GradeLinked",
        gradeId,
        usePayoutGradeDefault: useDefault,
        talentHourlyPayoutMinor: useDefault ? null : Math.round(Number(payoutRand) * 100),
      });
    } else {
      onSubmit({
        pricingMode: "Custom",
        usePayoutGradeDefault: false,
        customClientHourlyRateMinor: Math.round(Number(clientRand) * 100),
        talentHourlyPayoutMinor: Math.round(Number(payoutRand) * 100),
        currencyCode: "ZAR",
      });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-white/10 p-3">
      <div className="flex gap-2">
        {["GradeLinked", "Custom"].map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-full border text-[0.6rem] tracking-luxe uppercase ${mode === m ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10" : "border-white/10 text-muted-grey"}`}>
            {m === "GradeLinked" ? "Grade-linked" : "Custom"}
          </button>
        ))}
      </div>

      {mode === "GradeLinked" ? (
        <>
          <label className="block">
            <span className="block text-[0.5rem] tracking-luxe uppercase text-muted-grey mb-1">Grade</span>
            <select className={inputCls} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
              {grades.map((g) => <option key={g.id} value={g.id} className="bg-noir">{g.name} — {formatMinor(g.clientHourlyRateMinor, g.currencyCode)}/hr</option>)}
            </select>
          </label>
          {grade && (
            <p className="font-body text-[0.65rem] text-muted-grey">
              Client {formatMinor(grade.clientHourlyRateMinor, grade.currencyCode)}/hr · default payout {formatMinor(gradeDefaultPayout, grade.currencyCode)}/hr
            </p>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-rose-gold" checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} />
            <span className="font-body text-helper text-soft-ivory/80">Use the grade default payout</span>
          </label>
          {!useDefault && (
            <label className="block">
              <span className="block text-[0.5rem] tracking-luxe uppercase text-muted-grey mb-1">Talent payout / hour</span>
              <input className={inputCls} type="number" min={0} value={payoutRand} onChange={(e) => setPayoutRand(e.target.value)} required />
            </label>
          )}
        </>
      ) : (
        <>
          <label className="block">
            <span className="block text-[0.5rem] tracking-luxe uppercase text-muted-grey mb-1">Client rate / hour</span>
            <input className={inputCls} type="number" min={0} value={clientRand} onChange={(e) => setClientRand(e.target.value)} required />
          </label>
          <label className="block">
            <span className="block text-[0.5rem] tracking-luxe uppercase text-muted-grey mb-1">Talent payout / hour</span>
            <input className={inputCls} type="number" min={0} value={payoutRand} onChange={(e) => setPayoutRand(e.target.value)} required />
          </label>
        </>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm border border-rose-gold/50 text-rose-gold text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save terms
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-sm border border-white/15 text-muted-grey text-[0.6rem] tracking-luxe uppercase">Cancel</button>
      </div>
    </form>
  );
}
