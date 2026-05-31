import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "../types";
import type { CreateClientBody } from "../schemas/clients";

type ProfileRow = { id: string; role: AppRole; full_name: string };

type ClientRow = {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  target_country: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HttpStatus = 403 | 404 | 409 | 500;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: HttpStatus,
  ) {
    super(message);
  }
}

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

function mapClient(row: ClientRow, activeDealTitle: string | null = null) {
  return {
    id: row.id,
    profileId: row.profile_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    targetCountry: row.target_country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activeDealTitle,
  };
}

async function activeDealTitlesByClientId(
  supabase: SupabaseClient,
  clientIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (clientIds.length === 0) return map;

  const { data, error } = await supabase
    .from("deals")
    .select("client_id, title, stage, updated_at")
    .in("client_id", clientIds)
    .neq("stage", "lost")
    .order("updated_at", { ascending: false });

  if (error) throw new HttpError(error.message, 500);

  for (const deal of data ?? []) {
    if (!map.has(deal.client_id)) {
      map.set(deal.client_id, deal.title as string);
    }
  }
  return map;
}

export async function listClients(
  supabase: SupabaseClient,
  userId: string,
  opts: { q?: string; ownerId?: string; filter?: "mine" | "unassigned" | "all" },
) {
  const profile = await getProfile(supabase, userId);

  let query = supabase
    .from("clients")
    .select(
      "id, profile_id, full_name, email, phone, country, target_country, created_by, created_at, updated_at",
    )
    .order("full_name", { ascending: true });

  if (profile.role === "client") {
    query = query.eq("profile_id", userId);
  }

  if (opts.q?.trim()) {
    const term = `%${opts.q.trim()}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
  }

  const { data: rows, error } = await query;
  if (error) throw new HttpError(error.message, 500);

  let clients = (rows ?? []) as ClientRow[];

  if (profile.role === "sales" && opts.filter === "mine" && opts.ownerId) {
    const { data: dealRows, error: dealErr } = await supabase
      .from("deals")
      .select("client_id")
      .eq("owner_id", opts.ownerId);
    if (dealErr) throw new HttpError(dealErr.message, 500);
    const allowed = new Set((dealRows ?? []).map((d) => d.client_id as string));
    clients = clients.filter((c) => allowed.has(c.id));
  } else if (profile.role === "sales" && opts.filter === "unassigned") {
    const { data: dealRows, error: dealErr } = await supabase
      .from("deals")
      .select("client_id, owner_id");
    if (dealErr) throw new HttpError(dealErr.message, 500);
    const withOwner = new Set(
      (dealRows ?? []).filter((d) => d.owner_id).map((d) => d.client_id as string),
    );
    clients = clients.filter((c) => !withOwner.has(c.id));
  } else if (opts.ownerId && profile.role !== "client") {
    const { data: dealRows, error: dealErr } = await supabase
      .from("deals")
      .select("client_id")
      .eq("owner_id", opts.ownerId);
    if (dealErr) throw new HttpError(dealErr.message, 500);
    const allowed = new Set((dealRows ?? []).map((d) => d.client_id as string));
    clients = clients.filter((c) => allowed.has(c.id));
  }

  const dealMap = await activeDealTitlesByClientId(
    supabase,
    clients.map((c) => c.id),
  );

  return clients.map((c) => mapClient(c, dealMap.get(c.id) ?? null));
}

export async function createClient(
  supabase: SupabaseClient,
  userId: string,
  body: CreateClientBody,
) {
  const profile = await getProfile(supabase, userId);
  if (profile.role !== "sales") {
    throw new HttpError("Forbidden", 403);
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      full_name: body.fullName,
      email: body.email.toLowerCase(),
      phone: body.phone ?? null,
      country: body.country ?? null,
      target_country: body.targetCountry ?? null,
      created_by: userId,
      profile_id: null,
    })
    .select(
      "id, profile_id, full_name, email, phone, country, target_country, created_by, created_at, updated_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new HttpError("Client with this email already exists", 409);
    }
    throw new HttpError(error.message, 500);
  }

  return mapClient(data as ClientRow, null);
}

export async function getClientDetail(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
) {
  const profile = await getProfile(supabase, userId);

  const { data: row, error } = await supabase
    .from("clients")
    .select(
      "id, profile_id, full_name, email, phone, country, target_country, created_by, created_at, updated_at",
    )
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw new HttpError(error.message, 500);
  if (!row) throw new HttpError("Client not found", 404);

  const client = row as ClientRow;

  if (profile.role === "client" && client.profile_id !== userId) {
    throw new HttpError("Forbidden", 403);
  }

  const [{ data: conversations }, { data: deals }] = await Promise.all([
    supabase
      .from("conversation_threads")
      .select("id, subject, status, last_message_at")
      .eq("client_id", clientId)
      .order("last_message_at", { ascending: false }),
    supabase
      .from("deals")
      .select("id, title, stage, value_amount, value_currency, owner_id, updated_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false }),
  ]);

  const dealList = deals ?? [];
  const dealIds = dealList.map((d) => d.id as string);
  const dealTitleById = new Map(dealList.map((d) => [d.id as string, d.title as string]));

  let history: { deal_id: string; from_stage: string | null; to_stage: string; created_at: string }[] =
    [];
  let notes: { deal_id: string; body: string; created_at: string }[] = [];

  if (dealIds.length > 0) {
    const [histRes, notesRes] = await Promise.all([
      supabase
        .from("deal_stage_history")
        .select("deal_id, from_stage, to_stage, created_at")
        .in("deal_id", dealIds)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("deal_notes")
        .select("deal_id, body, created_at")
        .in("deal_id", dealIds)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (histRes.error) throw new HttpError(histRes.error.message, 500);
    if (notesRes.error) throw new HttpError(notesRes.error.message, 500);
    history = histRes.data ?? [];
    notes = notesRes.data ?? [];
  }

  const dealMap = await activeDealTitlesByClientId(supabase, [clientId]);

  const activity: { type: string; description: string; createdAt: string }[] = [];

  for (const h of history) {
    const dealTitle = dealTitleById.get(h.deal_id) ?? "Deal";
    activity.push({
      type: "stage_change",
      description: `${dealTitle}: ${h.from_stage ?? "—"} → ${h.to_stage}`,
      createdAt: h.created_at,
    });
  }
  for (const n of notes) {
    const dealTitle = dealTitleById.get(n.deal_id) ?? "Deal";
    activity.push({
      type: "note",
      description: `Note on ${dealTitle}: ${n.body.slice(0, 80)}`,
      createdAt: n.created_at,
    });
  }

  activity.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    ...mapClient(client, dealMap.get(clientId) ?? null),
    conversations: (conversations ?? []).map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      lastMessageAt: t.last_message_at,
    })),
    deals: (deals ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      valueAmount: d.value_amount,
      valueCurrency: d.value_currency,
      ownerId: d.owner_id,
      updatedAt: d.updated_at,
    })),
    activity: activity.slice(0, 15),
  };
}
