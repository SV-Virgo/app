import { addDoc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { collections, docRef, orderBy, query, watchCollection } from './firestore';
import type { AgendaEvent, AgendaRsvp, RsvpValue } from '../types';

export function watchAgendaEvents(onData: (events: AgendaEvent[]) => void) {
  const q = query(collections.agendaEvents, orderBy('date', 'asc'));
  return watchCollection<AgendaEvent>(q, onData);
}

export async function createAgendaEvent(event: Omit<AgendaEvent, 'id'>) {
  await addDoc(collections.agendaEvents, event);
}

export async function updateAgendaEvent(id: string, event: Partial<AgendaEvent>) {
  await updateDoc(docRef('agendaEvents', id), event);
}

export async function deleteAgendaEvent(id: string) {
  await deleteDoc(docRef('agendaEvents', id));
}

// One listener for every RSVP across every event, rather than one query per
// event — AgendaScreen derives both the per-event counts/names and the
// signed-in member's own value from this single list.
export function watchAllAgendaRsvps(onData: (rsvps: AgendaRsvp[]) => void) {
  return watchCollection<AgendaRsvp>(collections.agendaRsvps, onData);
}

export async function setAgendaRsvp(eventId: string, uid: string, memberName: string, value: RsvpValue) {
  const id = `${eventId}_${uid}`;
  await setDoc(docRef('agendaRsvps', id), { id, eventId, uid, memberName, value });
}
