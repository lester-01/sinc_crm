import { supabase } from "./supabaseClient";

/**
 * Supabase Realtime subscriptions for query invalidation (per project_requirements/api.md).
 */
export function subscribeToTable(
  table: string,
  onChange: () => void,
  filter?: string,
): { unsubscribe: () => void } {
  const channel = supabase
    .channel(`public:${table}:${filter ?? "all"}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      },
      () => onChange(),
    )
    .subscribe();

  return {
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}

export function subscribeToConversationThreads(onChange: () => void) {
  return subscribeToTable("conversation_threads", onChange);
}

export function subscribeToConversationMessages(threadId: string, onChange: () => void) {
  return subscribeToTable(
    "conversation_messages",
    onChange,
    `thread_id=eq.${threadId}`,
  );
}
