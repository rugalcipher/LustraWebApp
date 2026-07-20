import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell, CalendarCheck, CalendarX, FileText, MessageSquare, Inbox, Star, ShieldAlert,
  Loader2, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { toUserMessage } from "@/api/problemDetails";
import { notificationTarget, notificationIcon } from "@/services/notificationService";
import {
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
} from "@/features/notifications/hooks";

const ICONS = { Bell, CalendarCheck, CalendarX, FileText, MessageSquare, Inbox, Star, ShieldAlert };

/**
 * The notification centre.
 *
 * Every destination is derived from the notification's `type` and `relatedEntityId`, never
 * from its `linkUrl` — see `notificationTarget`, which refuses anything that is not an
 * in-app path so a stored notification can never redirect a signed-in client off-site.
 */
export default function Notifications() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error } = useNotifications(page);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  const open = (notification) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    const target = notificationTarget(notification);
    if (target) navigate(target);
  };

  return (
    <div className="px-5 pt-6 pb-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
      </button>

      <div className="flex items-end justify-between gap-3 mt-4">
        <div>
          <Eyebrow>Activity</Eyebrow>
          <h1 className="font-heading font-light text-3xl text-ivory mt-1">Notifications</h1>
        </div>
        {hasUnread && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-[0.55rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition disabled:opacity-50 pb-1"
          >
            Mark all read
          </button>
        )}
      </div>

      {isPending ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : isError ? (
        <p className="py-20 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing yet"
          body="Proposals, booking confirmations and reminders from Lustra will appear here."
          action={
            <Link
              to="/app/discover"
              className="text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition"
            >
              Discover Talent
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-2 mt-5">
            {items.map((notification) => {
              const Icon = ICONS[notificationIcon(notification.type)] ?? Bell;
              const navigable = Boolean(notificationTarget(notification));

              return (
                <button
                  key={notification.id}
                  onClick={() => open(notification)}
                  className={cn(
                    "w-full text-left flex gap-3 p-3.5 rounded-lg border transition",
                    notification.isRead
                      ? "border-white/[0.05] bg-card-black/40 hover:border-white/15"
                      : "border-rose-gold/25 bg-card-black/70 hover:border-rose-gold/50",
                    !navigable && "cursor-default"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 mt-0.5 shrink-0",
                      notification.isRead ? "text-muted-grey/60" : "text-rose-gold/80"
                    )}
                    strokeWidth={1.2}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-body text-sm leading-snug",
                        notification.isRead ? "text-soft-ivory/70" : "text-ivory"
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="font-body text-[0.7rem] text-muted-grey mt-1 leading-relaxed">
                      {notification.body}
                    </p>
                    <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey/70 mt-1.5">
                      {new Date(notification.createdAtUtc).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <span
                      aria-label="Unread"
                      className="w-1.5 h-1.5 rounded-full bg-rose-gold shrink-0 mt-2"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {(data.hasPrevious || data.hasNext) && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.hasPrevious}
                className="text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition disabled:opacity-30 disabled:hover:text-muted-grey"
              >
                ← Newer
              </button>
              <span className="text-[0.55rem] text-muted-grey">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.hasNext}
                className="text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition disabled:opacity-30 disabled:hover:text-muted-grey"
              >
                Older →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
