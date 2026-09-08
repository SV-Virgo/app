import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { collections, docRef, watchCollection } from './firestore';
import type { UserProfile } from '../types';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(docRef('users', uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null;
}

export function watchUserProfile(uid: string, onData: (u: UserProfile | null) => void) {
  return watchCollection<UserProfile>(collections.users, (users) => {
    onData(users.find((u) => u.uid === uid) ?? null);
  });
}

export function watchAllUsers(onData: (users: UserProfile[]) => void) {
  return watchCollection<UserProfile>(collections.users, onData);
}

export async function createUserProfile(profile: UserProfile) {
  await setDoc(docRef('users', profile.uid), profile);
}

export async function updateUserRole(uid: string, roleId: string) {
  await updateDoc(docRef('users', uid), { roleId });
}
