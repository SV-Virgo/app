import { addDoc, deleteDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './config';
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

export async function unpublishPlanningWeek(weekId: string) {
  await updateDoc(docRef('planningWeeks', weekId), { published: false });
}

export function watchSlotsForWeek(weekId: string, onData: (slots: PlanningSlot[]) => void) {
  const q = query(collections.planningSlots, where('weekId', '==', weekId));
  return watchCollection<PlanningSlot>(q, onData);
}

export async function addPlanningSlot(slot: Omit<PlanningSlot, 'id'>) {
  await addDoc(collections.planningSlots, slot);
}

// Cascades to any assignments on this slot — otherwise a removed slot leaves
// its assignment docs orphaned (unresolvable slotId), which is what made
// MemberSection's "Jij staat ingepland" fall back to the bare "Dienst" label
// instead of a real day/time. Preferences are left alone: they're keyed to
// the member who submitted them and aren't shown anywhere once their slot
// is gone, so there's nothing user-visible to clean up there.
export async function removePlanningSlot(id: string) {
  const assignmentsSnap = await getDocs(query(collections.assignments, where('slotId', '==', id)));
  const batch = writeBatch(db);
  assignmentsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(docRef('planningSlots', id));
  await batch.commit();
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
