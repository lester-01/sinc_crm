import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "../types";
import type {
  CreateDealBody,
  PatchOwnerBody,
  PatchStageBody,
  PostNoteBody,
} from "../schemas/deals";
import { HttpError } from "./clientsService";

type ProfileRow = { id: string; role: AppRole; full_name: string };

type DealRow = {
  id: string;
  client_id: string;
  owner_id: string | null;
  title: string;
  stage: string;
  value_amount: number | null;
  value_currency: string | null;
  expected_intake: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
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

async function loadDeal(supabase: SupabaseClient, dealId: string): Promise<DealRow> {
  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, client_id, owner_id, title, stage, value_amount, value_currency, expected_intake, lost_reason, created_at, updated_at",
    )
    .eq("id", dealId)
    .maybeSingle();
  if (error) throw new HttpError(error.message, 500);
  if (!data) throw new HttpError("Deal not found", 404);
  return data as DealRow;
}

async function canAccessDeal(
  supabase: SupabaseClient,
  profile: ProfileRow,
  deal: DealRow,
): Promise<boolean> {
  if (profile.role === "manager" || profile.role === "sales") return true;
  if (profile.role === "client") {
    const clientId = await getClientIdForUser(supabase, profile.id);
    return clientId !== null && deal.client_id === clientId;
  }
  return false;
}

function assertCanUpdateStage(profile: ProfileRow, deal: DealRow, userId: string) {
  if (profile.role === "manager") return;
  if (profile.role === "sales") {
    if (deal.owner_id !== userId) {
      throw new HttpError("Sales can only update deals they own", 403);
    }
    return;
  }
  throw new HttpError("Forbidden", 403);
}

function mapDealListItem(
  row: DealRow & {
    clients?: { full_name: string } | { full_name: string }[] | null;
  },
  ownerNames: Map<string, string>,
) {
  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: client?.full_name ?? "Client",
    ownerId: row.owner_id,
    ownerName: row.owner_id ? (ownerNames.get(row.owner_id) ?? null) : null,
    title: row.title,
    stage: row.stage,
    valueAmount: row.value_amount,
    valueCurrency: row.value_currency,
    expectedIntake: row.expected_intake,
    updatedAt: row.updated_at,
  };
}

export async function listDeals(
  supabase: SupabaseClient,
  userId: string,
  filters: { stage?: string; ownerId?: string; clientId?: string; q?: string },
) {
  const profile = await getProfile(supabase, userId);

  let query = supabase
    .from("deals")
    .select(
      "id, client_id, owner_id, title, stage, value_amount, value_currency, expected_intake, lost_reason, created_at, updated_at, clients(full_name)",
    )
    .order("updated_at", { ascending: false });

  if (profile.role === "client") {
    const clientId = await getClientIdForUser(supabase, userId);
    if (!clientId) return [];
    query = query.eq("client_id", clientId);
  }

  if (filters.stage) query = query.eq("stage", filters.stage);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    query = query.or(`title.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new HttpError(error.message, 500);

  const rows = (data ?? []) as (DealRow & {
    clients?: { full_name: string } | { full_name: string }[] | null;
  })[];

  const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter(Boolean))] as string[];
  const ownerNames = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ownerIds);
    for (const p of profiles ?? []) {
      ownerNames.set(p.id as string, p.full_name as string);
    }
  }

  return rows.map((r) => mapDealListItem(r, ownerNames));
}

export async function createDeal(
  supabase: SupabaseClient,
  userId: string,
  body: CreateDealBody,
) {
  const profile = await getProfile(supabase, userId);
  if (profile.role === "client" || profile.role === "manager") {
    throw new HttpError("Forbidden", 403);
  }

  const ownerId = body.ownerId ?? userId;

  if (ownerId !== userId) {
    throw new HttpError("Sales can only create deals owned by themselves", 403);
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      client_id: body.clientId,
      owner_id: ownerId,
      title: body.title,
      stage: "new_lead",
      value_amount: body.valueAmount ?? null,
      value_currency: body.valueCurrency ?? "USD",
      expected_intake: body.expectedIntake ?? null,
    })
    .select("id, client_id, owner_id, title, stage, updated_at")
    .single();

  if (error) throw new HttpError(error.message, 500);

  const { error: histErr } = await supabase.from("deal_stage_history").insert({
    deal_id: deal.id,
    from_stage: null,
    to_stage: "new_lead",
    changed_by: userId,
  });
  if (histErr) throw new HttpError(histErr.message, 500);

  return {
    id: deal.id,
    clientId: deal.client_id,
    ownerId: deal.owner_id,
    title: deal.title,
    stage: deal.stage,
    updatedAt: deal.updated_at,
  };
}

export async function getDealDetail(
  supabase: SupabaseClient,
  userId: string,
  dealId: string,
) {
  const profile = await getProfile(supabase, userId);
  const deal = await loadDeal(supabase, dealId);

  if (!(await canAccessDeal(supabase, profile, deal))) {
    throw new HttpError("Forbidden", 403);
  }

  const [{ data: client }, ownerRes, { data: notes }, { data: history }] =
    await Promise.all([
      supabase.from("clients").select("id, full_name, email").eq("id", deal.client_id).single(),
      deal.owner_id
        ? supabase.from("profiles").select("id, full_name").eq("id", deal.owner_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("deal_notes")
        .select("id, body, created_at, author_id")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false }),
      supabase
        .from("deal_stage_history")
        .select("id, from_stage, to_stage, created_at, changed_by")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false }),
    ]);

  const authorIds = [...new Set((notes ?? []).map((n) => n.author_id as string))];
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
  const authorNames = new Map((authors ?? []).map((a) => [a.id as string, a.full_name as string]));

  const changerIds = [...new Set((history ?? []).map((h) => h.changed_by as string))];
  const { data: changers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", changerIds.length ? changerIds : ["00000000-0000-0000-0000-000000000000"]);
  const changerNames = new Map((changers ?? []).map((c) => [c.id as string, c.full_name as string]));

  return {
    id: deal.id,
    clientId: deal.client_id,
    clientName: client?.full_name ?? "Client",
    clientEmail: client?.email ?? null,
    ownerId: deal.owner_id,
    ownerName: ownerRes.data?.full_name ?? null,
    title: deal.title,
    stage: deal.stage,
    valueAmount: deal.value_amount,
    valueCurrency: deal.value_currency,
    expectedIntake: deal.expected_intake,
    lostReason: deal.lost_reason,
    createdAt: deal.created_at,
    updatedAt: deal.updated_at,
    notes: (notes ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.created_at,
      authorName: authorNames.get(n.author_id as string) ?? "User",
    })),
    stageHistory: (history ?? []).map((h) => ({
      id: h.id,
      fromStage: h.from_stage,
      toStage: h.to_stage,
      createdAt: h.created_at,
      changedByName: changerNames.get(h.changed_by as string) ?? "User",
    })),
  };
}

export async function patchDealStage(
  supabase: SupabaseClient,
  userId: string,
  dealId: string,
  body: PatchStageBody,
) {
  const profile = await getProfile(supabase, userId);
  const deal = await loadDeal(supabase, dealId);

  if (!(await canAccessDeal(supabase, profile, deal))) {
    throw new HttpError("Forbidden", 403);
  }

  assertCanUpdateStage(profile, deal, userId);

  const fromStage = deal.stage;
  const now = new Date().toISOString();

  const { error: histErr } = await supabase.from("deal_stage_history").insert({
    deal_id: dealId,
    from_stage: fromStage,
    to_stage: body.stage,
    changed_by: userId,
  });
  if (histErr) throw new HttpError(histErr.message, 500);

  const { data, error } = await supabase
    .from("deals")
    .update({
      stage: body.stage,
      lost_reason: body.stage === "lost" ? (body.lostReason ?? null) : null,
      updated_at: now,
    })
    .eq("id", dealId)
    .select("id, stage, lost_reason, updated_at")
    .single();

  if (error) throw new HttpError(error.message, 500);

  return {
    id: data.id,
    stage: data.stage,
    lostReason: data.lost_reason,
    updatedAt: data.updated_at,
  };
}

export async function patchDealOwner(
  supabase: SupabaseClient,
  userId: string,
  dealId: string,
  body: PatchOwnerBody,
) {
  const profile = await getProfile(supabase, userId);
  if (profile.role !== "manager") {
    throw new HttpError("Forbidden", 403);
  }

  const deal = await loadDeal(supabase, dealId);

  const { data: target, error: targetErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", body.ownerId)
    .maybeSingle();
  if (targetErr) throw new HttpError(targetErr.message, 500);
  if (!target || target.role !== "sales") {
    throw new HttpError("Owner must be a sales rep", 403);
  }

  const { data, error } = await supabase
    .from("deals")
    .update({ owner_id: body.ownerId, updated_at: new Date().toISOString() })
    .eq("id", dealId)
    .select("id, owner_id")
    .single();

  if (error) throw new HttpError(error.message, 500);

  return { id: data.id, ownerId: data.owner_id };
}

export async function postDealNote(
  supabase: SupabaseClient,
  userId: string,
  dealId: string,
  body: PostNoteBody,
) {
  const profile = await getProfile(supabase, userId);
  if (profile.role !== "sales") {
    throw new HttpError("Forbidden", 403);
  }

  const deal = await loadDeal(supabase, dealId);
  if (!(await canAccessDeal(supabase, profile, deal))) {
    throw new HttpError("Forbidden", 403);
  }

  const { data, error } = await supabase
    .from("deal_notes")
    .insert({
      deal_id: dealId,
      author_id: userId,
      body: body.body,
    })
    .select("id, body, created_at")
    .single();

  if (error) throw new HttpError(error.message, 500);

  return {
    id: data.id,
    body: data.body,
    createdAt: data.created_at,
    authorName: profile.full_name,
  };
}
