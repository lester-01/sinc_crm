import { apiFetch } from "@/lib/apiClient";
import type { CreateDealInput, DealDetail, DealListItem } from "./types";
import type { DealStage } from "./constants";

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

export async function fetchDeals(params?: {
  stage?: string;
  ownerId?: string;
  clientId?: string;
  q?: string;
}): Promise<DealListItem[]> {
  const search = new URLSearchParams();
  if (params?.stage) search.set("stage", params.stage);
  if (params?.ownerId) search.set("ownerId", params.ownerId);
  if (params?.clientId) search.set("clientId", params.clientId);
  if (params?.q?.trim()) search.set("q", params.q.trim());
  const qs = search.toString();
  const res = await apiFetch(`/api/deals${qs ? `?${qs}` : ""}`);
  if (!res.ok) await parseError(res, "Failed to load deals");
  return res.json();
}

export async function fetchDeal(dealId: string): Promise<DealDetail> {
  const res = await apiFetch(`/api/deals/${dealId}`);
  if (!res.ok) await parseError(res, "Failed to load deal");
  return res.json();
}

export async function createDeal(input: CreateDealInput): Promise<DealListItem> {
  const res = await apiFetch("/api/deals", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res, "Failed to create deal");
  return res.json();
}

export async function patchDealStage(
  dealId: string,
  stage: DealStage,
  lostReason?: string,
): Promise<void> {
  const res = await apiFetch(`/api/deals/${dealId}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage, ...(lostReason ? { lostReason } : {}) }),
  });
  if (!res.ok) await parseError(res, "Failed to update stage");
}

export async function patchDealOwner(dealId: string, ownerId: string): Promise<void> {
  const res = await apiFetch(`/api/deals/${dealId}/owner`, {
    method: "PATCH",
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) await parseError(res, "Failed to reassign owner");
}

export async function postDealNote(dealId: string, body: string): Promise<void> {
  const res = await apiFetch(`/api/deals/${dealId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  if (!res.ok) await parseError(res, "Failed to add note");
}
