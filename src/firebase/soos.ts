import { addDoc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { collections, docRef, orderBy, query, watchCollection } from './firestore';
import type { PriceCategory } from '../types';

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
