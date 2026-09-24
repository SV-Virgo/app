import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { watchAgendaEvents, createAgendaEvent, updateAgendaEvent, deleteAgendaEvent } from '../../firebase/agenda';
import type { AgendaEvent } from '../../types';
import { agendaDayMonth, formatTime } from '../../utils/date';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { PickerField } from '../../components/PickerField';
import { useAuth } from '../../state/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fontFamily, fontSize, radius, surface, text } from '../../theme/tokens';

function parseTimeOnToday(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const EMPTY_FORM = { title: '', location: '', tag: '', date: new Date(), time: new Date(), showTime: true, rsvpEnabled: true, multiDay: false, endDate: new Date() };

export function AdminAgendaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hasPermission } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => watchAgendaEvents(setEvents), []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCreating(true);
  }

  function startEdit(ev: AgendaEvent) {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      location: ev.location,
      tag: ev.tag,
      date: new Date(ev.date),
      time: ev.time ? parseTimeOnToday(ev.time) : new Date(),
      showTime: !!ev.time,
      rsvpEnabled: ev.rsvpEnabled !== false,
      multiDay: !!ev.endDate && !isSameDay(new Date(ev.date), new Date(ev.endDate)),
      endDate: ev.endDate ? new Date(ev.endDate) : new Date(ev.date),
    });
    setCreating(true);
  }

  function cancel() {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit() {
    if (!form.title.trim() || !form.location.trim() || !form.tag.trim()) return;
    setSubmitting(true);
    try {
      const { day, month } = agendaDayMonth(form.date);
      const payload = {
        day,
        month,
        time: form.showTime ? formatTime(form.time) : '',
        title: form.title.trim(),
        location: form.location.trim(),
        tag: form.tag.trim(),
        date: form.date.getTime(),
        // Always set (never omitted) so an edit that turns multiDay back off
        // actually overwrites a previous end date instead of leaving it
        // stale — equal to the start date just means "spans one day".
        endDate: form.multiDay ? form.endDate.getTime() : form.date.getTime(),
        rsvpEnabled: form.rsvpEnabled,
      };
      if (editingId) {
        await updateAgendaEvent(editingId, payload);
      } else {
        await createAgendaEvent(payload);
      }
      cancel();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.close}>Sluiten</Text></Pressable>
        <Text style={styles.headerTitle}>Agenda beheren</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          {!creating ? (
            <Button variant="secondary" onPress={startCreate}>+ Evenement toevoegen</Button>
          ) : (
            <Card style={{ padding: 14, gap: 12 }}>
              <TextInput
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                placeholder="Titel, bijv. Kroegentocht"
                placeholderTextColor={colors.ink300}
                style={styles.input}
              />
              <TextInput
                value={form.location}
                onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
                placeholder="Locatie, bijv. De Soos"
                placeholderTextColor={colors.ink300}
                style={styles.input}
              />
              <TextInput
                value={form.tag}
                onChangeText={(v) => setForm((f) => ({ ...f, tag: v }))}
                placeholder="Label, bijv. Feest, Wekelijks, Activiteit"
                placeholderTextColor={colors.ink300}
                style={styles.input}
              />
              <PickerField
                label="Datum"
                mode="date"
                value={form.date}
                onChange={(d) => setForm((f) => ({ ...f, date: d, endDate: f.endDate < d ? d : f.endDate }))}
              />
              <Pressable onPress={() => setForm((f) => ({ ...f, multiDay: !f.multiDay }))} style={styles.checkboxRow}>
                <View style={[styles.checkbox, form.multiDay && styles.checkboxChecked]} />
                <Text style={styles.checkboxLabel}>Meerdaagse activiteit</Text>
              </Pressable>
              {form.multiDay && (
                <PickerField
                  label="T/m"
                  mode="date"
                  value={form.endDate}
                  onChange={(d) => setForm((f) => ({ ...f, endDate: d }))}
                  minimumDate={form.date}
                />
              )}
              <Pressable onPress={() => setForm((f) => ({ ...f, showTime: !f.showTime }))} style={styles.checkboxRow}>
                <View style={[styles.checkbox, form.showTime && styles.checkboxChecked]} />
                <Text style={styles.checkboxLabel}>Starttijd tonen</Text>
              </Pressable>
              {form.showTime && (
                <PickerField
                  label="Tijd"
                  mode="time"
                  value={form.time}
                  onChange={(d) => setForm((f) => ({ ...f, time: d }))}
                />
              )}
              <Pressable onPress={() => setForm((f) => ({ ...f, rsvpEnabled: !f.rsvpEnabled }))} style={styles.checkboxRow}>
                <View style={[styles.checkbox, form.rsvpEnabled && styles.checkboxChecked]} />
                <Text style={styles.checkboxLabel}>RSVP toestaan (Ik kom / Twijfel / Ik kan niet)</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button variant="secondary" onPress={cancel} style={{ flex: 1 }} disabled={submitting}>
                  Annuleren
                </Button>
                <Button
                  onPress={submit}
                  style={{ flex: 1 }}
                  disabled={submitting || !form.title.trim() || !form.location.trim() || !form.tag.trim()}
                >
                  {submitting ? 'Bezig…' : editingId ? 'Opslaan' : 'Toevoegen'}
                </Button>
              </View>
            </Card>
          )}
        </View>

        <Card style={{ marginHorizontal: 20, overflow: 'hidden' }} noShadow>
          {events.length === 0 && (
            <Text style={{ padding: 16, fontFamily: fontFamily.body, color: text.muted }}>Nog geen evenementen.</Text>
          )}
          {events.map((ev, idx) => {
            const isMultiDay = !!ev.endDate && !isSameDay(new Date(ev.date), new Date(ev.endDate));
            const endLabel = isMultiDay ? agendaDayMonth(new Date(ev.endDate!)) : null;
            return (
            <View key={ev.id} style={[styles.row, idx < events.length - 1 && styles.rowBorder]}>
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{ev.day}{endLabel ? `–${endLabel.day}` : ''}</Text>
                <Text style={styles.dateMonth}>{ev.month}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{ev.title}</Text>
                <Text style={styles.meta}>{ev.location}{ev.time ? ` · ${ev.time}` : ''} · {ev.tag}</Text>
                <Text style={styles.meta}>RSVP: {ev.rsvpEnabled !== false ? 'aan' : 'uit'}</Text>
              </View>
              <View style={{ gap: 8, alignItems: 'flex-end' }}>
                <Pressable onPress={() => startEdit(ev)}>
                  <Text style={styles.edit}>Bewerken</Text>
                </Pressable>
                {hasPermission('agenda.manageRegistration') && (
                  <Pressable onPress={() => navigation.navigate('AdminEventRegistration', { eventId: ev.id, eventTitle: ev.title })}>
                    <Text style={styles.edit}>Aanmelding</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => deleteAgendaEvent(ev.id)}>
                  <Text style={styles.delete}>Verwijderen</Text>
                </Pressable>
              </View>
            </View>
            );
          })}
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
  input: { borderWidth: 1.5, borderColor: colors.ink150, borderRadius: radius.sm, padding: 10, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.ink300 },
  checkboxChecked: { backgroundColor: surface.brand, borderColor: surface.brand },
  checkboxLabel: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowBorder: { borderBottomWidth: 1.5, borderBottomColor: colors.ink150 },
  dateBox: { width: 48, alignItems: 'center', backgroundColor: surface.brandTint, borderRadius: radius.sm, paddingVertical: 8 },
  dateDay: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.blue700 },
  dateMonth: { fontFamily: fontFamily.bodySemibold, fontSize: 11, color: colors.blue600, textTransform: 'uppercase' },
  title: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading },
  meta: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted },
  edit: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.blue600 },
  delete: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.error },
});
