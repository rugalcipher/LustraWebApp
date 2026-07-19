import React, { useState } from "react";
import { Plus, Trash2, Send, Check } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { CLIENTS } from "@/mocks/internal";
import { TALENT, ENGAGEMENT_CATEGORIES } from "@/mocks/talent";

const inputCls =
  "w-full bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition";

export default function ProposalBuilder() {
  const [client, setClient] = useState(CLIENTS[0].name);
  const [talent, setTalent] = useState(TALENT[0].name);
  const [engagement, setEngagement] = useState(ENGAGEMENT_CATEGORIES[0]);
  const [date, setDate] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { label: "Engagement fee", amount: 1800 },
    { label: "Travel & logistics", amount: 450 },
  ]);
  const [sent, setSent] = useState(false);

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const updateItem = (idx, field, val) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  const addItem = () => setItems((p) => [...p, { label: "", amount: 0 }]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  if (sent) {
    return (
      <div className="lustra-marble min-h-screen pb-16">
        <InternalHeader eyebrow="Concierge Console" title="Proposal Builder" />
        <div className="max-w-luxe mx-auto px-5 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full border border-rose-gold/40 flex items-center justify-center mb-5">
            <Check className="w-6 h-6 text-rose-gold" strokeWidth={1.2} />
          </div>
          <p className="font-heading text-2xl text-ivory">Proposal delivered</p>
          <p className="font-body text-sm text-muted-grey mt-2 max-w-xs">
            A bespoke proposal for {client} has been sent. You'll be notified of their response.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-6 inline-flex items-center gap-2 text-[0.7rem] tracking-luxe uppercase text-rose-gold/90 hover:text-light-rose-gold font-body"
          >
            Draft another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Concierge Console"
        title="Proposal Builder"
        subtitle="Compose a bespoke engagement proposal from the inquiry details."
      />
      <div className="w-full px-5 lg:px-8 py-6 space-y-5">
        <Card className="p-4 space-y-3">
          <Eyebrow>Engagement</Eyebrow>
          <div className="grid grid-cols-2 gap-3">
            <select value={client} onChange={(e) => setClient(e.target.value)} className={inputCls}>
              {CLIENTS.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select value={talent} onChange={(e) => setTalent(e.target.value)} className={inputCls}>
              {TALENT.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
            <select value={engagement} onChange={(e) => setEngagement(e.target.value)} className={inputCls}>
              {ENGAGEMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            <input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`${inputCls} col-span-2`}
            />
          </div>
          <textarea
            placeholder="Bespoke notes — venue, attire, special requests…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Card>

        <Card className="p-4">
          <Eyebrow>Line Items</Eyebrow>
          <div className="space-y-2 mt-3">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  placeholder="Description"
                  value={it.label}
                  onChange={(e) => updateItem(idx, "label", e.target.value)}
                  className={`${inputCls} flex-1`}
                />
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-grey text-sm">$</span>
                  <input
                    type="number"
                    value={it.amount}
                    onChange={(e) => updateItem(idx, "amount", e.target.value)}
                    className={`${inputCls} pl-6`}
                  />
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="w-9 h-9 shrink-0 flex items-center justify-center text-muted-grey hover:text-error transition"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.2} />
                </button>
              </div>
            ))}
            <button
              onClick={addItem}
              className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 hover:text-light-rose-gold font-body mt-1"
            >
              <Plus className="w-3 h-3" /> Add item
            </button>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
            <span className="font-body text-[0.6rem] tracking-luxe uppercase text-muted-grey">Total</span>
            <span className="font-heading text-2xl text-light-rose-gold">${total.toLocaleString()}</span>
          </div>
        </Card>

        <button
          onClick={() => setSent(true)}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body uppercase text-[0.7rem] tracking-luxe py-3.5 rounded-sm hover:opacity-90 transition"
        >
          <Send className="w-3.5 h-3.5" /> Send Proposal to {client.split(" ").slice(-1)[0]}
        </button>
      </div>
    </div>
  );
}