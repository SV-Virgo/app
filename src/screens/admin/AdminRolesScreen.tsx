import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { watchRoles, createRole, updateRolePermission, renameRole, deleteRole } from '../../firebase/roles';
import { watchAllUsers } from '../../firebase/users';
import type { Role, UserProfile } from '../../types';
import { PERMISSIONS, PERMISSION_GROUPS } from '../../permissions/catalog';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { PermissionToggle } from '../../components/PermissionToggle';
import { colors, fontFamily, fontSize, radius, surface, text } from '../../theme/tokens';

export function AdminRolesScreen() {
  const navigation = useNavigation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => watchRoles(setRoles), []);
  useEffect(() => watchAllUsers(setUsers), []);

  const selected = useMemo(() => roles.find((r) => r.id === selectedId) ?? null, [roles, selectedId]);
  const memberCount = (roleId: string) => users.filter((u) => u.roleId === roleId).length;

  async function handleCreate() {
    if (!newRoleName.trim()) return;
    const base = Object.fromEntries(PERMISSIONS.map((p) => [p.key, false]));
    const role = await createRole(newRoleName, base);
    setNewRoleName('');
    setCreating(false);
    setSelectedId(role.id);
  }

  function handleDelete(role: Role) {
    const count = memberCount(role.id);
    Alert.alert(
      `${role.name} verwijderen?`,
      count > 0 ? `${count} lid/leden heeft/hebben deze rol nog. Wijs ze eerst een andere rol toe.` : 'Dit kan niet ongedaan worden gemaakt.',
      count > 0
        ? [{ text: 'OK' }]
        : [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Verwijderen', style: 'destructive', onPress: () => { deleteRole(role.id); setSelectedId(null); } },
          ],
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.close}>Sluiten</Text></Pressable>
        <Text style={styles.headerTitle}>Rollen beheren</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.roleList}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {roles.map((role) => (
            <Pressable
              key={role.id}
              onPress={() => setSelectedId(role.id)}
              style={[styles.roleChip, selectedId === role.id && styles.roleChipActive]}
            >
              <Text style={[styles.roleChipLabel, selectedId === role.id && styles.roleChipLabelActive]}>{role.name}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setCreating((v) => !v)} style={styles.addRoleChip}>
            <Text style={styles.addRoleChipLabel}>+ Nieuwe rol</Text>
          </Pressable>
        </ScrollView>
      </View>

      {creating && (
        <Card style={{ marginHorizontal: 20, marginTop: 12, padding: 14, gap: 10 }}>
          <TextInput
            value={newRoleName}
            onChangeText={setNewRoleName}
            placeholder="Naam van de rol, bijv. Hoofd Soos"
            placeholderTextColor={colors.ink300}
            style={styles.input}
          />
          <Button onPress={handleCreate} disabled={!newRoleName.trim()}>Rol aanmaken</Button>
        </Card>
      )}

      {!selected && !creating && (
        <Text style={styles.hint}>Kies een rol hierboven om de permissies per scherm en functie aan te passen.</Text>
      )}

      {selected && (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.selectedHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName}>{selected.name}</Text>
              <Text style={styles.selectedMeta}>
                {memberCount(selected.id)} lid/leden{selected.builtIn ? ' · ingebouwde rol' : ''}
              </Text>
            </View>
            {!selected.builtIn && (
              <Pressable onPress={() => handleDelete(selected)}>
                <Text style={styles.delete}>Verwijderen</Text>
              </Pressable>
            )}
          </View>

          {PERMISSION_GROUPS.map((group) => {
            const items = PERMISSIONS.filter((p) => p.group === group);
            return (
              <View key={group}>
                <Text style={styles.groupLabel}>{group}</Text>
                <Card style={{ marginHorizontal: 20, marginBottom: 16, overflow: 'hidden' }} noShadow>
                  {items.map((p) => (
                    <PermissionToggle
                      key={p.key}
                      label={p.label}
                      description={p.description}
                      value={selected.permissions?.[p.key] === true}
                      onChange={(v) => updateRolePermission(selected.id, p.key, v)}
                    />
                  ))}
                </Card>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  close: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: colors.blue600 },
  headerTitle: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: text.heading },
  roleList: { paddingBottom: 8 },
  roleChip: { borderWidth: 1.5, borderColor: colors.ink150, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  roleChipActive: { backgroundColor: surface.brand, borderColor: surface.brand },
  roleChipLabel: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: text.body },
  roleChipLabelActive: { color: text.onBrand },
  addRoleChip: { borderWidth: 1.5, borderColor: colors.ink300, borderStyle: 'dashed', borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  addRoleChipLabel: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: text.muted },
  input: { borderWidth: 1.5, borderColor: colors.ink300, borderRadius: radius.sm, padding: 10, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  hint: { padding: 20, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted, textAlign: 'center' },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  selectedName: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: text.heading },
  selectedMeta: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted },
  delete: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm, color: colors.error },
  groupLabel: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: colors.blue700, paddingHorizontal: 20, paddingBottom: 8 },
});
