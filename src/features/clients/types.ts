export interface ClientListItem {
  id: string;
  profileId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  country: string | null;
  targetCountry: string | null;
  activeDealTitle: string | null;
}

export interface ClientDetail extends ClientListItem {
  conversations: {
    id: string;
    subject: string;
    status: string;
    lastMessageAt: string;
  }[];
  deals: {
    id: string;
    title: string;
    stage: string;
    valueAmount: number | null;
    valueCurrency: string | null;
    ownerId: string | null;
    updatedAt: string;
  }[];
  activity: { type: string; description: string; createdAt: string }[];
}

export interface CreateClientInput {
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  targetCountry?: string;
}
