import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthState, login as firebaseLogin, logout as firebaseLogout } from '../firebase/auth';
import { watchUserProfile } from '../firebase/users';
import { watchRoles } from '../firebase/roles';
import type { Role, UserProfile } from '../types';
import type { PermissionKey } from '../permissions/catalog';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  role: Role | null;
  roles: Role[];
  loading: boolean;
  hasPermission: (key: PermissionKey) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => subscribeToAuthState((user) => {
    setFirebaseUser(user);
    setAuthLoading(false);
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      setRoles([]);
      setRolesLoading(true);
    }
  }), []);

  useEffect(() => {
    if (!firebaseUser) return;
    setProfileLoading(true);
    return watchUserProfile(firebaseUser.uid, (p) => {
      setProfile(p);
      setProfileLoading(false);
    });
  }, [firebaseUser]);

  useEffect(() => {
    // roles requires an authenticated read (see firestore.rules) — fetching
    // it before login would error forever and never clear rolesLoading,
    // which would keep the whole app stuck on the loading screen.
    if (!firebaseUser) return;
    setRolesLoading(true);
    return watchRoles((r) => {
      setRoles(r);
      setRolesLoading(false);
    });
  }, [firebaseUser]);

  const role = useMemo(
    () => roles.find((r) => r.id === profile?.roleId) ?? null,
    [roles, profile],
  );

  const hasPermission = useMemo(
    () => (key: PermissionKey) => role?.permissions?.[key] === true,
    [role],
  );

  const value: AuthContextValue = {
    firebaseUser,
    profile,
    role,
    roles,
    loading: authLoading || (!!firebaseUser && (profileLoading || rolesLoading)),
    hasPermission,
    login: async (email, password) => {
      await firebaseLogin(email, password);
    },
    logout: async () => {
      await firebaseLogout();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
