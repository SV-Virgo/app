import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../state/AuthContext';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { colors, fontFamily, fontSize, radius, shadow, surface, text } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function ProfielScreen() {
  const { profile, role, hasPermission, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!profile) return null;
  const initials = profile.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <InitialsAvatar initials={initials} size={84} />
        <Text style={styles.name}>{profile.name}</Text>
        {profile.functie ? <Text style={styles.functie}>{profile.functie}</Text> : null}
        <Badge tone="brand">{profile.active ? 'Actief lid' : role?.name ?? 'Lid'}</Badge>
      </View>

      <View style={styles.statsRow}>
        <Card style={[styles.statCard, shadow.sm]}>
          <Text style={styles.statValue}>{profile.memberSince ?? '—'}</Text>
          <Text style={styles.statLabel}>Lid sinds</Text>
        </Card>
        <Card style={[styles.statCard, shadow.sm]}>
          <Text style={styles.statValue}>{profile.committees?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Commissies</Text>
        </Card>
      </View>

      <Card style={{ marginHorizontal: 20, overflow: 'hidden' }} noShadow>
        <SettingsRow label="Rol" value={role?.name} />
        <SettingsRow label="Mijn commissies" />
        {hasPermission('screens.adminRoles') && (
          <SettingsRow label="Rollen beheren" onPress={() => navigation.navigate('AdminRoles')} />
        )}
        {hasPermission('screens.adminMembers') && (
          <SettingsRow label="Leden beheren" onPress={() => navigation.navigate('AdminMembers')} last />
        )}
        {!hasPermission('screens.adminRoles') && !hasPermission('screens.adminMembers') && (
          <SettingsRow label="Privacy & voorwaarden" last />
        )}
      </Card>

      <Pressable style={styles.logout} onPress={() => logout()}>
        <Text style={styles.logoutLabel}>Uitloggen</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function SettingsRow({ label, value, onPress, last }: { label: string; value?: string; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.settingsRow, !last && styles.settingsRowBorder]}>
      <Text style={styles.settingsLabel}>{label}</Text>
      {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  header: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 20,
    backgroundColor: surface.pageAlt,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink150,
  },
  name: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: text.heading },
  functie: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
  statsRow: { flexDirection: 'row', gap: 10, padding: 18, paddingHorizontal: 20 },
  statCard: { flex: 1, alignItems: 'center', padding: 12, gap: 2 },
  statValue: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: text.heading },
  statLabel: { fontFamily: fontFamily.body, fontSize: 11, color: text.muted },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, paddingHorizontal: 16 },
  settingsRowBorder: { borderBottomWidth: 1.5, borderBottomColor: colors.ink150 },
  settingsLabel: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: text.body },
  settingsValue: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
  logout: { padding: 22, alignItems: 'center' },
  logoutLabel: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm, color: colors.error },
});
