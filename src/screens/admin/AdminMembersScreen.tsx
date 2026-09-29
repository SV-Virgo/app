import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { watchAllUsers, updateUserRole, updateCommitteeIdentities, updateMemberSince, deleteMember } from '../../firebase/users';
import { useAuth } from '../../state/AuthContext';
import { confirmDestructive } from '../../utils/confirm';
import { watchRoles } from '../../firebase/roles';
import { inviteMember } from '../../firebase/invite';
import type { Role, UserProfile } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { InitialsAvatar } from '../../components/InitialsAvatar';
import { colors, fontFamily, fontSize, radius, surface, text } from '../../theme/tokens';

// inviteMember's HttpsErrors already carry a Dutch message for the cases a
// member can act on (duplicate/invalid email, mail failure).
function inviteErrorMessage(err: unknown): string {
  const { code = '', message = '' } = (err as { code?: string; message?: string }) ?? {};
  // Unhandled server errors arrive as code functions/internal with the bare
  // message "internal" — only show messages the function wrote itself.
  if (code.startsWith('functions/') && message && message.toLowerCase() !== 'internal') return message;
  return 'Uitnodigen is mislukt. Probeer het nog eens.';
}

export function AdminMembersScreen() {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);
  const [committeeDraftFor, setCommitteeDraftFor] = useState<string | null>(null);
  const [committeeDraft, setCommitteeDraft] = useState('');
  const [memberSinceDraftFor, setMemberSinceDraftFor] = useState<string | null>(null);
  const [memberSinceDraft, setMemberSinceDraft] = useState('');

  const [inviting, setInviting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => watchAllUsers(setUsers), []);
  useEffect(() => watchRoles(setRoles), []);
  useEffect(() => {
    if (!inviteRoleId && roles.length > 0) {
      setInviteRoleId(roles.find((r) => r.id === 'lid')?.id ?? roles[0].id);
    }
  }, [roles, inviteRoleId]);

  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  // Blank/invalid input just reverts the draft to whatever's actually saved
  // (there's no "clear" — memberSince is a plain required number, no way
  // to write "unset" back to it).
  async function saveMemberSince(uid: string, value: string) {
    const trimmed = value.trim();
    const year = Number(trimmed);
    if (trimmed && Number.isInteger(year) && year >= 1900 && year <= 2100) {
      await updateMemberSince(uid, year);
    }
    setMemberSinceDraftFor(null);
  }

  function handleDeleteMember(member: UserProfile) {
    confirmDestructive(
      `${member.name} verwijderen?`,
      async () => {
        setDeletingUid(member.uid);
        try {
          await deleteMember(member.uid);
          setOpenPickerFor(null);
        } catch (err) {
          console.error('deleteMember failed:', err);
          const message = (err as { message?: string })?.message;
          Alert.alert('Verwijderen mislukt', message && message.toLowerCase() !== 'internal' ? message : 'Probeer het nog eens.');
        } finally {
          setDeletingUid(null);
        }
      },
      { message: 'Het account wordt verwijderd en kan niet meer inloggen. Aanmeldingen, betalingen en reserveringen blijven bewaard.' },
    );
  }

  async function handleInvite() {
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteRoleId) return;
    setSubmitting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await inviteMember({ name: inviteName, email: inviteEmail, roleId: inviteRoleId });
      setInviteSuccess(
        `${inviteName.trim()} heeft een e-mail gekregen met een wachtwoord om in te loggen met ${inviteEmail.trim()}.`,
      );
      setInviteName('');
      setInviteEmail('');
    } catch (err) {
      // Alert.alert is unreliable on web (react-native-web), so surface
      // errors inline instead — and always log the real error for debugging.
      console.error('inviteMember failed:', err);
      setInviteError(inviteErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

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

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        {!inviting ? (
          <Button
            variant="secondary"
            onPress={() => {
              setInviting(true);
              setInviteError(null);
              setInviteSuccess(null);
            }}
          >
            + Lid uitnodigen
          </Button>
        ) : (
          <Card style={{ padding: 14, gap: 10 }}>
            <TextInput
              value={inviteName}
              onChangeText={setInviteName}
              placeholder="Naam"
              placeholderTextColor={colors.ink300}
              style={styles.inviteInput}
            />
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="E-mailadres"
              placeholderTextColor={colors.ink300}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.inviteInput}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {roles.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => setInviteRoleId(r.id)}
                  style={[styles.roleChoiceChip, inviteRoleId === r.id && styles.roleChoiceChipActive]}
                >
                  <Text style={[styles.roleChoiceLabel, inviteRoleId === r.id && styles.roleChoiceLabelActive]}>{r.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.inviteHint}>
              Er wordt direct een account aangemaakt en een e-mail gestuurd met een tijdelijk wachtwoord. Bij de eerste keer inloggen kiest dit lid een eigen wachtwoord.
            </Text>
            {inviteError && <Text style={styles.inviteErrorText}>{inviteError}</Text>}
            {inviteSuccess && <Text style={styles.inviteSuccessText}>{inviteSuccess}</Text>}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                variant="secondary"
                onPress={() => {
                  setInviting(false);
                  setInviteError(null);
                  setInviteSuccess(null);
                }}
                style={{ flex: 1 }}
                disabled={submitting}
              >
                Sluiten
              </Button>
              <Button onPress={handleInvite} style={{ flex: 1 }} disabled={submitting || !inviteName.trim() || !inviteEmail.trim()}>
                {submitting ? 'Bezig…' : 'Uitnodigen'}
              </Button>
            </View>
            {submitting && <ActivityIndicator color={colors.blue600} />}
          </Card>
        )}
      </View>

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
                    <Text style={styles.pickerSectionLabel}>Rol</Text>
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

                    <Text style={styles.pickerSectionLabel}>Commissies (mag posten als)</Text>
                    <View style={styles.committeeChips}>
                      {(u.committeeIdentities ?? []).map((c) => (
                        <View key={c} style={styles.chip}>
                          <Text style={styles.chipText}>{c}</Text>
                          <Pressable
                            onPress={() =>
                              confirmDestructive(`${c} bij ${u.name} verwijderen?`, () =>
                                updateCommitteeIdentities(u.uid, (u.committeeIdentities ?? []).filter((x) => x !== c)),
                              )
                            }
                          >
                            <Text style={styles.chipText}>×</Text>
                          </Pressable>
                        </View>
                      ))}
                      <TextInput
                        value={committeeDraftFor === u.uid ? committeeDraft : ''}
                        onChangeText={(v) => {
                          setCommitteeDraftFor(u.uid);
                          setCommitteeDraft(v);
                        }}
                        onSubmitEditing={() => {
                          const name = committeeDraft.trim();
                          if (name) updateCommitteeIdentities(u.uid, [...(u.committeeIdentities ?? []), name]);
                          setCommitteeDraft('');
                        }}
                        placeholder="+ Commissie toevoegen"
                        placeholderTextColor={colors.ink300}
                        style={styles.committeeInput}
                      />
                    </View>

                    <Text style={styles.pickerSectionLabel}>Lid sinds</Text>
                    <TextInput
                      value={memberSinceDraftFor === u.uid ? memberSinceDraft : u.memberSince ? String(u.memberSince) : ''}
                      onChangeText={(v) => {
                        setMemberSinceDraftFor(u.uid);
                        setMemberSinceDraft(v.replace(/[^0-9]/g, '').slice(0, 4));
                      }}
                      onBlur={() => {
                        if (memberSinceDraftFor === u.uid) saveMemberSince(u.uid, memberSinceDraft);
                      }}
                      placeholder="Bijv. 2021"
                      placeholderTextColor={colors.ink300}
                      keyboardType="number-pad"
                      style={styles.yearInput}
                    />

                    {u.uid !== profile?.uid && (
                      <Button
                        variant="danger"
                        onPress={() => handleDeleteMember(u)}
                        disabled={deletingUid === u.uid}
                        style={{ marginTop: 16 }}
                      >
                        {deletingUid === u.uid ? 'Bezig…' : 'Lid verwijderen'}
                      </Button>
                    )}
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
  pickerSectionLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: text.muted,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 4,
  },
  committeeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 24, paddingBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.blue100, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10 },
  chipText: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: colors.blue700 },
  committeeInput: {
    borderWidth: 1.5,
    borderColor: colors.ink300,
    borderStyle: 'dashed',
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: text.body,
    minWidth: 140,
  },
  yearInput: {
    marginHorizontal: 24,
    marginBottom: 10,
    alignSelf: 'flex-start',
    minWidth: 90,
    borderWidth: 1.5,
    borderColor: colors.ink150,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.body,
  },
  inviteInput: {
    borderWidth: 1.5,
    borderColor: colors.ink150,
    borderRadius: radius.sm,
    padding: 10,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.body,
  },
  roleChoiceChip: { borderWidth: 1.5, borderColor: colors.ink150, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  roleChoiceChipActive: { backgroundColor: surface.brand, borderColor: surface.brand },
  roleChoiceLabel: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: text.body },
  roleChoiceLabelActive: { color: text.onBrand },
  inviteHint: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted, lineHeight: 17 },
  inviteErrorText: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: colors.error },
  inviteSuccessText: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: colors.success },
});
