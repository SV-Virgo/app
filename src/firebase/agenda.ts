import { addDoc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { collections, docRef, orderBy, query, watchCollection } from './firestore';
import type { AgendaEvent } from '../types';

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
