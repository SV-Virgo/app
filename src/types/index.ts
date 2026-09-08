import type { PermissionKey } from '../permissions/catalog';

export interface Role {
  id: string; // Firestore doc id, e.g. "bestuur"
  name: string; // display name, e.g. "Bestuur"
  builtIn: boolean; // Lid & Bestuur ship with the app and can't be deleted
  permissions: Partial<Record<PermissionKey, boolean>>;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  roleId: string;
  functie?: string; // e.g. "Penningmeester"
  memberSince?: number; // year
  committees?: string[];
  avatarUrl?: string;
  active: boolean;
}

export interface FeedPost {
  id: string;
  authorName: string;
  authorInitials: string;
  badge?: string; // pinned announcement badge, e.g. "Bestuur"
  pinned: boolean;
  title: string;
  body: string;
  photoUrl?: string;
  createdAt: number;
}

export type RoomId = 'bestuurskamer' | 'soos' | 'fysio';

export interface Room {
  id: RoomId;
  name: string;
  meta: string;
  bestuurOnly: boolean;
}

export interface Booking {
  id: string;
  roomId: RoomId;
  roomName: string;
  date: string; // ISO date, e.g. "2026-09-16"
  from: string; // "19:30"
  to: string; // "21:00"
  createdByUid: string;
  createdByName: string;
  linkedMembers: { uid: string; name: string; initials: string }[];
  createdAt: number;
}

export interface PlanningSlot {
  id: string;
  weekId: string; // e.g. "2026-W38"
  day: string; // "Donderdag 18 sep"
  time: string; // "20:30 – 02:00"
  deadline?: number;
}

export type PreferenceValue = 'ja' | 'kan' | 'nee';

export interface Preference {
  id: string; // `${slotId}_${uid}`
  slotId: string;
  weekId: string;
  uid: string;
  memberName: string;
  value: PreferenceValue;
}

export interface Assignment {
  id: string;
  slotId: string;
  weekId: string;
  uid: string;
  memberName: string;
  memberInitials: string;
  role?: string; // "Bar" | "Sluiten" etc.
}

export interface PlanningWeek {
  id: string; // "2026-W38"
  weekNumber: number;
  published: boolean;
  publishedAt?: number;
}

export interface PriceItem {
  name: string;
  price: string; // "€1,25"
}

export interface PriceCategory {
  id: string;
  name: string;
  order: number;
  items: PriceItem[];
}

export interface AgendaEvent {
  id: string;
  day: string;
  month: string;
  title: string;
  location: string;
  tag: string;
  date: number; // timestamp for sorting
}
