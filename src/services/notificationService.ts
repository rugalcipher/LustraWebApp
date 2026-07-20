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
 * Where a notification should take the client.
 *
 * Derived from `type` + `relatedEntityId` rather than from `linkUrl`. Two reasons:
 * no server producer currently sets `linkUrl` at all, and it is a free-text column —
 * treating it as a destination would let anything that can write a notification steer a
 * signed-in client to an arbitrary address. When a relative in-app path does appear
 * there it is accepted, but only after the same-origin check below.
 */
export function notificationTarget(notification: NotificationDto): string | null {
  const { type, relatedEntityId: id } = notification;

  if (id) {
    switch (type) {
      case "BookingConfirmed":
      case "BookingReminder":
      case "BookingCancelled":
        return `/app/bookings/${id}`;
      case "ProposalReceived":
      case "ProposalExpired":
        return `/app/proposals/${id}`;
      case "InquiryUpdate":
        return `/app/inquiries/${id}`;
      case "MessageReceived":
        return `/app/messages/${id}`;
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
