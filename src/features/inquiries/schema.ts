import { z } from "zod";

/**
 * Inquiry form validation.
 *
 * Mirrors the backend's rules so the client gets immediate feedback, but the API
 * revalidates everything — this is convenience, never authority.
 *
 * Reference data (engagement category, city, venue type) is submitted as backend IDs,
 * never as display labels.
 */

/** Today in the browser's timezone, as an ISO date — used to reject past dates. */
function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const inquirySchema = z
  .object({
    engagementCategoryId: z.string().min(1, "Choose the kind of engagement"),
    preferredDate: optionalDate,
    alternativeDate: optionalDate,
    preferredStartTime: z
      .string()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    estimatedDurationMinutes: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === "" || v === null) return null;
        const parsed = typeof v === "number" ? v : Number.parseInt(v, 10);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .refine((v) => v === null || v > 0, "Duration must be greater than zero")
      .refine((v) => v === null || v <= 60 * 24, "Duration must be within a single day"),
    cityId: z
      .string()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    venueTypeId: z
      .string()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    attendeeCount: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === "" || v === null) return null;
        const parsed = typeof v === "number" ? v : Number.parseInt(v, 10);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .refine((v) => v === null || v >= 0, "Attendees cannot be negative")
      .refine((v) => v === null || v <= 10_000, "That is more guests than we can arrange for"),
    travelRequired: z.boolean().default(false),
    clientMessage: z.string().max(4000, "Please keep this under 4000 characters").optional(),
    additionalRequirements: z.string().max(4000, "Please keep this under 4000 characters").optional(),
    // Not sent to the API — an explicit acknowledgement that this is an INQUIRY.
    acknowledged: z.literal(true, {
      errorMap: () => ({ message: "Please confirm you understand this is an inquiry" }),
    }),
  })
  .refine((v) => !v.preferredDate || v.preferredDate >= todayIso(), {
    message: "Choose a date that hasn't passed",
    path: ["preferredDate"],
  })
  .refine((v) => !v.alternativeDate || v.alternativeDate >= todayIso(), {
    message: "Choose a date that hasn't passed",
    path: ["alternativeDate"],
  });

export type InquiryFormValues = z.input<typeof inquirySchema>;
export type InquiryFormParsed = z.output<typeof inquirySchema>;

/**
 * Form values → the API payload.
 *
 * Dates and times are sent as the client's REQUESTED LOCAL values (`yyyy-MM-dd`,
 * `HH:mm`), matching the backend's `DateOnly`/`TimeOnly` fields — an engagement is
 * arranged in the talent's local time, so converting to UTC here would misstate the
 * request. The timezone context is the engagement's city, which is submitted alongside.
 */
export function toCreateInquiryInput(values: InquiryFormParsed, talentProfileId: string) {
  return {
    talentProfileId,
    engagementCategoryId: values.engagementCategoryId,
    preferredDate: values.preferredDate,
    alternativeDate: values.alternativeDate,
    // The API expects HH:mm:ss.
    preferredStartTime: values.preferredStartTime ? `${values.preferredStartTime}:00` : null,
    estimatedDurationMinutes: values.estimatedDurationMinutes,
    cityId: values.cityId,
    venueTypeId: values.venueTypeId,
    attendeeCount: values.attendeeCount,
    travelRequired: values.travelRequired,
    clientMessage: values.clientMessage?.trim() || null,
    additionalRequirements: values.additionalRequirements?.trim() || null,
  };
}
