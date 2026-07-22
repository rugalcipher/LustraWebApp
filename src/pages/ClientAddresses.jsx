import React, { useState } from "react";
import { MapPin, Plus, Star, Pencil, Trash2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/lustra/Primitives";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import AddressAutocomplete from "@/components/address/AddressAutocomplete";
import {
  EMPTY_ADDRESS_INPUT, toAddressInput, validateAddress, formatAddressLine,
} from "@/domain/address";
import {
  useClientAddresses, useCreateClientAddress, useUpdateClientAddress,
  useDeleteClientAddress, useSetDefaultClientAddress,
} from "@/features/clientAddresses/hooks";

/**
 * The client's saved addresses. Google Places selection fills the structured fields and marks
 * an address verified; manual entry still works when the search finds nothing or is unavailable.
 * Exact coordinates stay private to the client.
 */
export default function ClientAddresses() {
  const { data: addresses, isPending, isError, error } = useClientAddresses();
  const create = useCreateClientAddress();
  const update = useUpdateClientAddress();
  const remove = useDeleteClientAddress();
  const setDefault = useSetDefaultClientAddress();

  const [editing, setEditing] = useState(null); // null | "new" | address id
  const [label, setLabel] = useState("Home");
  const [isDefault, setIsDefault] = useState(false);
  const [form, setForm] = useState(EMPTY_ADDRESS_INPUT);
  const [errors, setErrors] = useState({});

  const startNew = () => {
    setEditing("new");
    setLabel("Home");
    setIsDefault((addresses?.length ?? 0) === 0);
    setForm(EMPTY_ADDRESS_INPUT);
    setErrors({});
  };

  const startEdit = (a) => {
    setEditing(a.id);
    setLabel(a.label);
    setIsDefault(a.isDefault);
    setForm({ ...a.address });
    setErrors({});
  };

  const cancel = () => {
    setEditing(null);
    setErrors({});
  };

  const save = async () => {
    const addressErrors = validateAddress(form, { required: true });
    const next = { ...addressErrors };
    if (!label.trim()) next.label = "A label is required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const input = { label: label.trim(), isDefault, address: toAddressInput(form) };
    try {
      if (editing === "new") await create.mutateAsync(input);
      else await update.mutateAsync({ id: editing, input });
      setEditing(null);
    } catch (err) {
      toast({ title: "Couldn't save the address", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <div className="px-5 pt-6 pb-10 max-w-2xl mx-auto">
      <Eyebrow>Your account</Eyebrow>
      <div className="flex items-center justify-between gap-3 mt-1">
        <h1 className="font-heading font-light text-3xl text-ivory">Saved addresses</h1>
        {editing === null && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-4 py-2 rounded-sm hover:bg-rose-gold/5 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add address
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="mt-5 rounded-lg border border-white/[0.08] bg-card-black/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-heading text-lg text-ivory">
              {editing === "new" ? "Add an address" : "Edit address"}
            </p>
            <button onClick={cancel} aria-label="Cancel" className="text-muted-grey hover:text-ivory">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="addr-label" className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
              Label
            </label>
            <input
              id="addr-label"
              className="w-full bg-deep-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body text-ivory focus:outline-none focus:border-rose-gold/50"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Home, Work, Other"
            />
            {errors.label && <p className="font-body text-meta text-error" role="alert">{errors.label}</p>}
          </div>

          <AddressAutocomplete value={form} onChange={setForm} errors={errors} label="Address" />

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-rose-gold" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            <span className="font-body text-body text-soft-ivory/80">Make this my default address</span>
          </label>

          <div className="flex gap-3 pt-1">
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-rose-gold/15 border border-rose-gold/50 text-[0.65rem] tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/25 disabled:opacity-50"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save address
            </button>
            <button onClick={cancel} className="px-5 py-2.5 rounded-sm border border-white/15 text-[0.65rem] tracking-luxe uppercase text-soft-ivory/80 hover:text-ivory">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isPending ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : isError ? (
        <p className="py-16 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      ) : addresses.length === 0 && editing === null ? (
        <div className="py-16 text-center">
          <MapPin className="w-8 h-8 text-muted-grey/50 mx-auto" strokeWidth={1.2} />
          <p className="font-heading text-lg text-ivory mt-4">No saved addresses yet</p>
          <p className="font-body text-sm text-muted-grey mt-2">Add an address to reuse it for your appointments.</p>
        </div>
      ) : (
        <div className="space-y-2.5 mt-5">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-start gap-3 p-3.5 bg-card-black/70 border border-white/[0.06] rounded-lg">
              <MapPin className="w-4 h-4 text-rose-gold shrink-0 mt-1" strokeWidth={1.4} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-base text-ivory">{a.label}</p>
                  {a.isDefault && (
                    <span className="inline-flex items-center gap-1 text-[0.5rem] tracking-luxe uppercase text-rose-gold">
                      <Star className="w-3 h-3" strokeWidth={1.6} /> Default
                    </span>
                  )}
                </div>
                <p className="font-body text-[0.72rem] text-soft-ivory/75 mt-0.5 break-words">
                  {formatAddressLine(a.address) || "—"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!a.isDefault && (
                  <button
                    onClick={() => setDefault.mutate(a.id)}
                    title="Set as default"
                    aria-label="Set as default"
                    className="p-2 text-muted-grey hover:text-rose-gold"
                  >
                    <Star className="w-3.5 h-3.5" strokeWidth={1.4} />
                  </button>
                )}
                <button onClick={() => startEdit(a)} title="Edit" aria-label="Edit" className="p-2 text-muted-grey hover:text-ivory">
                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.4} />
                </button>
                <button
                  onClick={() => remove.mutate(a.id)}
                  title="Delete"
                  aria-label="Delete"
                  className={cn("p-2 text-muted-grey hover:text-error", remove.isPending && "opacity-50")}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.4} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
