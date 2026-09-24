import React, { useEffect, useMemo, useState } from 'react';
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
  unpublishPlanningWeek,
  removePlanningSlot,
} from '../firebase/planning';
import { watchAllUsers } from '../firebase/users';
import { watchRoles } from '../firebase/roles';
import type { Assignment, PlanningSlot, PlanningWeek, Preference, PreferenceValue, Role, UserProfile } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { PickerField } from '../components/PickerField';
import { colors, fontFamily, fontSize, radius, surface, text, tracking } from '../theme/tokens';
import { currentWeekId, mondayOfWeekWithOffset, sundayOfWeekWithOffset, weekIdWithOffset, weekNumber } from '../utils/week';
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
  const [allWeeks, setAllWeeks] = useState<PlanningWeek[]>([]);
  const [myShifts, setMyShifts] = useState<Assignment[]>([]);
  const [thisWeekSlots, setThisWeekSlots] = useState<PlanningSlot[]>([]);
  const [slots, setSlots] = useState<PlanningSlot[]>([]);
  const [myPrefs, setMyPrefs] = useState<Preference[]>([]);

  // How far ahead of this week the member is browsing to give preferences —
  // 1 (next week) by default, same convention as the manager's own
  // week navigator below. Open-ended rather than indexing into whichever
  // weeks happen to already have a PlanningWeek doc, so a member can look
  // (and give preferences) further ahead than whatever the Hoofd Soos has
  // explicitly opened so far — a week with no tijdvakken yet just shows the
  // "Nog geen tijdvakken opengezet" empty state below.
  const [weekOffset, setWeekOffset] = useState(1);
  const [shiftsIndex, setShiftsIndex] = useState<number | null>(null);

  useEffect(() => watchPlanningWeeks(setAllWeeks), []);

  const upcomingWeek = weekIdWithOffset(weekOffset);
  const upcomingWeekPublished = allWeeks.find((w) => w.id === upcomingWeek)?.published ?? false;

  // Every week that has ever had planning activity, so "Jij staat ingepland"
  // isn't stuck showing only today's week — a member might be assigned a
  // shift in a week that's already been planned ahead, or want to check a
  // week they already worked.
  const knownWeeks = useMemo(() => [...allWeeks].sort((a, b) => a.id.localeCompare(b.id)), [allWeeks]);
  const defaultShiftsIndex = useMemo(() => {
    const idx = knownWeeks.findIndex((w) => w.id === thisWeek);
    return idx >= 0 ? idx : Math.max(0, knownWeeks.length - 1);
  }, [knownWeeks, thisWeek]);
  const safeShiftsIndex = shiftsIndex !== null ? Math.min(Math.max(shiftsIndex, 0), Math.max(knownWeeks.length - 1, 0)) : defaultShiftsIndex;
  const shiftsWeek = knownWeeks[safeShiftsIndex]?.id ?? thisWeek;

  useEffect(() => watchAssignmentsForWeek(shiftsWeek, (all) => setMyShifts(all.filter((a) => a.uid === uid))), [shiftsWeek, uid]);
  useEffect(() => watchSlotsForWeek(shiftsWeek, setThisWeekSlots), [shiftsWeek]);
  useEffect(() => watchSlotsForWeek(upcomingWeek, setSlots), [upcomingWeek]);
  useEffect(() => watchPreferencesForWeek(upcomingWeek, (all) => setMyPrefs(all.filter((p) => p.uid === uid))), [upcomingWeek, uid]);

  async function choose(slot: PlanningSlot, value: PreferenceValue) {
    if (!uid || !name) return;
    await setPreference(slot.id, upcomingWeek, uid, name, value);
  }

  return (
    <>
      <ScreenHeader title="Planning" subtitle={`Week ${weekNumber(thisWeek)}`} />
      {knownWeeks.length > 1 ? (
        <View style={[styles.weekNavRow, { paddingBottom: 8 }]}>
          <Pressable onPress={() => setShiftsIndex(Math.max(0, safeShiftsIndex - 1))} disabled={safeShiftsIndex <= 0} hitSlop={8}>
            <Text style={[styles.weekNavArrow, safeShiftsIndex <= 0 && styles.weekNavArrowDisabled]}>‹</Text>
          </Pressable>
          <Text style={[styles.sectionLabel, { paddingHorizontal: 0, paddingBottom: 0 }]}>
            Jij staat ingepland — week {weekNumber(shiftsWeek)}
          </Text>
          <Pressable
            onPress={() => setShiftsIndex(Math.min(knownWeeks.length - 1, safeShiftsIndex + 1))}
            disabled={safeShiftsIndex >= knownWeeks.length - 1}
            hitSlop={8}
          >
            <Text style={[styles.weekNavArrow, safeShiftsIndex >= knownWeeks.length - 1 && styles.weekNavArrowDisabled]}>›</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.sectionLabel}>Jij staat ingepland</Text>
      )}
      <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 22 }}>
        {myShifts.length === 0 && <Text style={styles.mutedText}>Je staat in week {weekNumber(shiftsWeek)} nergens ingepland.</Text>}
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
          <View style={[styles.weekNavRow, { paddingBottom: 8 }]}>
            <Pressable onPress={() => setWeekOffset((o) => Math.max(1, o - 1))} disabled={weekOffset <= 1} hitSlop={8}>
              <Text style={[styles.weekNavArrow, weekOffset <= 1 && styles.weekNavArrowDisabled]}>‹</Text>
            </Pressable>
            <Text style={[styles.sectionLabel, { paddingHorizontal: 0, paddingBottom: 0 }]}>Voorkeuren week {weekNumber(upcomingWeek)}</Text>
            <Pressable onPress={() => setWeekOffset((o) => o + 1)} hitSlop={8}>
              <Text style={styles.weekNavArrow}>›</Text>
            </Pressable>
          </View>
          <Text style={[styles.mutedText, { paddingHorizontal: 20, paddingBottom: 8 }]}>Geef per tijdvak van de Hoofd Soos aan of je kan.</Text>
          {upcomingWeekPublished ? (
            <Text style={{ paddingHorizontal: 20, color: text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>
              Deze week is al gepubliceerd, je kan er geen voorkeur meer voor doorgeven.
            </Text>
          ) : (
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
          )}
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
  // Which week the manager is currently looking at — 1 (next week) by
  // default, matching the old hardcoded behavior, but navigable in either
  // direction so a mistake in an already-published week can be corrected
  // and future weeks can be planned/published ahead of time.
  const [weekOffset, setWeekOffset] = useState(1);
  const conceptWeek = weekIdWithOffset(weekOffset);
  const weekStart = mondayOfWeekWithOffset(weekOffset);
  const weekEnd = sundayOfWeekWithOffset(weekOffset);
  const [week, setWeek] = useState<PlanningWeek | null>(null);
  const [slots, setSlots] = useState<PlanningSlot[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [newSlotDate, setNewSlotDate] = useState(() => (weekStart < new Date() ? new Date() : weekStart));
  const [newSlotFrom, setNewSlotFrom] = useState(() => setHours(new Date(), 20, 30));
  const [newSlotTo, setNewSlotTo] = useState(() => setHours(new Date(), 1, 0));
  const [newSlotCapacity, setNewSlotCapacity] = useState(2);
  const [assigningSlot, setAssigningSlot] = useState<string | null>(null);

  // A new slot always belongs to conceptWeek — the same week shown in the
  // ‹ › navigator and the card list right above the form — so it appears
  // there immediately instead of in some separately-tracked list. The date
  // picker is bounded to that week's Monday–Sunday (clamped to not-before-
  // today, for the current week) so there's no way to pick a date that
  // would actually land in a different week.
  const minSlotDate = weekStart < new Date() ? new Date() : weekStart;
  useEffect(() => setNewSlotDate(minSlotDate), [conceptWeek]);

  useEffect(() => watchPlanningWeeks((weeks) => setWeek(weeks.find((w) => w.id === conceptWeek) ?? null)), [conceptWeek]);
  useEffect(() => watchSlotsForWeek(conceptWeek, setSlots), [conceptWeek]);
  useEffect(() => watchPreferencesForWeek(conceptWeek, setPreferences), [conceptWeek]);
  useEffect(() => watchAssignmentsForWeek(conceptWeek, setAssignments), [conceptWeek]);
  useEffect(() => watchAllUsers(setAllUsers), []);
  useEffect(() => watchRoles(setRoles), []);

  // Only members whose role has planning.plannable show up as candidates to
  // assign to a bar shift — not literally everyone in the association.
  const plannableUsers = useMemo(
    () => allUsers.filter((u) => roles.find((r) => r.id === u.roleId)?.permissions?.['planning.plannable'] === true),
    [allUsers, roles],
  );

  async function addSlotToOpenWeek() {
    await ensurePlanningWeek({ id: conceptWeek, weekNumber: weekNumber(conceptWeek), published: false });
    await addPlanningSlot({
      weekId: conceptWeek,
      day: formatDutchDayLong(newSlotDate),
      time: formatTimeRange(newSlotFrom, newSlotTo),
      capacity: newSlotCapacity,
    });
    setNewSlotCapacity(2);
  }

  async function publish() {
    await ensurePlanningWeek({ id: conceptWeek, weekNumber: weekNumber(conceptWeek), published: false });
    await publishPlanningWeek(conceptWeek);
  }

  return (
    <>
      {/* extra top space — this heading directly follows MemberSection's
          "Voorkeuren" card with nothing else in between to separate them */}
      <Text style={[styles.sectionLabel, { paddingTop: 28 }]}>Planning · {roleName}</Text>
      <View style={styles.weekNavRow}>
        <Pressable onPress={() => setWeekOffset((o) => Math.max(0, o - 1))} disabled={weekOffset <= 0} hitSlop={8}>
          <Text style={[styles.weekNavArrow, weekOffset <= 0 && styles.weekNavArrowDisabled]}>‹</Text>
        </Pressable>
        <Text style={styles.mutedText}>
          Week {weekNumber(conceptWeek)} · {week?.published ? 'gepubliceerd' : 'concept, nog niet gepubliceerd'}
        </Text>
        <Pressable onPress={() => setWeekOffset((o) => o + 1)} hitSlop={8}>
          <Text style={styles.weekNavArrow}>›</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {slots.map((slot) => {
          const people = assignments.filter((a) => a.slotId === slot.id);
          const capacity = slot.capacity ?? 2;
          const openSpots = Math.max(0, capacity - people.length);
          return (
            <Card key={slot.id} style={{ padding: 14, gap: 10 }}>
              <View style={styles.rowBaseline}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={styles.shiftDay}>{slot.day}</Text>
                  <Text style={styles.mutedText}>{slot.time}</Text>
                </View>
                <Pressable onPress={() => removePlanningSlot(slot.id)}>
                  <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.error }}>Verwijderen</Text>
                </Pressable>
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
                  {plannableUsers.length === 0 && (
                    <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted, paddingVertical: 6 }}>
                      Geen leden met de permissie "Inplanbaar voor bardienst".
                    </Text>
                  )}
                  {plannableUsers
                    .filter((u) => !people.find((p) => p.uid === u.uid))
                    .map((u) => ({ u, pref: preferences.find((pr) => pr.slotId === slot.id && pr.uid === u.uid)?.value }))
                    .sort((a, b) => prefRank(a.pref) - prefRank(b.pref))
                    .map(({ u, pref }) => (
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
                        style={styles.candidateRow}
                      >
                        <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body }}>{u.name}</Text>
                        <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12, color: prefColor(pref) }}>{prefLabel(pref)}</Text>
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
          Voegt een tijdvak toe aan week {weekNumber(conceptWeek)} (hierboven), zodat leden er een voorkeur voor kunnen doorgeven.
        </Text>
        <View style={{ marginTop: 6, gap: 10 }}>
          <PickerField label="Datum" mode="date" value={newSlotDate} onChange={setNewSlotDate} minimumDate={minSlotDate} maximumDate={weekEnd} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PickerField label="Van" mode="time" value={newSlotFrom} onChange={setNewSlotFrom} />
            <PickerField label="Tot" mode="time" value={newSlotTo} onChange={setNewSlotTo} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.stepperLabel}>Aantal personen</Text>
            <View style={styles.stepperRow}>
              <Pressable onPress={() => setNewSlotCapacity((c) => Math.max(1, c - 1))} style={styles.stepperButton}>
                <Text style={styles.stepperButtonLabel}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{newSlotCapacity}</Text>
              <Pressable onPress={() => setNewSlotCapacity((c) => Math.min(10, c + 1))} style={styles.stepperButton}>
                <Text style={styles.stepperButtonLabel}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <Button variant="secondary" onPress={addSlotToOpenWeek}>
          + Tijdvak toevoegen
        </Button>
      </Card>

      <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 8 }}>
        {week?.published ? (
          <>
            <Button variant="secondary" onPress={() => unpublishPlanningWeek(conceptWeek)}>
              Publicatie ongedaan maken
            </Button>
            <Text style={{ textAlign: 'center', fontFamily: fontFamily.body, fontSize: 12, color: text.muted }}>
              Leden zien dan niet meer wie er die week achter de bar staat, tot je opnieuw publiceert.
            </Text>
          </>
        ) : (
          <>
            <Button onPress={publish}>{`Planning week ${weekNumber(conceptWeek)} publiceren`}</Button>
            <Text style={{ textAlign: 'center', fontFamily: fontFamily.body, fontSize: 12, color: text.muted }}>
              Na publiceren zien alle leden wie er achter de bar staat.
            </Text>
          </>
        )}
      </View>
    </>
  );
}

// For sorting assignment candidates so people who said "Ja" surface first.
function prefRank(v?: PreferenceValue) {
  if (v === 'ja') return 0;
  if (v === 'kan') return 1;
  if (v === 'nee') return 3;
  return 2;
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
  rowBaseline: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  weekNavRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 20 },
  weekNavArrow: { fontFamily: fontFamily.bodyBold, fontSize: 18, color: colors.blue600 },
  weekNavArrowDisabled: { color: colors.ink150 },
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
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stepperLabel: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs, color: text.heading },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepperButton: { width: 32, height: 32, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.ink300, alignItems: 'center', justifyContent: 'center' },
  stepperButtonLabel: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md, color: text.heading },
  stepperValue: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.base, color: text.heading, minWidth: 20, textAlign: 'center' },
});
