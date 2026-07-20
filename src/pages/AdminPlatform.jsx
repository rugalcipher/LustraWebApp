import React, { useState } from "react";
import { Plus, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { TAXONOMY_TYPES } from "@/services/adminService";
import {
  useTaxonomyAdmin,
  useTaxonomyMutations,
  usePlatformSettings,
  useUpdateSetting,
  useFeatureFlags,
  useUpdateFeatureFlag,
} from "@/features/admin/hooks";

/**
 * Admin → Platform. Real taxonomies, settings and feature flags.
 *
 * This page previously held a hard-coded `SEED` object and let an administrator "add" and
 * "delete" taxonomy values that were only ever kept in component state. Nothing persisted,
 * nothing reached the API, and the next page load silently restored the fixture — so the
 * lists that drive talent categories, engagement types and languages across the whole
 * platform appeared editable and were not.
 *
 * Deletes here are SOFT on the server: existing profiles referencing a value keep
 * resolving, and the value simply stops being offered.
 */

const inputCls =
  "w-full bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition";

export default function AdminPlatform() {
  const [activeType, setActiveType] = useState(TAXONOMY_TYPES[0].type);

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 w-full space-y-6">
      <div>
        <Eyebrow>Administrator</Eyebrow>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">Platform</h1>
        <p className="font-body text-sm text-muted-grey mt-2 max-w-2xl">
          The reference data, settings and flags that drive the platform. Changes take
          effect immediately for every user.
        </p>
      </div>

      <Card className="p-4">
        <Eyebrow>Taxonomies</Eyebrow>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {TAXONOMY_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-[0.6rem] tracking-wide-luxe uppercase font-body transition",
                activeType === type
                  ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                  : "border-white/10 text-muted-grey hover:text-soft-ivory"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <TaxonomyEditor type={activeType} />
      </Card>

      <SettingsSection />
      <FeatureFlagsSection />
    </div>
  );
}

function TaxonomyEditor({ type }) {
  const query = useTaxonomyAdmin(type);
  const { create, update, remove } = useTaxonomyMutations(type);
  const [draft, setDraft] = useState("");

  const items = query.data ?? [];
  const busy = create.isPending || update.isPending || remove.isPending;

  const add = async (event) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    try {
      await create.mutateAsync({ name, sortOrder: items.length });
      setDraft("");
      toast({ title: "Added" });
    } catch (err) {
      toast({ title: "Couldn't add", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const act = async (fn, successTitle) => {
    try {
      await fn();
      toast({ title: successTitle });
    } catch (err) {
      toast({ title: "Couldn't update", description: toUserMessage(err), variant: "destructive" });
    }
  };

  if (query.isPending) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (query.isError) {
    return <p className="mt-4 font-body text-sm text-muted-grey">{toUserMessage(query.error)}</p>;
  }

  return (
    <div className="mt-4">
      <form onSubmit={add} className="flex gap-2 max-w-md">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New value…"
          aria-label="New taxonomy value"
          className={inputCls}
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-rose-gold/40 text-rose-gold text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition disabled:opacity-40"
        >
          <Plus className="w-3 h-3" strokeWidth={1.4} /> Add
        </button>
      </form>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nothing defined yet" body="Add the first value above." />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between gap-2 px-3 py-2 rounded-sm border",
                item.isActive ? "border-white/[0.08]" : "border-white/[0.04] opacity-50"
              )}
            >
              <span className="font-body text-sm text-ivory truncate">{item.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() =>
                    act(
                      () =>
                        update.mutateAsync({
                          id: item.id,
                          name: item.name,
                          sortOrder: item.sortOrder,
                          isActive: !item.isActive,
                        }),
                      item.isActive ? "Hidden" : "Restored"
                    )
                  }
                  disabled={busy}
                  title={item.isActive ? "Hide from selection" : "Offer again"}
                  className="text-muted-grey hover:text-ivory p-1 transition disabled:opacity-40"
                >
                  {item.isActive ? (
                    <ToggleRight className="w-4 h-4 text-success" strokeWidth={1.4} />
                  ) : (
                    <ToggleLeft className="w-4 h-4" strokeWidth={1.4} />
                  )}
                </button>
                <button
                  onClick={() => act(() => remove.mutateAsync(item.id), "Removed")}
                  disabled={busy}
                  title="Remove (existing references keep working)"
                  className="text-muted-grey hover:text-error p-1 transition disabled:opacity-40"
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

function SettingsSection() {
  const query = usePlatformSettings();
  const updateSetting = useUpdateSetting();
  const [drafts, setDrafts] = useState({});

  const save = async (key) => {
    const value = drafts[key];
    if (value === undefined) return;
    try {
      await updateSetting.mutateAsync({ key, value });
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      toast({ title: "Setting saved" });
    } catch (err) {
      toast({ title: "Couldn't save", description: toUserMessage(err), variant: "destructive" });
    }
  };

  if (query.isPending || query.isError) return null;
  const settings = query.data ?? [];
  if (settings.length === 0) return null;

  return (
    <Card className="p-4">
      <Eyebrow>Platform settings</Eyebrow>
      <div className="mt-4 space-y-3">
        {settings.map((setting) => {
          const dirty = drafts[setting.key] !== undefined;
          return (
            <div key={setting.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="sm:w-64 shrink-0">
                <p className="font-body text-sm text-ivory truncate">{setting.key}</p>
                {setting.description && (
                  <p className="font-body text-[0.6rem] text-muted-grey truncate">
                    {setting.description}
                  </p>
                )}
              </div>
              <input
                value={dirty ? drafts[setting.key] : setting.value}
                onChange={(e) => setDrafts((d) => ({ ...d, [setting.key]: e.target.value }))}
                aria-label={setting.key}
                className={inputCls}
              />
              <button
                onClick={() => save(setting.key)}
                disabled={!dirty || updateSetting.isPending}
                className="shrink-0 px-3 py-2 rounded-sm border border-white/15 text-muted-grey hover:text-ivory hover:border-white/30 text-[0.6rem] tracking-luxe uppercase transition disabled:opacity-30"
              >
                Save
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FeatureFlagsSection() {
  const query = useFeatureFlags();
  const updateFlag = useUpdateFeatureFlag();

  const toggle = async (flag) => {
    try {
      await updateFlag.mutateAsync({ key: flag.key, isEnabled: !flag.isEnabled });
      toast({ title: flag.isEnabled ? "Flag disabled" : "Flag enabled" });
    } catch (err) {
      toast({ title: "Couldn't update", description: toUserMessage(err), variant: "destructive" });
    }
  };

  if (query.isPending || query.isError) return null;
  const flags = query.data ?? [];
  if (flags.length === 0) return null;

  return (
    <Card className="p-4">
      <Eyebrow>Feature flags</Eyebrow>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {flags.map((flag) => (
          <button
            key={flag.id}
            onClick={() => toggle(flag)}
            disabled={updateFlag.isPending}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-sm border border-white/[0.08] hover:border-rose-gold/30 transition text-left disabled:opacity-40"
          >
            <div className="min-w-0">
              <p className="font-body text-sm text-ivory truncate">{flag.key}</p>
              {flag.description && (
                <p className="font-body text-[0.6rem] text-muted-grey truncate">
                  {flag.description}
                </p>
              )}
            </div>
            {flag.isEnabled ? (
              <ToggleRight className="w-5 h-5 text-success shrink-0" strokeWidth={1.4} />
            ) : (
              <ToggleLeft className="w-5 h-5 text-muted-grey shrink-0" strokeWidth={1.4} />
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}
