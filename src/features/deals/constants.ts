export const DEAL_STAGES = [
  "new_lead",
  "contacted",
  "consultation_booked",
  "documents_requested",
  "application_started",
  "submitted",
  "won",
  "lost",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ");
}
