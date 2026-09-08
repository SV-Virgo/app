import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { watchAssignmentsForWeek, watchSlotsForWeek } from '../firebase/planning';
import { watchPriceCategories, savePriceCategory, deletePriceCategory } from '../firebase/soos';
import type { Assignment, PlanningSlot, PriceCategory } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, fontFamily, fontSize, radius, surface, text, tracking } from '../theme/tokens';
import { currentWeekId, weekNumber } from '../utils/week';

export function SoosScreen() {
  const { hasPermission } = useAuth();
  const thisWeek = currentWeekId();
  const [barShifts, setBarShifts] = useState<Assignment[]>([]);
  const [weekSlots, setWeekSlots] = useState<PlanningSlot[]>([]);
  const [categories, setCategories] = useState<PriceCategory[]>([]);
  const canManagePrices = hasPermission('soos.managePrices');

  useEffect(() => watchAssignmentsForWeek(thisWeek, setBarShifts), [thisWeek]);
  useEffect(() => watchSlotsForWeek(thisWeek, setWeekSlots), [thisWeek]);
  useEffect(() => watchPriceCategories(setCategories), []);

  const byDay = groupByDay(barShifts, weekSlots);

  async function addCategory() {
    await savePriceCategory({ id: `cat-${Date.now()}`, name: 'Nieuwe categorie', order: categories.length, items: [] });
  }

  async function updateCategory(cat: PriceCategory, patch: Partial<PriceCategory>) {
    await savePriceCategory({ ...cat, ...patch });
  }

  async function addItem(cat: PriceCategory) {
    await updateCategory(cat, { items: [...cat.items, { name: 'Nieuw item', price: '€0,00' }] });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={styles.title}>De Soos</Text>

        <View style={styles.hoursCard}>
          <Text style={styles.hoursLabel}>Openingstijden</Text>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Dinsdag</Text>
            <Text style={styles.hoursTime}>21:00 – 01:00 · open borrel</Text>
          </View>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Donderdag</Text>
            <Text style={styles.hoursTime}>21:00 – 02:00 · feestavond</Text>
          </View>
          <Text style={styles.hoursNote}>1-2x per maand een groter feest op donderdag</Text>
          <Text style={[styles.hoursNote, styles.hoursFooter]}>Boven BRESS · 5 min fietsen van Avans</Text>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.barLabel}>Wie staat er achter de bar</Text>
          <Text style={styles.mutedText}>week {weekNumber(thisWeek)}</Text>
        </View>
        <Card style={{ marginHorizontal: 20, marginBottom: 20, overflow: 'hidden' }} noShadow>
          {byDay.length === 0 && <Text style={{ padding: 16, color: text.muted, fontFamily: fontFamily.body }}>Nog geen bardienst gepubliceerd.</Text>}
          {byDay.map(({ day, time, names }) => (
            <View key={day} style={styles.barRow}>
              <View style={{ width: 96 }}>
                <Text style={styles.roomName}>{day}</Text>
                <Text style={styles.mutedText}>{time}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body }}>{names}</Text>
            </View>
          ))}
        </Card>

        {categories.map((cat) => (
          <View key={cat.id}>
            <View style={styles.rowBetween}>
              {canManagePrices ? (
                <TextInput
                  value={cat.name}
                  onChangeText={(v) => updateCategory(cat, { name: v })}
                  style={[styles.catLabel, { flex: 1 }]}
                />
              ) : (
                <Text style={styles.catLabel}>{cat.name}</Text>
              )}
              {canManagePrices && (
                <Pressable onPress={() => deletePriceCategory(cat.id)}>
                  <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.error, marginRight: 20 }}>Verwijderen</Text>
                </Pressable>
              )}
            </View>
            <Card style={{ marginHorizontal: 20, marginBottom: 16, overflow: 'hidden' }} noShadow>
              {cat.items.map((item, idx) => (
                <View key={idx} style={styles.priceRow}>
                  {canManagePrices ? (
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
              {canManagePrices && (
                <Pressable onPress={() => addItem(cat)} style={{ padding: 12 }}>
                  <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.blue600 }}>+ Item toevoegen</Text>
                </Pressable>
              )}
            </Card>
          </View>
        ))}

        {canManagePrices && (
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
  const map = new Map<string, { day: string; time: string; names: string[] }>();
  for (const s of shifts) {
    const slot = slots.find((sl) => sl.id === s.slotId);
    const key = s.slotId;
    if (!map.has(key)) map.set(key, { day: slot?.day ?? 'Dienst', time: slot?.time ?? '', names: [] });
    map.get(key)!.names.push(s.memberName);
  }
  return Array.from(map.values()).map((v) => ({ ...v, names: v.names.join(', ') }));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: text.heading, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  hoursCard: { backgroundColor: surface.brand, borderRadius: radius.lg, padding: 22, marginHorizontal: 20, marginBottom: 16, gap: 10 },
  hoursLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: tracking.wide, color: 'rgba(255,255,255,0.85)' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hoursDay: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.onBrand },
  hoursTime: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.onBrand },
  hoursNote: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)' },
  hoursFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', paddingTop: 10, marginTop: 2 },
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
