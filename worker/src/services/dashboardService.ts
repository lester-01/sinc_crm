import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./clientsService";

const CONVERSATION_STATUSES = ["open", "pending", "closed"] as const;
const DEAL_STAGES = [
  "new_lead",
  "contacted",
  "consultation_booked",
  "documents_requested",
  "application_started",
  "submitted",
  "won",
  "lost",
] as const;

type ThreadRow = { status: string; assigned_to: string | null };
type DealRow = { stage: string; owner_id: string | null };

export async function getDashboard(supabase: SupabaseClient) {
  const [
    { data: threads, error: threadsErr },
    { data: deals, error: dealsErr },
    { data: history, error: historyErr },
    { data: messages, error: messagesErr },
  ] = await Promise.all([
    supabase.from("conversation_threads").select("status, assigned_to"),
    supabase.from("deals").select("stage, owner_id"),
    supabase
      .from("deal_stage_history")
      .select("id, from_stage, to_stage, created_at, deals(title)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("conversation_messages")
      .select("id, body, created_at, conversation_threads(subject, clients(full_name))")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (threadsErr) throw new HttpError(threadsErr.message, 500);
  if (dealsErr) throw new HttpError(dealsErr.message, 500);
  if (historyErr) throw new HttpError(historyErr.message, 500);
  if (messagesErr) throw new HttpError(messagesErr.message, 500);

  const threadList = (threads ?? []) as ThreadRow[];
  const dealList = (deals ?? []) as DealRow[];

  const conversationsByStatus: Record<string, number> = {};
  for (const s of CONVERSATION_STATUSES) conversationsByStatus[s] = 0;
  let unassignedConversations = 0;
  for (const t of threadList) {
    conversationsByStatus[t.status] = (conversationsByStatus[t.status] ?? 0) + 1;
    if (t.assigned_to === null) unassignedConversations += 1;
  }

  const dealsByStage: Record<string, number> = {};
  for (const s of DEAL_STAGES) dealsByStage[s] = 0;
  const ownerCounts = new Map<string | null, number>();
  let activeDeals = 0;
  let wonDeals = 0;

  for (const d of dealList) {
    dealsByStage[d.stage] = (dealsByStage[d.stage] ?? 0) + 1;
    ownerCounts.set(d.owner_id, (ownerCounts.get(d.owner_id) ?? 0) + 1);
    if (d.stage === "won") wonDeals += 1;
    else if (d.stage !== "lost") activeDeals += 1;
  }

  const ownerIds = [...ownerCounts.keys()].filter((id): id is string => id !== null);
  const { data: owners, error: ownersErr } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ownerIds.length ? ownerIds : ["00000000-0000-0000-0000-000000000000"]);
  if (ownersErr) throw new HttpError(ownersErr.message, 500);

  const ownerNames = new Map((owners ?? []).map((o) => [o.id as string, o.full_name as string]));

  const dealsByOwner = [...ownerCounts.entries()]
    .map(([ownerId, count]) => ({
      ownerId,
      ownerName: ownerId ? (ownerNames.get(ownerId) ?? "Unknown") : "Unassigned",
      count,
    }))
    .sort((a, b) => b.count - a.count || a.ownerName.localeCompare(b.ownerName));

  const recentActivity = [
    ...(history ?? []).map((h) => {
      const deal = Array.isArray(h.deals) ? h.deals[0] : h.deals;
      const title = (deal as { title?: string } | null)?.title ?? "Deal";
      const from = h.from_stage ? String(h.from_stage).replace(/_/g, " ") : "new";
      const to = String(h.to_stage).replace(/_/g, " ");
      return {
        id: `stage-${h.id}`,
        kind: "deal_stage" as const,
        description: `${title}: ${from} → ${to}`,
        createdAt: h.created_at as string,
      };
    }),
    ...(messages ?? []).map((m) => {
      const thread = Array.isArray(m.conversation_threads)
        ? m.conversation_threads[0]
        : m.conversation_threads;
      const client = thread?.clients
        ? Array.isArray(thread.clients)
          ? thread.clients[0]
          : thread.clients
        : null;
      const clientName = (client as { full_name?: string } | null)?.full_name ?? "Client";
      const subject = (thread as { subject?: string } | null)?.subject ?? "conversation";
      return {
        id: `msg-${m.id}`,
        kind: "conversation_message" as const,
        description: `${clientName}: message in ${subject}`,
        createdAt: m.created_at as string,
      };
    }),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return {
    openChats: conversationsByStatus.open ?? 0,
    unassignedConversations,
    activeDeals,
    wonDeals,
    conversationsByStatus,
    dealsByStage,
    dealsByOwner,
    recentActivity,
  };
}
