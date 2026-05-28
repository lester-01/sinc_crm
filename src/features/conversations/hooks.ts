import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { subscribeToConversationMessages, subscribeToConversationThreads } from "@/lib/realtime";
import {
  assignConversation,
  createConversation,
  fetchConversation,
  fetchConversations,
  fetchTeamMembers,
  sendMessage,
} from "./api";
import type { ConversationQueue, CreateConversationInput } from "./types";

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
    queryKey: ["conversations", "detail", threadId],
    queryFn: () => fetchConversation(threadId!),
    enabled: !!threadId,
  });

  useEffect(() => {
    if (!threadId) return;
    const sub = subscribeToConversationMessages(threadId, () => {
      void qc.invalidateQueries({ queryKey: ["conversations", "detail", threadId] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    });
    return () => sub.unsubscribe();
  }, [threadId, qc]);

  return query;
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
      void qc.invalidateQueries({ queryKey: ["conversations", "detail", vars.threadId] });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) =>
      sendMessage(threadId, body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["conversations", "detail", vars.threadId] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
