import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  type Query,
  type CollectionReference,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './config';

export const collections = {
  roles: collection(db, 'roles'),
  users: collection(db, 'users'),
  feed: collection(db, 'feed'),
  rooms: collection(db, 'rooms'),
  bookings: collection(db, 'bookings'),
  planningWeeks: collection(db, 'planningWeeks'),
  planningSlots: collection(db, 'planningSlots'),
  preferences: collection(db, 'preferences'),
  assignments: collection(db, 'assignments'),
  priceCategories: collection(db, 'priceCategories'),
  agendaEvents: collection(db, 'agendaEvents'),
};

/** Subscribes to a query/collection and maps each snapshot to typed docs (id included). */
export function watchCollection<T>(
  ref: CollectionReference<DocumentData> | Query<DocumentData>,
  onData: (items: T[]) => void,
  onError?: (err: unknown) => void,
) {
  return onSnapshot(
    ref,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
    onError,
  );
}

export function docRef(collectionName: keyof typeof collections, id: string) {
  return doc(db, collectionName, id);
}

export { query, orderBy, where };
