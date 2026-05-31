import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { subscribeToConversationMessages, subscribeToConversationThreads } from "@/lib/realtime";
import {
  assignConversation,
  createConversation,
  fetchConversation,
  fetchConversations,
  fetchTeamMembers,
  markConversationRead,
  sendMessage,
} from "./api";
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationMessage,
  ConversationQueue,
  CreateConversationInput,
} from "./types";

const detailKey = (threadId: string) => ["conversations", "detail", threadId] as const;

function appendMessageToDetail(
  detail: ConversationDetail | undefined,
  message: ConversationMessage,
): ConversationDetail | undefined {
  if (!detail) return detail;
  if (detail.messages.some((m) => m.id === message.id)) return detail;
  return {
    ...detail,
    messages: [...detail.messages, message],
    lastMessageAt: message.createdAt,
  };
}

export function useConversations(queue?: ConversationQueue) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["conversations", queue ?? "scoped"],
    queryFn: () => fetchConversations(queue),
  });

  useEffect(() => {
    const sub = subscribeToConversationThreads(() => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    });
    return () => sub.unsubscribe();
  }, [qc]);

  return query;
}

export function useConversation(threadId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: detailKey(threadId ?? ""),
    queryFn: () => fetchConversation(threadId!),
    enabled: !!threadId,
  });

  useEffect(() => {
    if (!threadId) return;
    const sub = subscribeToConversationMessages(threadId, () => {
      void qc.cancelQueries({ queryKey: detailKey(threadId) });
      void qc.invalidateQueries({ queryKey: detailKey(threadId) });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    });
    return () => sub.unsubscribe();
  }, [threadId, qc]);

  return query;
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => markConversationRead(threadId),
    onSuccess: (_data, threadId) => {
      qc.setQueriesData<ConversationListItem[]>(
        { queryKey: ["conversations"] },
        (current) =>
          current?.map((thread) =>
            thread.id === threadId ? { ...thread, hasUnread: false } : thread,
          ),
      );
    },
  });
}

export function useTeamMembers(enabled: boolean) {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: fetchTeamMembers,
    enabled,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConversationInput) => createConversation(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useAssignConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, assignedTo }: { threadId: string; assignedTo: string }) =>
      assignConversation(threadId, assignedTo),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.cancelQueries({ queryKey: detailKey(vars.threadId) });
      void qc.invalidateQueries({ queryKey: detailKey(vars.threadId) });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) =>
      sendMessage(threadId, body),
    onSuccess: (message, vars) => {
      const key = detailKey(vars.threadId);
      void qc.cancelQueries({ queryKey: key });
      qc.setQueryData<ConversationDetail>(key, (current) =>
        appendMessageToDetail(current, message),
      );
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
