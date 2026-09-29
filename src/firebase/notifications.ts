import { arrayUnion, arrayRemove, getDocs, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { collections, docRef } from './firestore';
import { functions } from './config';
import type { NotificationPreferences, UserProfile } from '../types';

// The token this device registered for the signed-in member, remembered so
// logout can detach it again (see unregisterThisDevice).
let registeredToken: { uid: string; token: string } | null = null;

export async function registerPushToken(uid: string, token: string) {
  await updateDoc(docRef('users', uid), { pushTokens: arrayUnion(token) });
  registeredToken = { uid, token };
  // Detach the token from any other account that was used on this device
  // before (see claimPushToken in functions/index.js). Best-effort: a failure
  // here only means possible duplicate pushes, not a broken login.
  try {
    await httpsCallable<{ token: string }, { removed: number }>(functions, 'claimPushToken')({ token });
  } catch (err) {
    console.warn('claimPushToken failed:', err);
  }
}

// Called on logout, while still signed in (the rules need request.auth to
// edit the profile), so this device stops getting the old account's pushes.
export async function unregisterThisDevice() {
  if (!registeredToken) return;
  const { uid, token } = registeredToken;
  registeredToken = null;
  try {
    await unregisterPushToken(uid, token);
  } catch (err) {
    console.warn('unregisterPushToken failed:', err);
  }
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
  // One device can still be listed on two profiles (e.g. an old build without
  // claimPushToken) — never push the same message to it twice.
  const uniqueTokens = [...new Set(tokens)];

  console.log(`[push] "${category}": ${uniqueTokens.length} token(s) opted in`);
  if (uniqueTokens.length === 0) return;

  // Without an explicit high priority, FCM can defer delivery until the
  // device is more active — which looks exactly like "works when the app is
  // open, not when it's merely backgrounded".
  const messages = uniqueTokens.map((to) => ({ to, title, body, priority: 'high' as const, channelId: 'default' }));
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
