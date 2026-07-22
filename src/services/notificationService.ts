import { api } from "@/api/client";
import type { PagedResult } from "@/services/discoveryService";

/**
 * Notifications — `/api/v1/notifications/*`.
 *
 * The in-app record is the durable one; email / SMS / push are dispatched separately
 * through the server's outbox and are governed by the preferences below.
 */

/** Mirrors the backend `NotificationDto`. */
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  readAtUtc: string | null;
  createdAtUtc: string;
}

/** Mirrors the backend `NotificationPreferenceDto`. */
export interface NotificationPreferenceDto {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  marketingEmails: boolean;
}

export function listNotifications(
  page = 1,
  pageSize = 20,
  unreadOnly = false,
  signal?: AbortSignal
): Promise<PagedResult<NotificationDto>> {
  return api.get<PagedResult<NotificationDto>>("/notifications", {
    query: { page, pageSize, unreadOnly },
    signal,
  });
}

export function getUnreadCount(signal?: AbortSignal): Promise<{ count: number }> {
  return api.get<{ count: number }>("/notifications/unread-count", { signal });
}

export function markRead(notificationId: string): Promise<void> {
  return api.post<void>(`/notifications/${notificationId}/read`, undefined);
}

export function markAllRead(): Promise<{ updated: number }> {
  return api.post<{ updated: number }>("/notifications/read-all", undefined);
}

export function getPreferences(signal?: AbortSignal): Promise<NotificationPreferenceDto> {
  return api.get<NotificationPreferenceDto>("/notifications/preferences", { signal });
}

export function updatePreferences(prefs: NotificationPreferenceDto): Promise<void> {
  return api.put<void>("/notifications/preferences", prefs);
}

// ---- presentation ----------------------------------------------------------

/**
 * Where a notification should take the reader.
 *
 * Derived from `type` + `relatedEntityId` rather than from `linkUrl`. Two reasons:
 * no server producer currently sets `linkUrl` at all, and it is a free-text column —
 * treating it as a destination would let anything that can write a notification steer a
 * signed-in user to an arbitrary address. When a relative in-app path does appear
 * there it is accepted, but only after the same-origin check below.
 *
 * Booking notifications go to the TALENT PORTAL, not to a client route. Only the
 * assigned talent receives one — an appointment is management's internal record and the
 * client is never told it exists — so `/talent-bookings/:id` is the correct and only
 * destination. Sending them to `/app/bookings/:id` used to be right; that client route
 * no longer exists, and routing a talent into the client area would 404 them.
 */
export function notificationTarget(notification: NotificationDto): string | null {
  const { type, relatedEntityId: id } = notification;

  if (id) {
    switch (type) {
      case "BookingConfirmed":
      case "BookingReminder":
      case "BookingCancelled":
        // The notification centre is the CLIENT surface. A client is now told when a visible
        // appointment is scheduled, so a booking notification opens their own appointment
        // detail — never a talent route they cannot reach.
        return `/app/appointments/${id}`;
      case "MessageReceived":
        return `/app/messages/${id}`;
      case "ProposalReceived":
      case "ProposalExpired":
      case "InquiryUpdate":
        // The withdrawn client lifecycle. No producer targets a client with these any
        // more, and the routes they pointed at are gone — so resolve nothing rather
        // than send someone to a 404.
        return null;
      default:
        break;
    }
  }

  return safeInternalPath(notification.linkUrl);
}

/**
 * Accepts only a same-origin, in-app path. A protocol-relative value (`//evil.test`) or
 * an absolute URL is rejected outright, so a notification can never become an open
 * redirect out of the signed-in area.
 */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

/** Icon name (lucide) per notification type, for the notification centre. */
export function notificationIcon(type: string): string {
  switch (type) {
    case "BookingConfirmed":
    case "BookingReminder":
      return "CalendarCheck";
    case "BookingCancelled":
      return "CalendarX";
    case "ProposalReceived":
    case "ProposalExpired":
      return "FileText";
    case "MessageReceived":
      return "MessageSquare";
    case "InquiryUpdate":
      return "Inbox";
    case "ReviewReceived":
      return "Star";
    case "SafetyUpdate":
      return "ShieldAlert";
    default:
      return "Bell";
  }
}
