import { createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth, secondaryAuth } from './config';
import { createUserProfile } from './users';
import type { UserProfile } from '../types';

function randomTempPassword() {
  // Never shown to anyone or reused — the invitee sets their own password
  // via the reset email sent below. Just needs to satisfy Firebase's
  // minimum length.
  return `Virgo-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export interface InviteMemberInput {
  name: string;
  email: string;
  roleId: string;
  functie?: string;
}

/**
 * Creates a Firebase Auth account + Firestore profile for a new member, then
 * emails them a link to set their own password. Runs the account-creation
 * step on the secondary (throwaway) auth instance so the admin calling this
 * stays signed in on their own session throughout.
 */
export async function inviteMember(input: InviteMemberInput): Promise<UserProfile> {
  const email = input.email.trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, randomTempPassword());
  const uid = credential.user.uid;

  // Done with the throwaway session immediately — never persisted anyway,
  // but sign out explicitly so it can't linger for the next invite.
  await signOut(secondaryAuth);

  const profile: UserProfile = {
    uid,
    name: input.name.trim(),
    email,
    roleId: input.roleId,
    active: true,
    // Firestore's setDoc rejects any field set to `undefined` — only include
    // functie when it's actually provided, rather than writing it as undefined.
    ...(input.functie ? { functie: input.functie } : {}),
  };
  await createUserProfile(profile);

  // Sent from the admin's own (primary) auth instance — sendPasswordResetEmail
  // only needs the target email, not an active session for that account.
  await sendPasswordResetEmail(auth, email);

  return profile;
}
