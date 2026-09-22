// Shared TypeScript types mirroring backend schemas

export interface User {
  id: string;
  email: string;
  display_name: string;
  couple_id: string | null;
}

export interface Couple {
  id: string;
  invite_code: string;
  members: User[];
}

export interface CalendarEvent {
  id: string;
  couple_id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  color: string;
  start_at: string; // ISO string
  end_at: string;   // ISO string
  created_at: string;
  updated_at: string;
  creator: User | null;
}

export interface EventCreate {
  title: string;
  description?: string;
  location?: string;
  color: string;
  start_at: string;
  end_at: string;
}

export interface EventUpdate {
  title?: string;
  description?: string;
  location?: string;
  color?: string;
  start_at?: string;
  end_at?: string;
}

export type WsMessage =
  | { type: "event_created"; event: CalendarEvent }
  | { type: "event_updated"; event: CalendarEvent }
  | { type: "event_deleted"; event_id: string };
