import type { AppRole } from "./types";

export interface NavItem {
  to: string;
  label: string;
}

const allItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/conversations", label: "Conversations" },
  { to: "/pipeline", label: "Pipeline" },
];

export function navItemsForRole(role: AppRole | null | undefined): NavItem[] {
  if (!role) return [];
  if (role === "manager") return allItems;
  if (role === "sales") return allItems.filter((i) => i.to !== "/dashboard");
  return allItems.filter((i) => i.to === "/clients" || i.to === "/conversations");
}

export function defaultPathForRole(role: AppRole): string {
  if (role === "client") return "/conversations";
  if (role === "sales") return "/clients";
  return "/dashboard";
}
