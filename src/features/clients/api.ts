import { apiFetch } from "@/lib/apiClient";
import type { ClientDetail, ClientListItem, CreateClientInput } from "./types";

export async function fetchClients(q?: string): Promise<ClientListItem[]> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  const res = await apiFetch(`/api/clients${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `GET /api/clients failed: ${res.status}`);
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchClient(clientId: string): Promise<ClientDetail> {
  const res = await apiFetch(`/api/clients/${clientId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { error?: string }).error ?? `GET /api/clients/${clientId} failed`,
      res.status,
    );
  }
  return res.json();
}

export async function createClient(input: CreateClientInput): Promise<ClientListItem> {
  const res = await apiFetch("/api/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `POST /api/clients failed: ${res.status}`);
  }
  return res.json();
}
