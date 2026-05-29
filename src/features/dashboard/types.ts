export interface DealsByOwnerRow {
  ownerId: string | null;
  ownerName: string;
  count: number;
}

export interface RecentActivityItem {
  id: string;
  kind: "deal_stage" | "conversation_message";
  description: string;
  createdAt: string;
}

export interface DashboardData {
  openChats: number;
  unassignedConversations: number;
  activeDeals: number;
  wonDeals: number;
  conversationsByStatus: Record<string, number>;
  dealsByStage: Record<string, number>;
  dealsByOwner: DealsByOwnerRow[];
  recentActivity: RecentActivityItem[];
}
