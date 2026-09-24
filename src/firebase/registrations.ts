import { deleteDoc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { collections, docRef, watchCollection } from './firestore';
import { splitEuroAmount } from '../utils/money';
import type { RegistrationForm, RegistrationNaw, RegistrationQuestion, RegistrationSubmission } from '../types';

// A form's doc id is always its eventId — one form per activity, so there's
// never a query to run, just a direct doc lookup.
export function watchRegistrationForm(eventId: string, onData: (form: RegistrationForm | null) => void) {
  return onSnapshot(docRef('registrationForms', eventId), (snap) =>
    onData(snap.exists() ? (snap.data() as RegistrationForm) : null),
  );
}

export async function saveRegistrationForm(
  eventId: string,
  questions: RegistrationQuestion[],
  price: string | undefined,
  installments: number | undefined,
) {
  const existing = await getDoc(docRef('registrationForms', eventId));
  const now = Date.now();
  const payload: RegistrationForm = {
    id: eventId,
    eventId,
    questions,
    price: price ?? '',
    ...(price && installments && installments > 1 ? { installments } : {}),
    createdAt: existing.exists() ? (existing.data() as RegistrationForm).createdAt : now,
    updatedAt: now,
  };
  await setDoc(docRef('registrationForms', eventId), payload);
}

export async function deleteRegistrationForm(eventId: string) {
  await deleteDoc(docRef('registrationForms', eventId));
}

// One listener for every event's form, rather than one per event — mirrors
// watchAllAgendaRsvps in agenda.ts. AgendaScreen uses this just to know
// which events have a form at all (to show an "Aanmelden" button).
export function watchAllRegistrationForms(onData: (forms: RegistrationForm[]) => void) {
  return watchCollection<RegistrationForm>(collections.registrationForms, onData);
}

export function watchSubmissionsForEvent(eventId: string, onData: (submissions: RegistrationSubmission[]) => void) {
  const q = query(collections.registrationSubmissions, where('eventId', '==', eventId));
  return watchCollection<RegistrationSubmission>(q, onData);
}

// One listener for all of the signed-in member's own submissions, across
// every event — AgendaScreen uses this to show "Aangemeld" vs "Aanmelden"
// per event without a listener per event.
export function watchMySubmissions(uid: string, onData: (submissions: RegistrationSubmission[]) => void) {
  const q = query(collections.registrationSubmissions, where('uid', '==', uid));
  return watchCollection<RegistrationSubmission>(q, onData);
}

export function watchMySubmission(eventId: string, uid: string, onData: (submission: RegistrationSubmission | null) => void) {
  return onSnapshot(docRef('registrationSubmissions', `${eventId}_${uid}`), (snap) =>
    onData(snap.exists() ? (snap.data() as RegistrationSubmission) : null),
  );
}

export async function submitRegistration(
  eventId: string,
  uid: string,
  naw: RegistrationNaw,
  answers: Record<string, string>,
  amount: string | undefined,
  installmentsCount: number | undefined,
) {
  const id = `${eventId}_${uid}`;
  const installments =
    amount && installmentsCount && installmentsCount > 1
      ? splitEuroAmount(amount, installmentsCount).map((share) => ({ amount: share, paymentStatus: 'pending' as const }))
      : undefined;
  const submission: RegistrationSubmission = {
    id,
    eventId,
    uid,
    naw,
    answers,
    // Always written (never omitted as `undefined`, which Firestore rejects) —
    // an empty string is the "no payment needed" state.
    amount: amount ?? '',
    paymentStatus: amount ? 'pending' : 'not_required',
    ...(installments ? { installments } : {}),
    createdAt: Date.now(),
  };
  await setDoc(docRef('registrationSubmissions', id), submission);
  return submission;
}

export async function deleteSubmission(submissionId: string) {
  await deleteDoc(docRef('registrationSubmissions', submissionId));
}
