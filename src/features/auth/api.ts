import { apiFetch } from "@/lib/apiClient";
import type { MeProfile } from "./types";

export async function fetchMe(): Promise<MeProfile | null> {
  const res = await apiFetch("/api/me");
  if (res.status === 401) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `GET /api/me failed: ${res.status}`);
  }
  const data = await res.json();
  return {
    id: data.id,
    fullName: data.fullName ?? data.full_name ?? "User",
    role: data.role,
    createdAt: data.createdAt ?? data.created_at ?? "",
  };
}
