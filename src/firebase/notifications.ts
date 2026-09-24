import { arrayUnion, arrayRemove, getDocs, updateDoc } from 'firebase/firestore';
import { collections, docRef } from './firestore';
import type { NotificationPreferences, UserProfile } from '../types';

export async function registerPushToken(uid: string, token: string) {
  await updateDoc(docRef('users', uid), { pushTokens: arrayUnion(token) });
}

export async function unregisterPushToken(uid: string, token: string) {
  await updateDoc(docRef('users', uid), { pushTokens: arrayRemove(token) });
}

export async function updateNotificationPreferences(uid: string, prefs: NotificationPreferences) {
  await updateDoc(docRef('users', uid), { notificationPreferences: prefs });
}

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo's own limit per request

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Sends a push notification to every member who has the given category
 * enabled (a missing preference counts as enabled — see UserProfile).
 * Goes straight from the client to Expo's push service: no backend needed,
 * since Expo's endpoint accepts push tokens directly rather than requiring
 * Firebase/APNs/FCM server credentials.
 */
export async function sendCategoryNotification(category: keyof NotificationPreferences, title: string, body: string) {
  const snap = await getDocs(collections.users);
  const tokens = snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => u.notificationPreferences?.[category] !== false)
    .flatMap((u) => u.pushTokens ?? []);

  console.log(`[push] "${category}": ${tokens.length} token(s) opted in`);
  if (tokens.length === 0) return;

  // Without an explicit high priority, FCM can defer delivery until the
  // device is more active — which looks exactly like "works when the app is
  // open, not when it's merely backgrounded".
  const messages = tokens.map((to) => ({ to, title, body, priority: 'high' as const, channelId: 'default' }));
  for (const batch of chunk(messages, CHUNK_SIZE)) {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn('[push] Expo push request failed:', res.status, json);
      continue;
    }
    // Expo returns one ticket per message, in the same order — a ticket can
    // individually report "error" (e.g. DeviceNotRegistered) even when the
    // HTTP request itself succeeded, so this is the only way to see those.
    const tickets: { status: string; message?: string; details?: unknown }[] = json?.data ?? [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === 'error') {
        console.warn('[push] Ticket error for token', batch[i]?.to, ticket.message, ticket.details);
      }
    });
  }
}
