import React, { useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Plane, CalendarOff } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import MonthGrid from "@/components/lustra/MonthGrid";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import {
  DAYS_OF_WEEK, EXCEPTION_TYPES, presentExceptionType, formatTime, toTimeOnly,
  validateRule, validateTravel,
} from "@/services/availabilityService";
import { formatBookingDate } from "@/services/bookingService";
import {
  useMyAvailability, useMyCalendar, useSaveAvailabilityRule, useDeleteAvailabilityRule,
  useAddAvailabilityException, useDeleteAvailabilityException,
  useAddTravelPeriod, useDeleteTravelPeriod,
} from "@/features/talent/hooks";

/**
 * The talent's availability.
 *
 * The calendar is COMPUTED BY THE SERVER from weekly rules, date exceptions and travel
 * periods. It is rendered, never recalculated here — a second implementation of that
 * logic in the browser would drift from the one management actually matches against.
 */
export default function TalentAvailability() {
  const { data: availability, isPending, isError, error } = useMyAvailability();

  // Three months from today is enough to plan against without fetching a whole year.
  const [from, to] = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
  }, []);
  const { data: calendar } = useMyCalendar(from, to);

  const dayIndex = useMemo(() => {
    const index = new Map();
    for (const day of calendar?.days ?? []) index.set(day.date, day);
    return index;
  }, [calendar]);

  const dayStatus = (_date, iso) => {
    const day = dayIndex.get(iso);
    if (!day) return null;
    if (day.isBlackout) return "blackout";
    if (day.isTravel) return "travel";
    if (day.isAvailable) return "available";
    return null;
  };

  if (isPending) {
    return (
      <div className="lustra-marble min-h-screen py-24 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="lustra-marble min-h-screen px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">Couldn't load your availability</p>
        <p className="mt-3 font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      </div>
    );
  }

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Talent Portal"
        title="Availability"
        subtitle="Set your weekly pattern, block out dates and record travel."
      />

      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        <Card className="p-4">
          <Eyebrow>Calendar</Eyebrow>
          <p className="font-body text-[0.6rem] text-muted-grey mt-2 leading-relaxed">
            Computed by Lustra from your weekly pattern, exceptions and travel below.
            Editing those updates this view.
          </p>
          <div className="mt-4">
            <MonthGrid dayStatus={dayStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
            <Legend className="bg-rose-gold/30 border-rose-gold/50" label="Available" />
            <Legend className="bg-error/20 border-error/40" label="Blackout" />
            <Legend className="bg-warning/20 border-warning/40" label="Travelling" />
          </div>
          <p className="font-body text-[0.6rem] text-muted-grey mt-3">
            Times shown in {availability.timeZone}.
          </p>
        </Card>

        <WeeklyRules rules={availability.rules} />
        <Exceptions exceptions={availability.exceptions} />
        <TravelPeriods periods={availability.travelPeriods} />
      </div>
    </div>
  );
}

function Legend({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">
      <span className={cn("w-2.5 h-2.5 rounded-sm border", className)} />
      {label}
    </span>
  );
}

/** The recurring weekly pattern. */
function WeeklyRules({ rules }) {
  const saveRule = useSaveAvailabilityRule();
  const deleteRule = useDeleteAvailabilityRule();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ dayOfWeek: "Friday", startTime: "18:00", endTime: "23:00" });

  const add = async (event) => {
    event.preventDefault();
    const problem = validateRule(draft);
    if (problem) {
      toast({ title: "Check the times", description: problem, variant: "destructive" });
      return;
    }
    try {
      await saveRule.mutateAsync({
        input: {
          dayOfWeek: draft.dayOfWeek,
          startTime: toTimeOnly(draft.startTime),
          endTime: toTimeOnly(draft.endTime),
          effectiveFrom: null,
          effectiveTo: null,
          isActive: true,
        },
      });
      setAdding(false);
      toast({ title: "Rule added" });
    } catch (err) {
      toast({ title: "Couldn't add", description: toUserMessage(err), variant: "destructive" });
    }
  };

  // Render in real week order, not insertion order.
  const ordered = [...rules].sort(
    (a, b) =>
      DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek) ||
      a.startTime.localeCompare(b.startTime)
  );

  return (
    <Card className="p-5">
      <SectionHeader
        title="Weekly Pattern"
        hint="The hours you're normally available."
        adding={adding}
        onToggle={() => setAdding((a) => !a)}
      />

      {adding && (
        <form onSubmit={add} className="mt-4 p-3.5 rounded-sm border border-white/10 space-y-3">
          <select
            value={draft.dayOfWeek}
            onChange={(e) => setDraft((d) => ({ ...d, dayOfWeek: e.target.value }))}
            className={inputClass}
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day} className="bg-noir">
                {day}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              className={cn(inputClass, "flex-1")}
            />
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              className={cn(inputClass, "flex-1")}
            />
          </div>
          <LustraButton type="submit" size="sm" className="w-full" disabled={saveRule.isPending}>
            {saveRule.isPending ? "Adding…" : "Add rule"}
          </LustraButton>
        </form>
      )}

      {ordered.length === 0 ? (
        <Empty text="No weekly pattern set. Clients see your availability status instead." />
      ) : (
        <div className="mt-4 space-y-1">
          {ordered.map((rule) => (
            <Row
              key={rule.id}
              title={rule.dayOfWeek}
              detail={`${formatTime(rule.startTime)} – ${formatTime(rule.endTime)}${rule.isActive ? "" : " · Inactive"}`}
              onDelete={() => deleteRule.mutate(rule.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

/** Date-specific overrides on top of the weekly pattern. */
function Exceptions({ exceptions }) {
  const addException = useAddAvailabilityException();
  const deleteException = useDeleteAvailabilityException();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ date: "", exceptionType: "Blackout", note: "" });

  const add = async (event) => {
    event.preventDefault();
    if (!draft.date) {
      toast({ title: "Pick a date", variant: "destructive" });
      return;
    }
    try {
      await addException.mutateAsync({
        date: draft.date,
        exceptionType: draft.exceptionType,
        startTime: null,
        endTime: null,
        note: draft.note.trim() || null,
      });
      setDraft({ date: "", exceptionType: "Blackout", note: "" });
      setAdding(false);
      toast({ title: "Exception added" });
    } catch (err) {
      toast({ title: "Couldn't add", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const ordered = [...exceptions].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card className="p-5">
      <SectionHeader
        title="Date Exceptions"
        hint="Block out specific dates, or add extra availability."
        adding={adding}
        onToggle={() => setAdding((a) => !a)}
      />

      {adding && (
        <form onSubmit={add} className="mt-4 p-3.5 rounded-sm border border-white/10 space-y-3">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            className={inputClass}
          />
          <select
            value={draft.exceptionType}
            onChange={(e) => setDraft((d) => ({ ...d, exceptionType: e.target.value }))}
            className={inputClass}
          >
            {EXCEPTION_TYPES.map((type) => (
              <option key={type.value} value={type.value} className="bg-noir">
                {type.label}
              </option>
            ))}
          </select>
          <input
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            placeholder="Note (optional, seen by Lustra)"
            maxLength={200}
            className={inputClass}
          />
          <LustraButton type="submit" size="sm" className="w-full" disabled={addException.isPending}>
            {addException.isPending ? "Adding…" : "Add exception"}
          </LustraButton>
        </form>
      )}

      {ordered.length === 0 ? (
        <Empty text="No date exceptions." />
      ) : (
        <div className="mt-4 space-y-1">
          {ordered.map((exception) => (
            <Row
              key={exception.id}
              icon={CalendarOff}
              title={formatBookingDate(exception.date)}
              detail={`${presentExceptionType(exception.exceptionType)}${exception.note ? ` · ${exception.note}` : ""}`}
              onDelete={() => deleteException.mutate(exception.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

/** Travel periods, which management uses when matching location-based inquiries. */
function TravelPeriods({ periods }) {
  const addTravel = useAddTravelPeriod();
  const deleteTravel = useDeleteTravelPeriod();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ destination: "", startDate: "", endDate: "", note: "" });

  const add = async (event) => {
    event.preventDefault();
    const problem = validateTravel(draft);
    if (problem) {
      toast({ title: "Check the dates", description: problem, variant: "destructive" });
      return;
    }
    try {
      await addTravel.mutateAsync({
        cityId: null,
        destination: draft.destination.trim() || null,
        startDate: draft.startDate,
        endDate: draft.endDate,
        note: draft.note.trim() || null,
      });
      setDraft({ destination: "", startDate: "", endDate: "", note: "" });
      setAdding(false);
      toast({ title: "Travel added" });
    } catch (err) {
      toast({ title: "Couldn't add", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const ordered = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <Card className="p-5">
      <SectionHeader
        title="Travel"
        hint="Where you'll be, so Lustra can match engagements there."
        adding={adding}
        onToggle={() => setAdding((a) => !a)}
      />

      {adding && (
        <form onSubmit={add} className="mt-4 p-3.5 rounded-sm border border-white/10 space-y-3">
          <input
            value={draft.destination}
            onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))}
            placeholder="Destination"
            maxLength={120}
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              className={cn(inputClass, "flex-1")}
            />
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              className={cn(inputClass, "flex-1")}
            />
          </div>
          <LustraButton type="submit" size="sm" className="w-full" disabled={addTravel.isPending}>
            {addTravel.isPending ? "Adding…" : "Add travel"}
          </LustraButton>
        </form>
      )}

      {ordered.length === 0 ? (
        <Empty text="No travel recorded." />
      ) : (
        <div className="mt-4 space-y-1">
          {ordered.map((period) => (
            <Row
              key={period.id}
              icon={Plane}
              title={period.destination ?? "Travelling"}
              detail={`${formatBookingDate(period.startDate)} – ${formatBookingDate(period.endDate)}`}
              onDelete={() => deleteTravel.mutate(period.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

const inputClass =
  "w-full bg-transparent border border-white/10 rounded-sm px-3 py-2.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition";

function SectionHeader({ title, hint, adding, onToggle }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{title}</Eyebrow>
        <button
          onClick={onToggle}
          className="inline-flex items-center gap-1 text-[0.55rem] tracking-luxe uppercase text-rose-gold/80 hover:text-rose-gold transition"
        >
          {adding ? "Cancel" : <><Plus className="w-3 h-3" strokeWidth={1.4} /> Add</>}
        </button>
      </div>
      <p className="font-body text-[0.6rem] text-muted-grey mt-2 leading-relaxed">{hint}</p>
    </>
  );
}

function Row({ icon: Icon, title, detail, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-grey shrink-0" strokeWidth={1.2} />}
        <div className="min-w-0">
          <p className="font-body text-sm text-ivory truncate">{title}</p>
          <p className="font-body text-[0.6rem] text-muted-grey mt-0.5 truncate">{detail}</p>
        </div>
      </div>
      <button
        onClick={onDelete}
        aria-label={`Remove ${title}`}
        className="shrink-0 text-muted-grey hover:text-error transition p-1"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.3} />
      </button>
    </div>
  );
}

function Empty({ text }) {
  return <p className="font-body text-sm text-muted-grey mt-4">{text}</p>;
}
