import { api } from "@/api/client";

/**
 * Conversations and messaging — `/api/v1/client/conversations/*`.
 *
 * A client only ever talks to MANAGEMENT. There is no client↔talent conversation in
 * this product, and nothing here should be extended to create one.
 *
 * REST owns history, authoritative sends and read state. SignalR (see
 * `@/features/conversations/connection`) only delivers live updates on top — it is
 * never the sole record of a message.
 */

/** Mirrors the backend `ConversationSummaryDto`. */
export interface ConversationSummaryDto {
  id: string;
  type: string;
  subject: string | null;
  inquiryId: string | null;
  bookingId: string | null;
  lastMessageAtUtc: string | null;
  unreadCount: number;
}

/** Mirrors the backend `ParticipantDto`. */
export interface ParticipantDto {
  userId: string;
  role: "Client" | "Talent" | "Management";
  joinedAtUtc: string;
  lastReadAtUtc: string | null;
}

/** Mirrors the backend `ConversationDetailDto`. */
export interface ConversationDetailDto {
  id: string;
  type: string;
  subject: string | null;
  inquiryId: string | null;
  bookingId: string | null;
  lastMessageAtUtc: string | null;
  participants: ParticipantDto[];
}

/** Mirrors the backend `MessageAttachmentDto`. */
export interface MessageAttachmentDto {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

/** Mirrors the backend `MessageDto`. */
export interface MessageDto {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  messageType:
    | "Text"
    | "System"
    | "InquirySummary"
    | "BookingProposal"
    | "BookingStatus"
    | "DateProposal"
    | "Attachment"
    | "ManagementNotice";
  body: string;
  isSystem: boolean;
  isDeleted: boolean;
  createdAtUtc: string;
  attachments: MessageAttachmentDto[];
}

/** Mirrors `PagedResult<MessageDto>`. */
export interface PagedMessages {
  items: MessageDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function listConversations(signal?: AbortSignal): Promise<ConversationSummaryDto[]> {
  return api.get<ConversationSummaryDto[]>("/client/conversations", { signal });
}

export function getConversation(
  conversationId: string,
  signal?: AbortSignal
): Promise<ConversationDetailDto> {
  return api.get<ConversationDetailDto>(`/client/conversations/${conversationId}`, { signal });
}

export function getMessages(
  conversationId: string,
  page = 1,
  pageSize = 30,
  signal?: AbortSignal
): Promise<PagedMessages> {
  return api.get<PagedMessages>(`/client/conversations/${conversationId}/messages`, {
    query: { page, pageSize },
    signal,
  });
}

/**
 * Post a message. Multipart because the endpoint accepts an optional attachment;
 * the field names (`body`, `file`) are fixed by the controller.
 */
export function postMessage(
  conversationId: string,
  input: { body?: string | null; file?: File | null }
): Promise<MessageDto> {
  const form = new FormData();
  if (input.body) form.append("body", input.body);
  if (input.file) form.append("file", input.file);

  return api.postForm<MessageDto>(`/client/conversations/${conversationId}/messages`, form);
}

export function markRead(conversationId: string): Promise<void> {
  return api.post<void>(`/client/conversations/${conversationId}/read`);
}

export function flagMessage(messageId: string, reason: string): Promise<void> {
  return api.post<void>(`/conversations/messages/${messageId}/flag`, { reason });
}

/**
 * A message the client wrote themselves.
 *
 * System messages have no sender, so they are never "mine" — that check must come
 * first, otherwise a null-vs-null comparison would attribute every system message to
 * a signed-out reader.
 */
export function isOwnMessage(message: MessageDto, userId: string | null): boolean {
  if (message.isSystem || !message.senderUserId || !userId) return false;
  return message.senderUserId === userId;
}

/**
 * Open or reuse the caller's conversation with Lustra management, optionally about a
 * specific talent.
 *
 * The talent becomes CONTEXT on the conversation — never a participant. Clients message
 * management; management decides whether and when talent is contacted.
 */
export function startConversation(
  talentProfileId: string | null
): Promise<{ conversationId: string }> {
  return api.post<{ conversationId: string }>("/client/conversations", { talentProfileId });
}
