import { describe, it, expect } from "vitest";
import {
  tabFor, isReviewable, canRequestChanges, presentBookingStatus, presentSettlement,
  formatBookingDate, formatBookingTime,
} from "@/services/bookingService";
import {
  APPOINTMENT_STATUSES, allowedActions, appointmentTone, presentAppointmentStatus,
} from "@/services/appointmentService";
import { notificationTarget, safeInternalPath } from "@/services/notificationService";
import type { NotificationDto } from "@/services/notificationService";

describe("booking tabs", () => {
  it("routes every real BookingStatus to a tab", () => {
    // Mirrors the backend BookingStatus enum. A status with no tab would make a booking
    // silently invisible to the client who owns it.
    const statuses = [
      "Draft", "Confirmed", "Scheduled", "InProgress", "Completed",
      "Declined", "Cancelled", "NoShow", "UnderReview",
    ];
    for (const status of statuses) {
      expect(["Upcoming", "Completed", "Cancelled"]).toContain(tabFor(status));
    }
  });

  it("keeps a cancelled booking out of Upcoming even with a future date", () => {
    // The tab is derived from status, never from the date — otherwise a cancelled
    // booking would keep appearing as if it were still going ahead.
    expect(tabFor("Cancelled")).toBe("Cancelled");
    expect(tabFor("NoShow")).toBe("Cancelled");
    expect(tabFor("Declined")).toBe("Cancelled");
  });

  it("files an unrecognised status somewhere rather than dropping it", () => {
    expect(tabFor("SomeFutureStatus")).toBe("Upcoming");
  });
});

describe("booking affordances", () => {
  it("only allows a review of a completed booking", () => {
    expect(isReviewable("Completed")).toBe(true);
    for (const status of ["Confirmed", "Scheduled", "InProgress", "Cancelled", "NoShow"]) {
      expect(isReviewable(status)).toBe(false);
    }
  });

  it("does not offer change requests on a finished booking", () => {
    expect(canRequestChanges("Confirmed")).toBe(true);
    expect(canRequestChanges("Completed")).toBe(false);
    expect(canRequestChanges("Cancelled")).toBe(false);
  });

  it("never labels a status with a raw enum name it knows", () => {
    expect(presentBookingStatus("NoShow").label).toBe("Not attended");
    expect(presentBookingStatus("InProgress").label).toBe("In progress");
  });

  it("falls back to the raw status rather than showing nothing", () => {
    expect(presentBookingStatus("Unknown").label).toBe("Unknown");
  });
});

describe("settlement copy", () => {
  it("never implies the platform took a payment", () => {
    // Lustra processes no money. Every settlement string must stay clear of language
    // that would read as an in-app charge.
    const forbidden = /\b(pay now|checkout|card|paid online|charge)\b/i;
    const statuses = [
      "NotDiscussed", "InstructionsIssued", "AwaitingExternalConfirmation",
      "ConfirmedExternally", "PartiallyConfirmed", "Waived", "RefundedExternally", "Disputed",
    ];
    for (const status of statuses) {
      const { label, detail } = presentSettlement(status);
      expect(label).not.toMatch(forbidden);
      expect(detail).not.toMatch(forbidden);
    }
  });

  it("explains an unknown settlement status without inventing one", () => {
    expect(presentSettlement("Martian").label).toBe("Martian");
    expect(presentSettlement("Martian").detail).toContain("outside the platform");
  });
});

describe("date formatting", () => {
  it("does not shift a calendar date across the timezone boundary", () => {
    // `new Date("2026-07-25")` parses as UTC midnight and renders as the 24th anywhere
    // west of Greenwich. The formatter must build from parts instead.
    expect(formatBookingDate("2026-07-25")).toContain("25");
    expect(formatBookingDate("2026-01-01")).toContain("1");
    expect(formatBookingDate("2026-01-01")).toContain("2026");
  });

  it("says the date is unconfirmed rather than rendering an empty string", () => {
    expect(formatBookingDate(null)).toBe("Date to confirm");
  });

  it("trims seconds from a TimeOnly", () => {
    expect(formatBookingTime("19:30:00")).toBe("19:30");
    expect(formatBookingTime(null)).toBeNull();
  });
});

describe("appointment lifecycle", () => {
  it("offers only the actions the backend will accept", () => {
    // A button the server is certain to refuse is worse than no button: staff click it,
    // get a 422, and lose confidence in the console.
    expect(allowedActions("Confirmed")).toContain("start");
    expect(allowedActions("Confirmed")).toContain("cancel");
    expect(allowedActions("InProgress")).toEqual(["complete", "cancel"]);

    // Terminal states offer nothing.
    for (const status of ["Completed", "Cancelled", "NoShow"]) {
      expect(allowedActions(status)).toEqual([]);
    }
  });

  it("never offers to start an appointment that already finished", () => {
    expect(allowedActions("Completed")).not.toContain("start");
    expect(allowedActions("Cancelled")).not.toContain("reschedule");
  });

  it("keeps the rejected client-facing states out of the picker", () => {
    // These belong to the withdrawn formal booking workflow. Offering any of them would
    // put the client back into a lifecycle Lustra deliberately does not have.
    for (const rejected of [
      "ClientPending", "AwaitingClientAcceptance", "ProposalSent", "PaymentPending", "ClientConfirmed",
    ]) {
      expect(APPOINTMENT_STATUSES).not.toContain(rejected);
    }
  });

  it("shows Confirmed as Scheduled, because no client confirmed anything", () => {
    // The backend status is `Confirmed`; the word must not suggest a client accepted a
    // booking online.
    expect(presentAppointmentStatus("Confirmed")).toBe("Scheduled");
    expect(presentAppointmentStatus("NoShow")).toBe("No-show");
  });

  it("falls back to the raw status rather than showing nothing", () => {
    expect(presentAppointmentStatus("SomeFutureStatus")).toBe("SomeFutureStatus");
    expect(appointmentTone("SomeFutureStatus")).toBe("neutral");
  });
});

describe("notification targets", () => {
  function notification(overrides: Partial<NotificationDto> = {}): NotificationDto {
    return {
      id: "n1",
      type: "BookingConfirmed",
      title: "Your booking is confirmed",
      body: "Booking LB-1 is confirmed.",
      linkUrl: null,
      relatedEntityId: "b1",
      isRead: false,
      readAtUtc: null,
      createdAtUtc: "2026-07-20T10:00:00Z",
      ...overrides,
    };
  }

  it("derives the destination from the type and related entity", () => {
    // The notification centre is the CLIENT surface. A client is now told when a visible
    // appointment is scheduled, so a booking notification opens their own appointment detail.
    expect(notificationTarget(notification({ type: "BookingConfirmed" }))).toBe("/app/appointments/b1");
    expect(notificationTarget(notification({ type: "BookingReminder" }))).toBe("/app/appointments/b1");
    expect(notificationTarget(notification({ type: "MessageReceived" }))).toBe("/app/messages/b1");

    // The withdrawn lifecycle resolves nowhere rather than to a route that 404s.
    expect(notificationTarget(notification({ type: "ProposalReceived" }))).toBeNull();
    expect(notificationTarget(notification({ type: "InquiryUpdate" }))).toBeNull();
  });

  it("ignores linkUrl when the type already resolves a destination", () => {
    // linkUrl is free text on a server row. A known type must win so a stored value can
    // never redirect the client somewhere else.
    const target = notificationTarget(
      notification({ type: "BookingConfirmed", linkUrl: "https://evil.test/steal" })
    );
    expect(target).toBe("/app/appointments/b1");
  });

  it("refuses an off-site linkUrl outright", () => {
    expect(safeInternalPath("https://evil.test")).toBeNull();
    // Protocol-relative: the browser treats this as an absolute URL to another host.
    expect(safeInternalPath("//evil.test/path")).toBeNull();
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
    expect(safeInternalPath("app/messages/1")).toBeNull();
    expect(safeInternalPath(null)).toBeNull();
  });

  it("accepts a genuine in-app path", () => {
    expect(safeInternalPath("/app/messages/1")).toBe("/app/messages/1");
  });

  it("returns no destination for a type it cannot route", () => {
    expect(notificationTarget(notification({ type: "System", linkUrl: null }))).toBeNull();
    expect(notificationTarget(notification({ type: "BookingConfirmed", relatedEntityId: null }))).toBeNull();
  });
});
