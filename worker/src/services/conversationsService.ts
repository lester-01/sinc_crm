import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "../types";
import type {
  AssignConversationBody,
  CreateConversationBody,
  PatchStatusBody,
  PostMessageBody,
} from "../schemas/conversations";
import { HttpError } from "./clientsService";

type ProfileRow = { id: string; role: AppRole; full_name: string };

type ThreadRow = {
  id: string;
  client_id: string;
  assigned_to: string | null;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  client_last_read_at: string | null;
};

async function getProfile(supabase: SupabaseClient, userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new HttpError(error.message, 500);
  if (!data) throw new HttpError("Profile not found for user", 403);
  return data as ProfileRow;
}

async function getClientIdForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) throw new HttpError(error.message, 500);
  return data?.id ?? null;
}

async function canAccessThread(
  supabase: SupabaseClient,
  profile: ProfileRow,
  thread: ThreadRow,
): Promise<boolean> {
  if (profile.role === "manager") return true;
  if (profile.role === "sales") {
    return thread.assigned_to === null || thread.assigned_to === profile.id;
  }
  if (profile.role === "client") {
    const clientId = await getClientIdForUser(supabase, profile.id);
    return clientId !== null && thread.client_id === clientId;
  }
  return false;
}

async function loadThread(supabase: SupabaseClient, threadId: string): Promise<ThreadRow> {
  const { data, error } = await supabase
    .from("conversation_threads")
    .select(
      "id, client_id, assigned_to, subject, status, last_message_at, created_at, updated_at, client_last_read_at",
    )
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw new HttpError(error.message, 500);
  if (!data) throw new HttpError("Conversation not found", 404);
  return data as ThreadRow;
}

async function latestTeamMessageAtByThreadId(
  supabase: SupabaseClient,
  threadIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (threadIds.length === 0) return map;

  const { data, error } = await supabase
    .from("conversation_messages")
    .select("thread_id, created_at")
    .in("thread_id", threadIds)
    .eq("sender_type", "team")
    .order("created_at", { ascending: false });

  if (error) throw new HttpError(error.message, 500);

  for (const row of data ?? []) {
    const threadId = row.thread_id as string;
    if (!map.has(threadId)) {
      map.set(threadId, row.created_at as string);
    }
  }
  return map;
}

function mapThreadListItem(
  row: ThreadRow & { clients?: { full_name: string } | { full_name: string }[] | null },
  assigneeNames: Map<string, string>,
  viewerRole: AppRole,
  lastTeamMessageAt: string | null = null,
) {
  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  const readCursor = row.client_last_read_at ?? "1970-01-01T00:00:00.000Z";
  const lastTeamReplyAfterRead =
    viewerRole === "client" &&
    lastTeamMessageAt !== null &&
    lastTeamMessageAt > readCursor;
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: client?.full_name ?? "Client",
    subject: row.subject,
    status: row.status,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to ? (assigneeNames.get(row.assigned_to) ?? null) : null,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    hasUnread: lastTeamReplyAfterRead,
  };
}

export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
  queue: string | undefined,
) {
  const profile = await getProfile(supabase, userId);

  let query = supabase
    .from("conversation_threads")
    .select(
      "id, client_id, assigned_to, subject, status, last_message_at, created_at, updated_at, client_last_read_at, clients(full_name)",
    )
    .order("last_message_at", { ascending: false });

  if (profile.role === "client") {
    const clientId = await getClientIdForUser(supabase, userId);
    if (!clientId) return [];
    query = query.eq("client_id", clientId);
  } else if (profile.role === "sales") {
    if (queue === "unassigned") {
      query = query.is("assigned_to", null);
    } else if (queue === "mine") {
      query = query.eq("assigned_to", userId);
    } else if (queue === "all") {
      query = query.or(`assigned_to.is.null,assigned_to.eq.${userId}`);
    } else {
      query = query.or(`assigned_to.is.null,assigned_to.eq.${userId}`);
    }
  } else if (profile.role === "manager") {
    if (queue === "unassigned") {
      query = query.is("assigned_to", null);
    } else if (queue === "mine") {
      query = query.eq("assigned_to", userId);
    }
  }

  const { data, error } = await query;
  if (error) throw new HttpError(error.message, 500);

  const rows = (data ?? []) as (ThreadRow & {
    clients?: { full_name: string } | { full_name: string }[] | null;
  })[];

  const assigneeIds = [...new Set(rows.map((r) => r.assigned_to).filter(Boolean))] as string[];
  const assigneeNames = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", assigneeIds);
    for (const p of profiles ?? []) {
      assigneeNames.set(p.id as string, p.full_name as string);
    }
  }

  const lastTeamByThreadId =
    profile.role === "client"
      ? await latestTeamMessageAtByThreadId(
          supabase,
          rows.map((r) => r.id),
        )
      : new Map<string, string>();

  return rows.map((r) =>
    mapThreadListItem(
      r,
      assigneeNames,
      profile.role,
      lastTeamByThreadId.get(r.id) ?? null,
    ),
  );
}

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  body: CreateConversationBody,
) {
  const profile = await getProfile(supabase, userId);

  if (profile.role === "client") {
    const ownClientId = await getClientIdForUser(supabase, userId);
    if (!ownClientId || ownClientId !== body.clientId) {
      throw new HttpError("Forbidden", 403);
    }
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select("id")
    .eq("id", body.clientId)
    .maybeSingle();
  if (clientErr) throw new HttpError(clientErr.message, 500);
  if (!clientRow) throw new HttpError("Client not found", 404);

  const now = new Date().toISOString();
  const { data: thread, error: threadErr } = await supabase
    .from("conversation_threads")
    .insert({
      client_id: body.clientId,
      subject: body.subject,
      status: "open",
      assigned_to: null,
      last_message_at: now,
    })
    .select("id, client_id, assigned_to, subject, status, last_message_at")
    .single();

  if (threadErr) throw new HttpError(threadErr.message, 500);

  const senderType = profile.role === "client" ? "client" : "team";
  const { error: msgErr } = await supabase.from("conversation_messages").insert({
    thread_id: thread.id,
    sender_id: userId,
    sender_type: senderType,
    body: body.message,
  });
  if (msgErr) throw new HttpError(msgErr.message, 500);

  return {
    id: thread.id,
    clientId: thread.client_id,
    subject: thread.subject,
    status: thread.status,
    assignedTo: thread.assigned_to,
    lastMessageAt: thread.last_message_at,
  };
}

export async function getConversation(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
) {
  const profile = await getProfile(supabase, userId);
  const thread = await loadThread(supabase, threadId);

  if (!(await canAccessThread(supabase, profile, thread))) {
    throw new HttpError("Forbidden", 403);
  }

  const [{ data: client }, assigneeRes, { data: messages }] = await Promise.all([
    supabase.from("clients").select("id, full_name, email").eq("id", thread.client_id).single(),
    thread.assigned_to
      ? supabase.from("profiles").select("id, full_name").eq("id", thread.assigned_to).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("conversation_messages")
      .select("id, sender_id, sender_type, body, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true }),
  ]);
  const assignee = assigneeRes.data;

  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id as string))];
  const { data: senders } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", senderIds.length ? senderIds : ["00000000-0000-0000-0000-000000000000"]);
  const nameById = new Map((senders ?? []).map((s) => [s.id as string, s.full_name as string]));

  return {
    id: thread.id,
    clientId: thread.client_id,
    clientName: client?.full_name ?? "Client",
    clientEmail: client?.email ?? null,
    subject: thread.subject,
    status: thread.status,
    assignedTo: thread.assigned_to,
    assignedToName: assignee?.full_name ?? null,
    lastMessageAt: thread.last_message_at,
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: nameById.get(m.sender_id as string) ?? "User",
      senderType: m.sender_type,
      body: m.body,
      createdAt: m.created_at,
    })),
  };
}

export async function assignConversation(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
  body: AssignConversationBody,
) {
  const profile = await getProfile(supabase, userId);
  const thread = await loadThread(supabase, threadId);

  if (profile.role === "sales") {
    if (thread.assigned_to !== null && thread.assigned_to !== userId) {
      throw new HttpError("Forbidden", 403);
    }
    if (body.assignedTo !== userId) {
      throw new HttpError("Sales can only assign conversations to themselves", 403);
    }
  }

  if (profile.role === "manager") {
    const { data: target, error } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", body.assignedTo)
      .maybeSingle();
    if (error) throw new HttpError(error.message, 500);
    if (!target || (target.role !== "sales" && target.role !== "manager")) {
      throw new HttpError("Assignee must be a team member", 403);
    }
  }

  if (profile.role === "client") {
    throw new HttpError("Forbidden", 403);
  }

  if (!(await canAccessThread(supabase, profile, thread))) {
    throw new HttpError("Forbidden", 403);
  }

  const { data, error } = await supabase
    .from("conversation_threads")
    .update({ assigned_to: body.assignedTo, updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .select("id, assigned_to")
    .single();

  if (error) throw new HttpError(error.message, 500);

  return { id: data.id, assignedTo: data.assigned_to };
}

export async function patchConversationStatus(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
  body: PatchStatusBody,
) {
  const profile = await getProfile(supabase, userId);
  const thread = await loadThread(supabase, threadId);

  if (profile.role === "client") {
    throw new HttpError("Forbidden", 403);
  }

  if (!(await canAccessThread(supabase, profile, thread))) {
    throw new HttpError("Forbidden", 403);
  }

  const { data, error } = await supabase
    .from("conversation_threads")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .select("id, status")
    .single();

  if (error) throw new HttpError(error.message, 500);
  return { id: data.id, status: data.status };
}

export async function markConversationRead(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
) {
  const profile = await getProfile(supabase, userId);
  if (profile.role !== "client") {
    throw new HttpError("Forbidden", 403);
  }

  const thread = await loadThread(supabase, threadId);
  if (!(await canAccessThread(supabase, profile, thread))) {
    throw new HttpError("Forbidden", 403);
  }

  const { data: latestTeam, error: latestErr } = await supabase
    .from("conversation_messages")
    .select("created_at")
    .eq("thread_id", threadId)
    .eq("sender_type", "team")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) throw new HttpError(latestErr.message, 500);

  const lastTeamAt = latestTeam?.created_at as string | undefined;
  const readCursor = thread.client_last_read_at ?? "1970-01-01T00:00:00.000Z";

  if (!lastTeamAt) {
    return { id: thread.id, clientLastReadAt: thread.client_last_read_at };
  }

  if (readCursor >= lastTeamAt) {
    return { id: thread.id, clientLastReadAt: thread.client_last_read_at };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("conversation_threads")
    .update({ client_last_read_at: now })
    .eq("id", threadId)
    .select("id, client_last_read_at")
    .single();

  if (error) throw new HttpError(error.message, 500);

  return {
    id: data.id,
    clientLastReadAt: data.client_last_read_at as string,
  };
}

export async function postMessage(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
  body: PostMessageBody,
) {
  const profile = await getProfile(supabase, userId);
  const thread = await loadThread(supabase, threadId);

  if (!(await canAccessThread(supabase, profile, thread))) {
    throw new HttpError("Forbidden", 403);
  }

  const senderType = profile.role === "client" ? "client" : "team";
  const now = new Date().toISOString();

  const { data: message, error: msgErr } = await supabase
    .from("conversation_messages")
    .insert({
      thread_id: threadId,
      sender_id: userId,
      sender_type: senderType,
      body: body.body,
    })
    .select("id, sender_id, sender_type, body, created_at")
    .single();

  if (msgErr) throw new HttpError(msgErr.message, 500);

  const { error: threadErr } = await supabase
    .from("conversation_threads")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", threadId);

  if (threadErr) throw new HttpError(threadErr.message, 500);

  return {
    id: message.id,
    senderId: message.sender_id,
    senderName: profile.full_name,
    senderType: message.sender_type,
    body: message.body,
    createdAt: message.created_at,
  };
}

export async function listTeamMembers(supabase: SupabaseClient, userId: string) {
  const profile = await getProfile(supabase, userId);
  if (profile.role !== "manager") {
    throw new HttpError("Forbidden", 403);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["sales", "manager"])
    .order("full_name");

  if (error) throw new HttpError(error.message, 500);

  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    role: p.role,
  }));
}
