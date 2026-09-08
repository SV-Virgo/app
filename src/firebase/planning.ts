import { addDoc, deleteDoc, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { collections, docRef, watchCollection } from './firestore';
import type { Assignment, PlanningSlot, PlanningWeek, Preference, PreferenceValue } from '../types';

export function watchPlanningWeeks(onData: (weeks: PlanningWeek[]) => void) {
  return watchCollection<PlanningWeek>(collections.planningWeeks, onData);
}

export async function ensurePlanningWeek(week: PlanningWeek) {
  await setDoc(docRef('planningWeeks', week.id), week, { merge: true });
}

export async function publishPlanningWeek(weekId: string) {
  await updateDoc(docRef('planningWeeks', weekId), { published: true, publishedAt: Date.now() });
}

export function watchSlotsForWeek(weekId: string, onData: (slots: PlanningSlot[]) => void) {
  const q = query(collections.planningSlots, where('weekId', '==', weekId));
  return watchCollection<PlanningSlot>(q, onData);
}

export async function addPlanningSlot(slot: Omit<PlanningSlot, 'id'>) {
  await addDoc(collections.planningSlots, slot);
}

export function watchPreferencesForWeek(weekId: string, onData: (prefs: Preference[]) => void) {
  const q = query(collections.preferences, where('weekId', '==', weekId));
  return watchCollection<Preference>(q, onData);
}

export async function setPreference(slotId: string, weekId: string, uid: string, memberName: string, value: PreferenceValue) {
  const id = `${slotId}_${uid}`;
  await setDoc(docRef('preferences', id), { id, slotId, weekId, uid, memberName, value });
}

export function watchAssignmentsForWeek(weekId: string, onData: (a: Assignment[]) => void) {
  const q = query(collections.assignments, where('weekId', '==', weekId));
  return watchCollection<Assignment>(q, onData);
}

export async function assignMemberToSlot(assignment: Omit<Assignment, 'id'>) {
  await addDoc(collections.assignments, assignment);
}

export async function removeAssignment(assignmentId: string) {
  await deleteDoc(docRef('assignments', assignmentId));
}
