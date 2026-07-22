import { api } from "@/api/client";

/**
 * A talent's booking conversations — `/api/v1/talent/conversations/*`.
 *
 * A talent is only ever a participant of a BOOKING conversation (client ↔ talent ↔
 * management), created when management records the booking. There is no general
 * client↔talent messaging, and nothing here opens one — access is entirely the server's
 * participant check. The talent never sees the pre-booking inquiry thread.
 *
 * REST-only, like the management surface: it is authoritative and refresh-driven, never
 * pretending to be live.
 */

/** Mirrors the backend `ConversationSummaryDto`, including the booking/counterparty context. */
export interface TalentConversationSummary {
  id: string;
  type: string;
  subject: string | null;
  bookingId: string | null;
  lastMessageAtUtc: string | null;
  unreadCount: number;
  /** The client, from the talent's point of view. Display name only. */
  counterpartyDisplayName: string | null;
  bookingReference: string | null;
  /** ISO date (yyyy-MM-dd) or null. */
  bookingDate: string | null;
  bookingStatus: string | null;
}

/** Mirrors the backend `MessageAttachmentDto`. */
export interface MessageAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

/** Mirrors the backend `MessageDto`, including sender / on-behalf-of attribution. */
export interface TalentMessage {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  senderDisplayName: string | null;
  senderRole: string | null;
  onBehalfOfUserId: string | null;
  onBehalfOfDisplayName: string | null;
  /** Ready-to-render attribution, e.g. "Management on behalf of {talent}". */
  displayAttribution: string | null;
  messageType: string;
  body: string;
  isSystem: boolean;
  isDeleted: boolean;
  createdAtUtc: string;
  attachments: MessageAttachment[];
}

/** Mirrors `PagedResult<MessageDto>`. */
export interface PagedTalentMessages {
  items: TalentMessage[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function listTalentConversations(signal?: AbortSignal): Promise<TalentConversationSummary[]> {
  return api.get<TalentConversationSummary[]>("/talent/conversations", { signal });
}

export function getTalentMessages(
  conversationId: string,
  page = 1,
  pageSize = 30,
  signal?: AbortSignal
): Promise<PagedTalentMessages> {
  return api.get<PagedTalentMessages>(`/talent/conversations/${conversationId}/messages`, {
    query: { page, pageSize },
    signal,
  });
}

/** Post a message. Multipart — the controller binds `body` and an optional `file`. */
export function postTalentMessage(
  conversationId: string,
  input: { body?: string | null; file?: File | null }
): Promise<TalentMessage> {
  const form = new FormData();
  if (input.body) form.append("body", input.body);
  if (input.file) form.append("file", input.file);
  return api.postForm<TalentMessage>(`/talent/conversations/${conversationId}/messages`, form);
}

export function markTalentConversationRead(conversationId: string): Promise<void> {
  return api.post<void>(`/talent/conversations/${conversationId}/read`);
}

/**
 * A message the talent wrote themselves.
 *
 * The proxy case matters here: a "Management on behalf of {talent}" message has the manager
 * as its real sender, so it is never "mine" even though it represents this talent — the
 * system-first / sender check keeps that correct.
 */
export function isOwnTalentMessage(message: TalentMessage, userId: string | null): boolean {
  if (message.isSystem || !message.senderUserId || !userId) return false;
  return message.senderUserId === userId;
}
