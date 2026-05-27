import { supabase } from "./supabaseClient";

/**
 * Subscribe to Supabase Realtime for invalidation signals or chat payloads.
 * Implement channel subscriptions per api.md when wiring features.
 */
export function subscribeToTable(
  table: string,
  onChange: () => void,
): { unsubscribe: () => void } {
  const channel = supabase
    .channel(`public:${table}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => onChange())
    .subscribe();

  return {
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}
