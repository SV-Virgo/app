import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { watchAssignmentsForWeek, watchSlotsForWeek } from '../firebase/planning';
import { watchPriceCategories, savePriceCategory, deletePriceCategory, watchSoosInfo, saveSoosInfo } from '../firebase/soos';
import { sendCategoryNotification } from '../firebase/notifications';
import type { Assignment, PlanningSlot, PriceCategory, SoosInfo } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, fontFamily, fontSize, radius, surface, text, tracking } from '../theme/tokens';
import { currentWeekId, weekNumber } from '../utils/week';

const DEFAULT_SOOS_INFO: SoosInfo = {
  hours: [
    { day: 'Dinsdag', time: '21:00 – 01:00 · open borrel' },
    { day: 'Donderdag', time: '21:00 – 02:00 · feestavond' },
  ],
  note: '1-2x per maand een groter feest op donderdag',
};

export function SoosScreen() {
  const { hasPermission } = useAuth();
  const thisWeek = currentWeekId();
  const [barShifts, setBarShifts] = useState<Assignment[]>([]);
  const [weekSlots, setWeekSlots] = useState<PlanningSlot[]>([]);
  const [categories, setCategories] = useState<PriceCategory[]>([]);
  const [soosInfo, setSoosInfo] = useState<SoosInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [sendingOpen, setSendingOpen] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);
  const canManage = hasPermission('soos.managePrices');
  const canSendSoosOpen = hasPermission('notifications.sendSoosOpen');
  // Prices/hours only ever render as read-only text unless someone with
  // permission has explicitly switched into edit mode — having permission
  // alone used to make every field an always-editable TextInput, which
  // looked and behaved like a form even when nobody meant to change anything.
  const editingActive = editing && canManage;

  useEffect(() => watchAssignmentsForWeek(thisWeek, setBarShifts), [thisWeek]);
  useEffect(() => watchSlotsForWeek(thisWeek, setWeekSlots), [thisWeek]);
  useEffect(() => watchPriceCategories(setCategories), []);
  useEffect(() => watchSoosInfo(setSoosInfo), []);

  const byDay = groupByDay(barShifts, weekSlots);
  const info = soosInfo ?? DEFAULT_SOOS_INFO;

  async function addCategory() {
    await savePriceCategory({ id: `cat-${Date.now()}`, name: 'Nieuwe categorie', order: categories.length, items: [] });
  }

  async function updateCategory(cat: PriceCategory, patch: Partial<PriceCategory>) {
    await savePriceCategory({ ...cat, ...patch });
  }

  async function addItem(cat: PriceCategory) {
    await updateCategory(cat, { items: [...cat.items, { name: 'Nieuw item', price: '€0,00' }] });
  }

  async function updateHourRow(idx: number, patch: Partial<SoosInfo['hours'][number]>) {
    const hours = [...info.hours];
    hours[idx] = { ...hours[idx], ...patch };
    await saveSoosInfo({ ...info, hours });
  }

  async function addHourRow() {
    await saveSoosInfo({ ...info, hours: [...info.hours, { day: 'Nieuwe dag', time: '20:00 – 00:00' }] });
  }

  async function removeHourRow(idx: number) {
    await saveSoosInfo({ ...info, hours: info.hours.filter((_, i) => i !== idx) });
  }

  async function sendSoosOpen() {
    setSendingOpen(true);
    setSentOpen(false);
    try {
      await sendCategoryNotification('soosOpen', 'De Soos is open!', 'Kom gezellig langs.');
      setSentOpen(true);
    } finally {
      setSendingOpen(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader
          title="De Soos"
          actionLabel={canManage ? (editing ? 'Klaar' : 'Bewerken') : undefined}
          onActionPress={() => setEditing((v) => !v)}
        />

        <View style={styles.hoursCard}>
          <Text style={styles.hoursLabel}>Openingstijden</Text>
          {info.hours.map((h, idx) =>
            editingActive ? (
              <View key={idx} style={styles.hoursRow}>
                <TextInput
                  value={h.day}
                  onChangeText={(v) => updateHourRow(idx, { day: v })}
                  style={[styles.hoursInput, { flex: 1 }]}
                  placeholder="Dag"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <TextInput
                  value={h.time}
                  onChangeText={(v) => updateHourRow(idx, { time: v })}
                  style={[styles.hoursInput, { flex: 2 }]}
                  placeholder="21:00 – 01:00 · open borrel"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <Pressable onPress={() => removeHourRow(idx)}>
                  <Text style={styles.hoursRemove}>×</Text>
                </Pressable>
              </View>
            ) : (
              <View key={idx} style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{h.day}</Text>
                <Text style={styles.hoursTime}>{h.time}</Text>
              </View>
            ),
          )}
          {editingActive ? (
            <>
              <TextInput
                value={info.note}
                onChangeText={(v) => saveSoosInfo({ ...info, note: v })}
                style={styles.hoursInput}
                placeholder="Extra toelichting"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
              <Pressable onPress={addHourRow}>
                <Text style={styles.hoursAdd}>+ Dag toevoegen</Text>
              </Pressable>
            </>
          ) : (
            info.note ? <Text style={styles.hoursNote}>{info.note}</Text> : null
          )}
        </View>

        {canSendSoosOpen && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16, gap: 6 }}>
            <Button variant="secondary" onPress={sendSoosOpen} disabled={sendingOpen}>
              {sendingOpen ? 'Bezig…' : '📣 Meld dat de Soos open is'}
            </Button>
            {sentOpen && <Text style={styles.sentText}>Melding verstuurd.</Text>}
          </View>
        )}

        <View style={styles.rowBetween}>
          <Text style={styles.barLabel}>Wie staat er achter de bar</Text>
          <Text style={styles.mutedText}>week {weekNumber(thisWeek)}</Text>
        </View>
        <Card style={{ marginHorizontal: 20, marginBottom: 20, overflow: 'hidden' }} noShadow>
          {byDay.length === 0 && <Text style={{ padding: 16, color: text.muted, fontFamily: fontFamily.body }}>Nog geen bardienst gepubliceerd.</Text>}
          {byDay.map(({ slotId, day, time, names }) => {
            // Split "Donderdag 10 sep" into "Donderdag" / "10 sep" so a wrap
            // in this narrow column breaks after the weekday name instead of
            // wherever it runs out of space mid-date (e.g. between "10" and "sep").
            const [weekday, ...dateParts] = day.split(' ');
            return (
              <View key={slotId} style={styles.barRow}>
                <View style={{ width: 96 }}>
                  <Text style={styles.roomName}>{weekday}</Text>
                  {dateParts.length > 0 && <Text style={styles.roomName}>{dateParts.join(' ')}</Text>}
                  <Text style={styles.mutedText}>{time}</Text>
                </View>
                <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body }}>{names}</Text>
              </View>
            );
          })}
        </Card>

        {categories.map((cat) => (
          <View key={cat.id}>
            <View style={styles.rowBetween}>
              {editingActive ? (
                <TextInput
                  value={cat.name}
                  onChangeText={(v) => updateCategory(cat, { name: v })}
                  style={[styles.catLabel, { flex: 1 }]}
                />
              ) : (
                <Text style={styles.catLabel}>{cat.name}</Text>
              )}
              {editingActive && (
                <Pressable onPress={() => deletePriceCategory(cat.id)}>
                  <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.error, marginRight: 20 }}>Verwijderen</Text>
                </Pressable>
              )}
            </View>
            <Card style={{ marginHorizontal: 20, marginBottom: 16, overflow: 'hidden' }} noShadow>
              {cat.items.map((item, idx) => (
                <View key={idx} style={styles.priceRow}>
                  {editingActive ? (
                    <>
                      <TextInput
                        value={item.name}
                        onChangeText={(v) => {
                          const items = [...cat.items];
                          items[idx] = { ...item, name: v };
                          updateCategory(cat, { items });
                        }}
                        style={[styles.priceName, { flex: 1 }]}
                      />
                      <TextInput
                        value={item.price}
                        onChangeText={(v) => {
                          const items = [...cat.items];
                          items[idx] = { ...item, price: v };
                          updateCategory(cat, { items });
                        }}
                        style={styles.priceValueInput}
                      />
                      <Pressable
                        onPress={() => updateCategory(cat, { items: cat.items.filter((_, i) => i !== idx) })}
                      >
                        <Text style={{ fontFamily: fontFamily.bodyBold, color: colors.error, fontSize: 14 }}>×</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Text style={styles.priceName}>{item.name}</Text>
                      <Text style={styles.priceValue}>{item.price}</Text>
                    </>
                  )}
                </View>
              ))}
              {editingActive && (
                <Pressable onPress={() => addItem(cat)} style={{ padding: 12 }}>
                  <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.blue600 }}>+ Item toevoegen</Text>
                </Pressable>
              )}
            </Card>
          </View>
        ))}

        {editingActive && (
          <View style={{ paddingHorizontal: 20 }}>
            <Button variant="secondary" onPress={addCategory}>
              + Categorie toevoegen
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function groupByDay(shifts: Assignment[], slots: PlanningSlot[]) {
  // Keyed by slotId (not by day) — two different shifts can land on the
  // same day text (e.g. an early and a late slot), and the day string alone
  // isn't a safe React key in that case.
  const map = new Map<string, { day: string; time: string; names: string[] }>();
  for (const s of shifts) {
    const slot = slots.find((sl) => sl.id === s.slotId);
    const key = s.slotId;
    if (!map.has(key)) map.set(key, { day: slot?.day ?? 'Dienst', time: slot?.time ?? '', names: [] });
    map.get(key)!.names.push(s.memberName.split(' ')[0]);
  }
  return Array.from(map.entries()).map(([slotId, v]) => ({ slotId, ...v, names: v.names.join(', ') }));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  hoursCard: { backgroundColor: surface.brand, borderRadius: radius.lg, padding: 22, marginHorizontal: 20, marginBottom: 16, gap: 10 },
  hoursLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: tracking.wide, color: 'rgba(255,255,255,0.85)' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  hoursDay: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.onBrand },
  hoursTime: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.onBrand },
  hoursNote: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)' },
  hoursInput: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.onBrand,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 2,
  },
  hoursRemove: { fontFamily: fontFamily.bodyBold, fontSize: 16, color: text.onBrand },
  hoursAdd: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: text.onBrand, textDecorationLine: 'underline' },
  sentText: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: colors.success, textAlign: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  barLabel: { fontFamily: fontFamily.display, fontSize: fontSize.sm, color: colors.blue700 },
  mutedText: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1.5, borderBottomColor: colors.ink150 },
  roomName: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading },
  catLabel: { fontFamily: fontFamily.display, fontSize: fontSize.sm, color: colors.blue700, paddingHorizontal: 20, paddingBottom: 8, paddingTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: 1.5, borderBottomColor: colors.ink150 },
  priceName: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: text.body },
  priceValue: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.base, color: text.heading },
  priceValueInput: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.base, color: text.heading, width: 80, textAlign: 'right' },
});
