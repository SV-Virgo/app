import { httpsCallable } from 'firebase/functions';
import { functions } from './config';
import type { UserProfile } from '../types';

export interface InviteMemberInput {
  name: string;
  email: string;
  roleId: string;
  functie?: string;
}

/**
 * Creates the new member's account server-side (see inviteMember in
 * functions/index.js): the Cloud Function generates a password, writes the
 * profile with mustChangePassword, and mails the login details from our
 * own Gmail. Errors come back as HttpsErrors with a Dutch message.
 */
export async function inviteMember(input: InviteMemberInput): Promise<UserProfile> {
  const call = httpsCallable<InviteMemberInput, UserProfile>(functions, 'inviteMember');
  const { data } = await call(input);
  return data;
}
