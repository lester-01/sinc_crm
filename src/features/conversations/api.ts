import { apiFetch } from "@/lib/apiClient";
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationQueue,
  CreateConversationInput,
  TeamMember,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const err = await res.json().catch(() => ({}));
  throw new ApiError((err as { error?: string }).error ?? fallback, res.status);
}

export async function fetchConversations(
  queue?: ConversationQueue,
): Promise<ConversationListItem[]> {
  const params = queue ? `?queue=${queue}` : "";
  const res = await apiFetch(`/api/conversations${params}`);
  if (!res.ok) await parseError(res, "Failed to load conversations");
  return res.json();
}

export async function fetchConversation(threadId: string): Promise<ConversationDetail> {
  const res = await apiFetch(`/api/conversations/${threadId}`);
  if (!res.ok) await parseError(res, "Failed to load conversation");
  return res.json();
}

export async function createConversation(
  input: CreateConversationInput,
): Promise<ConversationListItem> {
  const res = await apiFetch("/api/conversations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res, "Failed to create conversation");
  return res.json();
}

export async function assignConversation(
  threadId: string,
  assignedTo: string,
): Promise<void> {
  const res = await apiFetch(`/api/conversations/${threadId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ assignedTo }),
  });
  if (!res.ok) await parseError(res, "Failed to assign conversation");
}

export async function sendMessage(threadId: string, body: string): Promise<void> {
  const res = await apiFetch(`/api/conversations/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  if (!res.ok) await parseError(res, "Failed to send message");
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const res = await apiFetch("/api/users");
  if (!res.ok) await parseError(res, "Failed to load team members");
  return res.json();
}
