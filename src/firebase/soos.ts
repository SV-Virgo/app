import { addDoc, deleteDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { collections, docRef, orderBy, query, watchCollection } from './firestore';
import type { PriceCategory, SoosInfo } from '../types';

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
