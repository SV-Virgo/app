import { addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { collections, docRef, watchCollection } from './firestore';
import type { Booking, Room } from '../types';

export function watchRooms(onData: (rooms: Room[]) => void) {
  return watchCollection<Room>(collections.rooms, onData);
}

export function watchBookings(onData: (bookings: Booking[]) => void) {
  return watchCollection<Booking>(collections.bookings, onData);
}

export function watchMyBookings(uid: string, onData: (bookings: Booking[]) => void) {
  const q = query(collections.bookings, where('createdByUid', '==', uid));
  return watchCollection<Booking>(q, onData);
}

export async function createBooking(booking: Omit<Booking, 'id' | 'createdAt'>) {
  await addDoc(collections.bookings, { ...booking, createdAt: Date.now() });
}

export async function cancelBooking(bookingId: string) {
  await deleteDoc(docRef('bookings', bookingId));
}
