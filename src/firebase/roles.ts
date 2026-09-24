import { FieldPath, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { collections, docRef, watchCollection } from './firestore';
import type { Role } from '../types';
import type { PermissionKey } from '../permissions/catalog';

export function watchRoles(onData: (roles: Role[]) => void) {
  return watchCollection<Role>(collections.roles, onData);
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `rol-${Date.now()}`;
}

export async function createRole(name: string, permissions: Partial<Record<PermissionKey, boolean>>) {
  const id = slugify(name);
  const now = Date.now();
  const role: Role = { id, name: name.trim(), builtIn: false, permissions, createdAt: now, updatedAt: now };
  await setDoc(docRef('roles', id), role);
  return role;
}

export async function updateRolePermission(roleId: string, key: PermissionKey, value: boolean) {
  // Every PermissionKey contains a literal dot (e.g. "screens.home"). The
  // object-literal form of updateDoc treats a dotted string key as a nested
  // field PATH ("permissions" -> "screens" -> "home"), not a single flat
  // key named "screens.home" — so this has to use the FieldPath variadic
  // form, where each segment is taken literally, to actually flip
  // permissions["screens.home"] instead of silently writing to a different,
  // nested field that nothing ever reads.
  await updateDoc(docRef('roles', roleId), new FieldPath('permissions', key), value, 'updatedAt', Date.now());
}

export async function renameRole(roleId: string, name: string) {
  await updateDoc(docRef('roles', roleId), { name: name.trim(), updatedAt: Date.now() });
}

export async function deleteRole(roleId: string) {
  await deleteDoc(docRef('roles', roleId));
}
