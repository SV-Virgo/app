import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import {
  watchAssignmentsForWeek,
  watchSlotsForWeek,
  watchPreferencesForWeek,
  watchPlanningWeeks,
  setPreference,
  addPlanningSlot,
  assignMemberToSlot,
  removeAssignment,
  ensurePlanningWeek,
  publishPlanningWeek,
} from '../firebase/planning';
import { watchAllUsers } from '../firebase/users';
import type { Assignment, PlanningSlot, PlanningWeek, Preference, PreferenceValue, UserProfile } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { PickerField } from '../components/PickerField';
import { colors, fontFamily, fontSize, radius, surface, text, tracking } from '../theme/tokens';
import { currentWeekId, nextWeekId, weekAfterNextId, weekNumber } from '../utils/week';
import { formatDutchDayLong, formatTimeRange } from '../utils/date';

function setHours(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function PlanningScreen() {
  const { profile, role, hasPermission } = useAuth();
  const canManage = hasPermission('planning.setSlots') || hasPermission('planning.publish') || hasPermission('planning.assignMembers');
  const canSubmitPrefs = hasPermission('planning.submitPreferences');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {(canSubmitPrefs || !canManage) && <MemberSection uid={profile?.uid} name={profile?.name} canSubmit={canSubmitPrefs} />}
        {canManage && <ManagerSection roleName={role?.name} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function MemberSection({ uid, name, canSubmit }: { uid?: string; name?: string; canSubmit: boolean }) {
  const thisWeek = currentWeekId();
  const upcomingWeek = nextWeekId();
  const [myShifts, setMyShifts] = useState<Assignment[]>([]);
  const [thisWeekSlots, setThisWeekSlots] = useState<PlanningSlot[]>([]);
  const [slots, setSlots] = useState<PlanningSlot[]>([]);
  const [myPrefs, setMyPrefs] = useState<Preference[]>([]);

  useEffect(() => watchAssignmentsForWeek(thisWeek, (all) => setMyShifts(all.filter((a) => a.uid === uid))), [thisWeek, uid]);
  useEffect(() => watchSlotsForWeek(thisWeek, setThisWeekSlots), [thisWeek]);
  useEffect(() => watchSlotsForWeek(upcomingWeek, setSlots), [upcomingWeek]);
  useEffect(() => watchPreferencesForWeek(upcomingWeek, (all) => setMyPrefs(all.filter((p) => p.uid === uid))), [upcomingWeek, uid]);

  async function choose(slot: PlanningSlot, value: PreferenceValue) {
    if (!uid || !name) return;
    await setPreference(slot.id, upcomingWeek, uid, name, value);
  }

  return (
    <>
      <ScreenHeader title="Planning" subtitle={`Week ${weekNumber(thisWeek)}`} />
      <Text style={styles.sectionLabel}>Jij staat ingepland</Text>
      <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 22 }}>
        {myShifts.length === 0 && <Text style={styles.mutedText}>Je staat deze week nergens ingepland.</Text>}
        {myShifts.map((s) => {
          const slot = thisWeekSlots.find((sl) => sl.id === s.slotId);
          return (
            <View key={s.id} style={styles.shiftCard}>
              <View style={{ gap: 2 }}>
                <Text style={styles.shiftDay}>{slot?.day ?? 'Dienst'}</Text>
                {slot?.time ? <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: text.onBrand, opacity: 0.9 }}>{slot.time}</Text> : null}
              </View>
              {s.role ? (
                <View style={styles.shiftBadge}>
                  <Text style={styles.shiftBadgeLabel}>{s.role}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {canSubmit && (
        <>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionLabel, { paddingBottom: 0 }]}>Voorkeuren week {weekNumber(upcomingWeek)}</Text>
          </View>
          <Text style={[styles.mutedText, { paddingHorizontal: 20, paddingBottom: 8 }]}>Geef per tijdvak van de Hoofd Soos aan of je kan.</Text>
          <Card style={{ marginHorizontal: 20, overflow: 'hidden' }} noShadow>
            {slots.length === 0 && <Text style={{ padding: 16, color: text.muted, fontFamily: fontFamily.body }}>Nog geen tijdvakken opengezet.</Text>}
            {slots.map((slot) => {
              const mine = myPrefs.find((p) => p.slotId === slot.id)?.value;
              return (
                <View key={slot.id} style={styles.prefRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.roomName}>{slot.day}</Text>
                    <Text style={styles.mutedText}>{slot.time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    <PrefButton label="Ja" active={mine === 'ja'} onPress={() => choose(slot, 'ja')} />
                    <PrefButton label="Kan" active={mine === 'kan'} onPress={() => choose(slot, 'kan')} wide />
                    <PrefButton label="Nee" active={mine === 'nee'} onPress={() => choose(slot, 'nee')} />
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </>
  );
}

function PrefButton({ label, active, onPress, wide }: { label: string; active: boolean; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.prefBtn, { width: wide ? 44 : 34, backgroundColor: active ? surface.brand : 'transparent', borderColor: active ? surface.brand : colors.ink150 }]}>
      <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: active ? text.onBrand : text.muted }}>{label}</Text>
    </Pressable>
  );
}

function ManagerSection({ roleName }: { roleName?: string }) {
  const conceptWeek = nextWeekId();
  const openWeek = weekAfterNextId();
  const [week, setWeek] = useState<PlanningWeek | null>(null);
  const [slots, setSlots] = useState<PlanningSlot[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newSlotDate, setNewSlotDate] = useState(() => new Date());
  const [newSlotFrom, setNewSlotFrom] = useState(() => setHours(new Date(), 20, 30));
  const [newSlotTo, setNewSlotTo] = useState(() => setHours(new Date(), 1, 0));
  const [assigningSlot, setAssigningSlot] = useState<string | null>(null);

  useEffect(() => watchPlanningWeeks((weeks) => setWeek(weeks.find((w) => w.id === conceptWeek) ?? null)), [conceptWeek]);
  useEffect(() => watchSlotsForWeek(conceptWeek, setSlots), [conceptWeek]);
  useEffect(() => watchPreferencesForWeek(conceptWeek, setPreferences), [conceptWeek]);
  useEffect(() => watchAssignmentsForWeek(conceptWeek, setAssignments), [conceptWeek]);
  useEffect(() => watchAllUsers(setAllUsers), []);

  async function addSlotToOpenWeek() {
    await ensurePlanningWeek({ id: openWeek, weekNumber: weekNumber(openWeek), published: false });
    await addPlanningSlot({
      weekId: openWeek,
      day: formatDutchDayLong(newSlotDate),
      time: formatTimeRange(newSlotFrom, newSlotTo),
    });
  }

  async function publish() {
    await ensurePlanningWeek({ id: conceptWeek, weekNumber: weekNumber(conceptWeek), published: false });
    await publishPlanningWeek(conceptWeek);
  }

  return (
    <>
      <View style={styles.rowBetween}>
        <Text style={[styles.sectionLabel, { paddingBottom: 0 }]}>Planning · {roleName}</Text>
        <View style={{ paddingRight: 20 }}>
          <Badge tone="accent">{roleName ?? 'Beheer'}</Badge>
        </View>
      </View>
      <Text style={[styles.mutedText, { paddingHorizontal: 20, paddingBottom: 12 }]}>
        Week {weekNumber(conceptWeek)} · {week?.published ? 'gepubliceerd' : 'concept, nog niet gepubliceerd'}
      </Text>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {slots.map((slot) => {
          const people = assignments.filter((a) => a.slotId === slot.id);
          const openSpots = Math.max(0, 2 - people.length);
          return (
            <Card key={slot.id} style={{ padding: 14, gap: 10 }}>
              <View style={styles.rowBaseline}>
                <Text style={styles.shiftDay}>{slot.day}</Text>
                <Text style={styles.mutedText}>{slot.time}</Text>
              </View>
              {people.map((p) => {
                const pref = preferences.find((pr) => pr.slotId === slot.id && pr.uid === p.uid)?.value;
                return (
                  <View key={p.id} style={styles.personRow}>
                    <InitialsAvatar initials={p.memberInitials} size={28} />
                    <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body }}>{p.memberName}</Text>
                    <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12, color: prefColor(pref) }}>{prefLabel(pref)}</Text>
                    <Pressable onPress={() => removeAssignment(p.id)}>
                      <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.error }}>×</Text>
                    </Pressable>
                  </View>
                );
              })}
              <View style={styles.slotFooter}>
                <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 12, color: text.muted }}>
                  {openSpots > 0 ? `${openSpots} plek${openSpots === 1 ? '' : 'ken'} open` : 'Vol'}
                </Text>
                <Pressable onPress={() => setAssigningSlot(assigningSlot === slot.id ? null : slot.id)}>
                  <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.blue600 }}>+ Toevoegen</Text>
                </Pressable>
              </View>
              {assigningSlot === slot.id && (
                <View style={{ gap: 4, borderTopWidth: 1.5, borderTopColor: colors.ink150, paddingTop: 8 }}>
                  {allUsers.filter((u) => !people.find((p) => p.uid === u.uid)).map((u) => (
                    <Pressable
                      key={u.uid}
                      onPress={async () => {
                        await assignMemberToSlot({
                          slotId: slot.id,
                          weekId: conceptWeek,
                          uid: u.uid,
                          memberName: u.name,
                          memberInitials: u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
                          role: 'Bar',
                        });
                        setAssigningSlot(null);
                      }}
                      style={{ paddingVertical: 6 }}
                    >
                      <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body }}>{u.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>
          );
        })}
      </View>

      <Card style={{ marginHorizontal: 20, marginTop: 16, padding: 14, gap: 6, backgroundColor: surface.brandTint }} noShadow>
        <Text style={{ fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading }}>Tijdvakken openzetten</Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: text.muted }}>
          Zet tijdvakken voor week {weekNumber(openWeek)} open zodat leden voorkeuren kunnen doorgeven.
        </Text>
        <View style={{ marginTop: 6, gap: 10 }}>
          <PickerField label="Datum" mode="date" value={newSlotDate} onChange={setNewSlotDate} minimumDate={new Date()} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PickerField label="Van" mode="time" value={newSlotFrom} onChange={setNewSlotFrom} />
            <PickerField label="Tot" mode="time" value={newSlotTo} onChange={setNewSlotTo} />
          </View>
        </View>
        <Button variant="secondary" onPress={addSlotToOpenWeek}>
          + Tijdvak toevoegen
        </Button>
      </Card>

      <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 8 }}>
        <Button onPress={publish} disabled={week?.published}>
          {week?.published ? 'Al gepubliceerd' : `Planning week ${weekNumber(conceptWeek)} publiceren`}
        </Button>
        <Text style={{ textAlign: 'center', fontFamily: fontFamily.body, fontSize: 12, color: text.muted }}>
          Na publiceren zien alle leden wie er achter de bar staat.
        </Text>
      </View>
    </>
  );
}

function prefLabel(v?: PreferenceValue) {
  if (v === 'ja') return 'Ja';
  if (v === 'kan') return 'Kan';
  if (v === 'nee') return 'Nee';
  return 'Nog geen reactie';
}
function prefColor(v?: PreferenceValue) {
  if (v === 'ja') return colors.success;
  if (v === 'nee') return colors.error;
  return text.muted;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  sectionLabel: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: tracking.wide,
    color: colors.blue700,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  rowBaseline: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  mutedText: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted },
  shiftCard: { backgroundColor: surface.brand, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftDay: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.base, color: text.heading },
  shiftBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10 },
  shiftBadgeLabel: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: text.onBrand },
  roomName: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1.5, borderBottomColor: colors.ink150 },
  prefBtn: { height: 30, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1.5, borderTopColor: colors.ink150, paddingTop: 10 },
});
