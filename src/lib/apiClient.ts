import { supabase } from "./supabaseClient";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  "",
);

export function getApiBaseUrl(): string {
  return apiBase ?? "http://localhost:8787";
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { ...init, headers });
}
