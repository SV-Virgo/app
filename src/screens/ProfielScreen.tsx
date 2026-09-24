import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../state/AuthContext';
import { updateNotificationPreferences } from '../firebase/notifications';
import type { NotificationPreferences } from '../types';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { PermissionToggle } from '../components/PermissionToggle';
import { colors, fontFamily, fontSize, radius, shadow, surface, text, tracking } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

const NOTIFICATION_OPTIONS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'announcement', label: 'Aankondigingen', description: 'Als er een nieuwe aankondiging wordt geplaatst' },
  { key: 'mainFeed', label: 'Hoofdfeed', description: 'Als er een nieuwe update wordt geplaatst' },
  { key: 'custom', label: 'Losse meldingen', description: 'Losse meldingen die het bestuur stuurt' },
  { key: 'soosOpen', label: 'Soos is open', description: 'Als de Sooscommissie meldt dat de Soos open is' },
];

export function ProfielScreen() {
  const { profile, role, hasPermission, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!profile) return null;
  const initials = profile.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  // A missing preference counts as ON — see UserProfile.notificationPreferences.
  function isEnabled(key: keyof NotificationPreferences) {
    return profile!.notificationPreferences?.[key] !== false;
  }

  async function togglePreference(key: keyof NotificationPreferences, value: boolean) {
    const current: NotificationPreferences = {
      announcement: isEnabled('announcement'),
      mainFeed: isEnabled('mainFeed'),
      custom: isEnabled('custom'),
      soosOpen: isEnabled('soosOpen'),
      ...{ [key]: value },
    };
    await updateNotificationPreferences(profile!.uid, current);
  }

  // Agenda beheren lives on the Agenda tab itself (contextual to that
  // screen) rather than here — these are the admin actions with no more
  // natural home than the profile/settings list.
  const adminRows = [
    hasPermission('screens.adminRoles') && { label: 'Rollen beheren', onPress: () => navigation.navigate('AdminRoles') },
    hasPermission('screens.adminMembers') && { label: 'Leden beheren', onPress: () => navigation.navigate('AdminMembers') },
    hasPermission('notifications.sendCustom') && { label: 'Melding versturen', onPress: () => navigation.navigate('AdminNotifications') },
  ].filter((row): row is { label: string; onPress: () => void } => !!row);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
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
            <Text style={styles.statValue}>{profile.committeeIdentities?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Commissies</Text>
          </Card>
        </View>

        <Card style={{ marginHorizontal: 20, marginBottom: 16, overflow: 'hidden' }} noShadow>
          <SettingsRow label="Rol" value={role?.name} />
          <SettingsRow label="Leden" onPress={() => navigation.navigate('Leden')} />
          {adminRows.map((row) => (
            <SettingsRow key={row.label} label={row.label} onPress={row.onPress} />
          ))}
          <SettingsRow label="Privacy & voorwaarden" onPress={() => Linking.openURL('https://sv-virgo.nl/privacy-beleid')} last />
        </Card>

        <Text style={styles.sectionLabel}>Meldingen</Text>
        <Card style={{ marginHorizontal: 20, overflow: 'hidden' }} noShadow>
          {NOTIFICATION_OPTIONS.map((opt) => (
            <PermissionToggle
              key={opt.key}
              label={opt.label}
              description={opt.description}
              value={isEnabled(opt.key)}
              onChange={(v) => togglePreference(opt.key, v)}
            />
          ))}
        </Card>

        <Pressable style={styles.logout} onPress={() => logout()}>
          <Text style={styles.logoutLabel}>Uitloggen</Text>
        </Pressable>
      </ScrollView>
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
  sectionLabel: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: tracking.wide,
    color: colors.blue700,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  logout: { padding: 22, alignItems: 'center' },
  logoutLabel: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm, color: colors.error },
});
