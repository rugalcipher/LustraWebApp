import { api } from "@/api/client";

/**
 * The talent's own availability — `/api/v1/talent/availability*` and `/talent/calendar`.
 *
 * Availability is what the TALENT controls. It is distinct from `ProfileStatus`, which is
 * management-owned: marking yourself unavailable does not unpublish your profile, and the
 * UI must not suggest it does.
 */

/** Mirrors the backend `AvailabilityRuleDto`. */
export interface AvailabilityRuleDto {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
}

/** Mirrors the backend `UpsertRuleRequest`. */
export interface UpsertRuleInput {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
}

/** Mirrors the backend `AvailabilityExceptionDto`. */
export interface AvailabilityExceptionDto {
  id: string;
  date: string;
  exceptionType: string;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
}

/** Mirrors the backend `CreateExceptionRequest`. */
export interface CreateExceptionInput {
  date: string;
  exceptionType: string;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
}

/** Mirrors the backend `TravelPeriodDto`. */
export interface TravelPeriodDto {
  id: string;
  cityId: string | null;
  destination: string | null;
  startDate: string;
  endDate: string;
  note: string | null;
}

/** Mirrors the backend `CreateTravelRequest`. */
export interface CreateTravelInput {
  cityId: string | null;
  destination: string | null;
  startDate: string;
  endDate: string;
  note: string | null;
}

/** Mirrors the backend `AvailabilityOverviewDto`. */
export interface AvailabilityOverviewDto {
  status: string;
  timeZone: string;
  note: string | null;
  rules: AvailabilityRuleDto[];
  exceptions: AvailabilityExceptionDto[];
  travelPeriods: TravelPeriodDto[];
}

/** Mirrors the backend `CalendarWindowDto`. */
export interface CalendarWindowDto {
  startTime: string;
  endTime: string;
}

/** Mirrors the backend `CalendarDayDto` — a SERVER-computed day. */
export interface CalendarDayDto {
  date: string;
  status: string;
  isAvailable: boolean;
  isTravel: boolean;
  isBlackout: boolean;
  windows: CalendarWindowDto[];
  note: string | null;
}

/** Mirrors the backend `CalendarDto`. */
export interface CalendarDto {
  fromDate: string;
  toDate: string;
  days: CalendarDayDto[];
}

export function getAvailability(signal?: AbortSignal): Promise<AvailabilityOverviewDto> {
  return api.get<AvailabilityOverviewDto>("/talent/availability", { signal });
}

export function updateStatus(
  status: string,
  note: string | null,
  timeZone: string | null
): Promise<void> {
  return api.put<void>("/talent/availability/status", { status, note, timeZone });
}

export function addRule(input: UpsertRuleInput): Promise<{ id: string }> {
  return api.post<{ id: string }>("/talent/availability/rules", input);
}

export function updateRule(ruleId: string, input: UpsertRuleInput): Promise<void> {
  return api.put<void>(`/talent/availability/rules/${ruleId}`, input);
}

export function deleteRule(ruleId: string): Promise<void> {
  return api.delete<void>(`/talent/availability/rules/${ruleId}`);
}

export function addException(input: CreateExceptionInput): Promise<{ id: string }> {
  return api.post<{ id: string }>("/talent/availability/exceptions", input);
}

export function deleteException(exceptionId: string): Promise<void> {
  return api.delete<void>(`/talent/availability/exceptions/${exceptionId}`);
}

export function addTravel(input: CreateTravelInput): Promise<{ id: string }> {
  return api.post<{ id: string }>("/talent/availability/travel", input);
}

export function deleteTravel(travelId: string): Promise<void> {
  return api.delete<void>(`/talent/availability/travel/${travelId}`);
}

export function getCalendar(
  from?: string,
  to?: string,
  signal?: AbortSignal
): Promise<CalendarDto> {
  return api.get<CalendarDto>("/talent/calendar", { query: { from, to }, signal });
}

// ---- presentation ----------------------------------------------------------

/** `DayOfWeek` names as .NET parses them. */
export const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

/** Backend `AvailabilityExceptionType`. */
export const EXCEPTION_TYPES = [
  { value: "Blackout", label: "Blackout — unavailable all day" },
  { value: "TimeOff", label: "Time off" },
  { value: "Available", label: "Extra availability" },
] as const;

export function presentExceptionType(type: string): string {
  return EXCEPTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** `19:00:00` → `19:00`. */
export function formatTime(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "";
}

/** `19:00` → `19:00:00`, the shape .NET's `TimeOnly` binder expects. */
export function toTimeOnly(time: string): string {
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}

/**
 * Validate a rule before sending it.
 *
 * The server rejects an inverted window anyway; catching it here means the talent gets an
 * answer at the field rather than as a toast after a round trip.
 */
export function validateRule(input: { startTime: string; endTime: string }): string | null {
  if (!input.startTime || !input.endTime) return "Both a start and end time are required.";
  if (input.startTime >= input.endTime) return "The end time must be after the start time.";
  return null;
}

/** Validate a travel period's date range. */
export function validateTravel(input: { startDate: string; endDate: string }): string | null {
  if (!input.startDate || !input.endDate) return "Both a start and end date are required.";
  if (input.startDate > input.endDate) return "The end date must be on or after the start date.";
  return null;
}
