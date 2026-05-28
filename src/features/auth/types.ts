export type AppRole = "client" | "sales" | "manager";

export interface MeProfile {
  id: string;
  fullName: string;
  role: AppRole;
  createdAt: string;
}
