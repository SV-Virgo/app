import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { watchAllUsers } from '../firebase/users';
import { watchRoles } from '../firebase/roles';
import type { Role, UserProfile } from '../types';
import { Card } from '../components/Card';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { colors, fontFamily, fontSize, radius, surface, text, tracking } from '../theme/tokens';

// Read-only member directory — every signed-in member can see this (users
// are already readable by anyone signed in, see firestore.rules), unlike
// AdminMembersScreen which also edits roles/commissies/lid sinds and is
// gated behind members.manage.
export function LedenScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => watchAllUsers(setUsers), []);
  useEffect(() => watchRoles(setRoles), []);

  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  // One group per role (alphabetical by role name), plus a trailing "Geen
  // rol" group for anyone whose roleId doesn't match a role doc — same
  // fallback AdminMembersScreen uses for an unresolved role. A role with no
  // matching members (after search) is skipped entirely.
  const groups = [...roles]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((role) => ({ roleName: role.name, members: filtered.filter((u) => u.roleId === role.id) }))
    .concat([{ roleName: 'Geen rol', members: filtered.filter((u) => !roles.find((r) => r.id === u.roleId)) }])
    .filter((g) => g.members.length > 0)
    .map((g) => ({ ...g, members: [...g.members].sort((a, b) => a.name.localeCompare(b.name)) }));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.close}>Sluiten</Text></Pressable>
        <Text style={styles.headerTitle}>Leden</Text>
        <View style={{ width: 50 }} />
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Zoek een lid…"
        placeholderTextColor={colors.ink300}
        style={styles.search}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {groups.map((group) => (
          <View key={group.roleName}>
            <Text style={styles.sectionLabel}>{group.roleName}</Text>
            <Card style={{ marginHorizontal: 20, marginBottom: 16, overflow: 'hidden' }} noShadow>
              {group.members.map((u, idx) => {
                const initials = u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <View key={u.uid} style={[styles.row, idx < group.members.length - 1 && styles.rowBorder]}>
                    <InitialsAvatar initials={initials} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{u.name}</Text>
                      {u.functie ? <Text style={styles.subline}>{u.functie}</Text> : null}
                    </View>
                    {u.memberSince ? (
                      <View style={styles.sincePill}>
                        <Text style={styles.sincePillLabel}>Lid sinds {u.memberSince}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </Card>
          </View>
        ))}
        {groups.length === 0 && (
          <Text style={{ paddingHorizontal: 20, fontFamily: fontFamily.body, color: text.muted }}>Geen leden gevonden.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  close: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: colors.blue600 },
  headerTitle: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: text.heading },
  search: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.ink300,
    borderRadius: radius.sm,
    padding: 10,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.body,
    backgroundColor: surface.card,
  },
  sectionLabel: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: tracking.wide,
    color: colors.blue700,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  rowBorder: { borderBottomWidth: 1.5, borderBottomColor: colors.ink150 },
  name: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading },
  subline: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted },
  sincePill: { backgroundColor: surface.brandTint, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  sincePillLabel: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: colors.blue700 },
});
