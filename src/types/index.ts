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
  // Committee names this member is allowed to post the hoofdfeed under
  // (e.g. "Activiteitencommissie") — independent of their permission role,
  // since posting-as-a-committee isn't a role, it's a per-person grant a
  // Bestuur member hands out from Leden beheren. Someone with more than one
  // entry picks which one to post as at compose time.
  committeeIdentities?: string[];
  avatarUrl?: string;
  active: boolean;
  // Expo push tokens for every device this member is logged in on — an
  // array since the same account can be signed in on more than one phone.
  pushTokens?: string[];
  // A category missing from this map is treated as ON — this is an opt-out
  // model, not opt-in, so older profiles that predate a given category keep
  // getting notified rather than silently missing out.
  notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  announcement: boolean; // a pinned hoofdfeed post goes up
  mainFeed: boolean; // any other hoofdfeed post goes up
  custom: boolean; // Bestuur sends a one-off message
  soosOpen: boolean; // Sooscommissie signals the Soos is open
}

export type FeedType = 'leden' | 'hoofd';

export interface FeedPost {
  id: string;
  feedType: FeedType;
  authorUid: string;
  authorName: string; // the real person, always kept for moderation/audit
  authorInitials: string;
  displayName: string; // what's actually shown: authorName on leden feed, "Bestuur"/a committee name on hoofdfeed
  title?: string; // hoofdfeed posts only
  body: string;
  photoUrl?: string;
  pinned?: boolean; // hoofdfeed "aankondigingen" section
  commentsEnabled: boolean; // always true for leden feed; chosen per-post on hoofdfeed
  deleted: boolean; // soft-delete — body/title are left alone, UI shows a tombstone instead
  createdAt: number;
  editedAt?: number;
}

export interface FeedComment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorInitials: string;
  body: string;
  createdAt: number;
  editedAt?: number;
}

export interface FeedReaction {
  id: string; // `${postId}_${uid}` — one reaction slot per member per post
  postId: string;
  uid: string;
  emoji: string;
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
  capacity?: number; // how many people this shift needs — undefined treated as 2
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

export interface SoosOpeningHours {
  day: string; // "Dinsdag"
  time: string; // "21:00 – 01:00 · open borrel"
}

export interface SoosInfo {
  hours: SoosOpeningHours[];
  note: string;
}

export interface AgendaEvent {
  id: string;
  day: string;
  month: string;
  time?: string; // "20:00" — optional since not every event needs a start time shown
  title: string;
  location: string;
  tag: string;
  date: number; // start timestamp, for sorting and the calendar tile
  endDate?: number; // only set for multi-day activities — end timestamp (inclusive)
  rsvpEnabled?: boolean; // undefined treated as true — events created before this field existed already have real RSVPs
}

export type RsvpValue = 'komt' | 'twijfel' | 'kan_niet';

export interface AgendaRsvp {
  id: string; // `${eventId}_${uid}`
  eventId: string;
  uid: string;
  memberName: string;
  value: RsvpValue;
}

export type RegistrationQuestionType = 'text' | 'choice' | 'yesno';

export interface RegistrationQuestion {
  id: string;
  type: RegistrationQuestionType;
  label: string;
  required: boolean;
  options?: string[]; // only used for 'choice'
}

// One per event, doc id == eventId — an activity has at most one form, added
// after the activity itself already exists (never at creation time).
export interface RegistrationForm {
  id: string; // == eventId
  eventId: string;
  questions: RegistrationQuestion[]; // custom questions, in addition to the NAW fields every submission always collects
  price?: string; // "€12,50" — empty/undefined means the activity is free, so no payment step is shown
  // 2+ splits `price` into this many termijnen, each paid as its own SumUp
  // checkout on the member's own schedule — omitted/1 means pay in one go.
  installments?: number;
  createdAt: number;
  updatedAt: number;
}

// The NAW (Naam, Adres, Woonplaats) fields every registration collects,
// regardless of what custom questions the organizer added.
export interface RegistrationNaw {
  name: string;
  address: string;
  postalCode: string;
  city: string;
}

export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'failed';

// One termijn of a split payment — see RegistrationForm.installments.
export interface RegistrationInstallment {
  amount: string; // "€16,67" — this termijn's share of the submission's total amount
  paymentStatus: PaymentStatus;
  checkoutId?: string; // SumUp checkout id for this termijn specifically
}

export interface RegistrationSubmission {
  id: string; // `${eventId}_${uid}` — one signup per member per event
  eventId: string;
  uid: string;
  naw: RegistrationNaw;
  answers: Record<string, string>; // questionId -> answer text (yesno stored as "Ja"/"Nee", choice as the chosen option)
  amount?: string; // total amount, copied from the form's price at signup time, so a later price change doesn't rewrite past submissions
  // The overall status: 'paid' only once every termijn (or the single
  // payment, when there are no installments) is paid. Only ever set by the
  // SumUp Cloud Function after it verifies payment server-side — never
  // trust a client write of this field.
  paymentStatus: PaymentStatus;
  checkoutId?: string; // SumUp checkout id — only used when there are no installments (single payment)
  // Present only when the form had installments > 1 at signup time — split
  // of `amount` into termijnen the member pays individually, in whatever
  // order/pace they choose. Cascade-search key for the SumUp webhook is
  // installmentCheckoutIds (see functions/index.js), kept in sync with the
  // checkoutId on each entry here.
  installments?: RegistrationInstallment[];
  installmentCheckoutIds?: string[];
  createdAt: number;
}
