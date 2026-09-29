import { addDoc, deleteDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Timestamp } from 'firebase/firestore';
import { collections, docRef, orderBy, query, watchCollection } from './firestore';
import type { PriceCategory, SoosInfo, SoosStatus } from '../types';

export function watchPriceCategories(onData: (categories: PriceCategory[]) => void) {
  const q = query(collections.priceCategories, orderBy('order', 'asc'));
  return watchCollection<PriceCategory>(q, onData);
}

export async function savePriceCategory(category: PriceCategory) {
  await setDoc(docRef('priceCategories', category.id), category);
}

export async function deletePriceCategory(categoryId: string) {
  await deleteDoc(docRef('priceCategories', categoryId));
}

const SOOS_INFO_ID = 'main';

// Singleton doc (there's only one Soos) — watched directly rather than
// through watchCollection, which expects a list of docs.
export function watchSoosInfo(onData: (info: SoosInfo | null) => void) {
  return onSnapshot(docRef('soosInfo', SOOS_INFO_ID), (snap) => onData(snap.exists() ? (snap.data() as SoosInfo) : null));
}

export async function saveSoosInfo(info: SoosInfo) {
  await setDoc(docRef('soosInfo', SOOS_INFO_ID), info);
}

const SOOS_STATUS_ID = 'current';

// Minimum time between two open/gesloten announcements — also enforced in
// firestore.rules, so keep the two in sync.
export const SOOS_STATUS_LOCK_MS = 2 * 60 * 60 * 1000;

export function watchSoosStatus(onData: (status: SoosStatus | null) => void) {
  return onSnapshot(docRef('soosStatus', SOOS_STATUS_ID), (snap) => {
    const data = snap.data({ serverTimestamps: 'estimate' });
    if (!data) return onData(null);
    onData({ open: data.open, changedAt: (data.changedAt as Timestamp).toMillis(), changedByName: data.changedByName });
  });
}

// Written *before* the push goes out, so it doubles as the lock: if two
// people press at once, the rules reject the second write and only one
// notification is sent.
export async function setSoosStatus(open: boolean, changedByName: string) {
  await setDoc(docRef('soosStatus', SOOS_STATUS_ID), { open, changedAt: serverTimestamp(), changedByName });
}
