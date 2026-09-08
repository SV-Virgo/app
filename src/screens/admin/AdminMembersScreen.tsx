import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { watchAllUsers, updateUserRole } from '../../firebase/users';
import { watchRoles } from '../../firebase/roles';
import type { Role, UserProfile } from '../../types';
import { Card } from '../../components/Card';
import { InitialsAvatar } from '../../components/InitialsAvatar';
import { colors, fontFamily, fontSize, radius, surface, text } from '../../theme/tokens';

export function AdminMembersScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);

  useEffect(() => watchAllUsers(setUsers), []);
  useEffect(() => watchRoles(setRoles), []);

  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.close}>Sluiten</Text></Pressable>
        <Text style={styles.headerTitle}>Leden beheren</Text>
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
        <Card style={{ marginHorizontal: 20, overflow: 'hidden' }} noShadow>
          {filtered.map((u, idx) => {
            const currentRole = roles.find((r) => r.id === u.roleId);
            const initials = u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
            return (
              <View key={u.uid}>
                <View style={[styles.row, idx < filtered.length - 1 && styles.rowBorder]}>
                  <InitialsAvatar initials={initials} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{u.name}</Text>
                    <Text style={styles.email}>{u.email}</Text>
                  </View>
                  <Pressable onPress={() => setOpenPickerFor(openPickerFor === u.uid ? null : u.uid)} style={styles.rolePill}>
                    <Text style={styles.rolePillLabel}>{currentRole?.name ?? 'Geen rol'}</Text>
                  </Pressable>
                </View>
                {openPickerFor === u.uid && (
                  <View style={styles.picker}>
                    {roles.map((r) => (
                      <Pressable
                        key={r.id}
                        onPress={async () => {
                          await updateUserRole(u.uid, r.id);
                          setOpenPickerFor(null);
                        }}
                        style={styles.pickerRow}
                      >
                        <Text style={[styles.pickerLabel, r.id === u.roleId && { color: colors.blue600, fontFamily: fontFamily.bodyBold }]}>
                          {r.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          {filtered.length === 0 && (
            <Text style={{ padding: 16, fontFamily: fontFamily.body, color: text.muted }}>Geen leden gevonden.</Text>
          )}
        </Card>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  rowBorder: { borderBottomWidth: 1.5, borderBottomColor: colors.ink150 },
  name: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading },
  email: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted },
  rolePill: { backgroundColor: surface.brandTint, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  rolePillLabel: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: colors.blue700 },
  picker: { backgroundColor: surface.sunken, paddingVertical: 4 },
  pickerRow: { paddingVertical: 8, paddingHorizontal: 24 },
  pickerLabel: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
});
