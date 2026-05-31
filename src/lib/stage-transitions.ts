import type { DealStage } from "@/features/deals/constants";
import { DEAL_STAGES } from "@/features/deals/constants";

/** Allowed next stages from each stage (plus always `lost`). */
const NEXT_FROM: Partial<Record<DealStage, DealStage[]>> = {
  new_lead: ["contacted", "lost"],
  contacted: ["consultation_booked", "lost"],
  consultation_booked: ["documents_requested", "lost"],
  documents_requested: ["application_started", "lost"],
  application_started: ["submitted", "lost"],
  submitted: ["won", "lost"],
  won: [],
  lost: ["new_lead"],
};

export function allowedNextStages(current: string): DealStage[] {
  const key = current as DealStage;
  const next = NEXT_FROM[key];
  if (!next || next.length === 0) {
    return DEAL_STAGES.filter((s) => s === current || s === "lost");
  }
  const set = new Set<DealStage>([key, ...next, "lost"]);
  return DEAL_STAGES.filter((s) => set.has(s));
}
