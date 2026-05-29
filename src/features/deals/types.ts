import type { DealStage } from "./constants";

export interface DealListItem {
  id: string;
  clientId: string;
  clientName: string;
  ownerId: string | null;
  ownerName: string | null;
  title: string;
  stage: DealStage | string;
  valueAmount: number | null;
  valueCurrency: string | null;
  expectedIntake: string | null;
  updatedAt: string;
}

export interface DealNote {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
}

export interface DealStageHistoryEntry {
  id: string;
  fromStage: string | null;
  toStage: string;
  createdAt: string;
  changedByName: string;
}

export interface DealDetail extends DealListItem {
  clientEmail: string | null;
  lostReason: string | null;
  createdAt: string;
  notes: DealNote[];
  stageHistory: DealStageHistoryEntry[];
}

export interface CreateDealInput {
  clientId: string;
  title: string;
  ownerId?: string;
  expectedIntake?: string;
  valueAmount?: number;
  valueCurrency?: string;
}
