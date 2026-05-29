import type { DealStage } from "@/features/deals/constants";

const STAGE_HEADER: Record<DealStage, string> = {
  new_lead: "border-t-chart-2 bg-chart-2/5",
  contacted: "border-t-primary bg-primary/5",
  consultation_booked: "border-t-chart-4 bg-chart-4/10",
  documents_requested: "border-t-chart-5 bg-chart-5/15",
  application_started: "border-t-chart-3 bg-chart-3/5",
  submitted: "border-t-primary bg-secondary",
  won: "border-t-primary bg-primary/10",
  lost: "border-t-destructive bg-destructive/5",
};

export function stageColumnClass(stage: DealStage): string {
  return STAGE_HEADER[stage] ?? "border-t-border bg-muted/30";
}
