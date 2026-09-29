import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  validatePassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { updateDoc } from 'firebase/firestore';
import { auth, functions } from './config';
import { docRef } from './firestore';

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function logout() {
  return firebaseSignOut(auth);
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// "Wachtwoord vergeten" — the Cloud Function generates a new password and
// mails it. Resolves the same way whether or not the address has an
// account, so the UI can't be used to probe for members' emails.
export async function requestPasswordReset(email: string) {
  const call = httpsCallable<{ email: string }, { ok: true }>(functions, 'resetPassword');
  await call({ email: email.trim() });
}

// Re-authenticates first so updatePassword never fails with
// auth/requires-recent-login on a long-lived session, then clears the
// mustChangePassword flag that keeps the app on the change-password screen.
export async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Niet ingelogd.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
  await updateDoc(docRef('users', user.uid), { mustChangePassword: false });
}

// Checks a new password against the project's Firebase Auth password policy
// (configured in the console) and returns what's missing in Dutch, or an
// empty list when it's fine — so the change-password screen can explain the
// rules instead of failing with a generic error.
export async function passwordPolicyProblems(password: string): Promise<string[]> {
  const status = await validatePassword(auth, password);
  if (status.isValid) return [];
  const problems: string[] = [];
  const minLength = status.passwordPolicy.customStrengthOptions.minPasswordLength;
  if (status.meetsMinPasswordLength === false) problems.push(`minstens ${minLength ?? 6} tekens`);
  if (status.containsLowercaseLetter === false) problems.push('een kleine letter');
  if (status.containsUppercaseLetter === false) problems.push('een hoofdletter');
  if (status.containsNumericCharacter === false) problems.push('een cijfer');
  if (status.containsNonAlphanumericCharacter === false) problems.push('een speciaal teken (zoals ! of ?)');
  return problems;
}
