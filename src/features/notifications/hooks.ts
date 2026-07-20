import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as notificationService from "@/services/notificationService";
import { onChatEvent } from "@/features/conversations/connection";

/**
 * Notification hooks.
 *
 * Notifications have no realtime channel of their own — `ChatHub` only carries
 * conversation events. So the unread count polls on a slow interval, and additionally
 * refreshes when a chat event arrives, since the same server action that produced the
 * event usually produced a notification too.
 */

const UNREAD_POLL_MS = 60_000;
const NOTIFICATION_STALE_TIME = 30_000;
const PAGE_SIZE = 20;

export function useNotifications(page = 1, unreadOnly = false) {
  const { principal } = usePrincipal();
  return useQuery({
    queryKey: queryKeys.notifications.list({ page, unreadOnly }),
    queryFn: ({ signal }) =>
      notificationService.listNotifications(page, PAGE_SIZE, unreadOnly, signal),
    enabled: principal.isAuthenticated,
    staleTime: NOTIFICATION_STALE_TIME,
  });
}

export function useUnreadNotificationCount(): number {
  const { principal } = usePrincipal();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: ({ signal }) => notificationService.getUnreadCount(signal),
    enabled: principal.isAuthenticated,
    // Polling is the floor, not the only signal: a slow interval keeps background cost
    // low, and the chat-event subscription below covers the responsive case.
    refetchInterval: principal.isAuthenticated ? UNREAD_POLL_MS : false,
    staleTime: UNREAD_POLL_MS,
  });

  useEffect(() => {
    if (!principal.isAuthenticated) return;
    const off = onChatEvent("ConversationUpdated", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    });
    return off;
  }, [queryClient, principal.isAuthenticated]);

  return data?.count ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}

export function useNotificationPreferences() {
  const { principal } = usePrincipal();
  return useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: ({ signal }) => notificationService.getPreferences(signal),
    enabled: principal.isAuthenticated,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: notificationService.NotificationPreferenceDto) =>
      notificationService.updatePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
    },
  });
}
