export type ConversationQueue = "unassigned" | "mine" | "all";

export interface ConversationListItem {
  id: string;
  clientId: string;
  clientName: string;
  subject: string;
  status: string;
  assignedTo: string | null;
  assignedToName: string | null;
  lastMessageAt: string;
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: "client" | "team";
  body: string;
  createdAt: string;
}

export interface ConversationDetail extends ConversationListItem {
  clientEmail: string | null;
  messages: ConversationMessage[];
}

export interface CreateConversationInput {
  clientId: string;
  subject: string;
  message: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  role: string;
}
