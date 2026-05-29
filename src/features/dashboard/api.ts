import { apiFetch } from "@/lib/apiClient";
import type { DashboardData } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await apiFetch("/api/dashboard");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError((err as { error?: string }).error ?? "Failed to load dashboard", res.status);
  }
  return res.json();
}
