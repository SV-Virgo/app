import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { watchRooms, watchBookings, watchMyBookings, createBooking, cancelBooking } from '../firebase/rooms';
import { watchAllUsers } from '../firebase/users';
import type { Booking, Room, UserProfile } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CommitteeIcon, LockIcon } from '../components/MiscIcons';
import { colors, fontFamily, fontSize, radius, surface, text, tracking } from '../theme/tokens';

export function RuimtesScreen() {
  const { profile, hasPermission } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [linked, setLinked] = useState<UserProfile[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const canBook = hasPermission('ruimtes.book');
  const canLink = hasPermission('ruimtes.linkMembers');
  const canCancelAny = hasPermission('ruimtes.cancelAnyBooking');

  useEffect(() => watchRooms(setRooms), []);
  useEffect(() => watchAllUsers(setAllUsers), []);
  useEffect(() => {
    if (!profile) return;
    return canCancelAny ? watchBookings(setBookings) : watchMyBookings(profile.uid, setBookings);
  }, [profile, canCancelAny]);

  const bookableRooms = useMemo(
    () => rooms.filter((r) => !r.bestuurOnly || hasPermission('ruimtes.bookFysio')),
    [rooms, hasPermission],
  );
  const lockedRooms = useMemo(
    () => rooms.filter((r) => r.bestuurOnly && !hasPermission('ruimtes.bookFysio')),
    [rooms, hasPermission],
  );

  async function submitBooking() {
    if (!selectedRoom || !date || !from || !to || !profile) return;
    await createBooking({
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      date,
      from,
      to,
      createdByUid: profile.uid,
      createdByName: profile.name,
      linkedMembers: linked.map((u) => ({
        uid: u.uid,
        name: u.name,
        initials: u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
      })),
    });
    setSelectedRoom(null);
    setDate('');
    setFrom('');
    setTo('');
    setLinked([]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Ruimtes" subtitle="Reserveer een ruimte voor je commissievergadering of activiteit." />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.notice}>
          <CommitteeIcon />
          <Text style={styles.noticeText}>
            Je ziet deze tab omdat je rol toegang heeft tot Ruimtes.
            {canLink ? ' Je kunt andere leden aan je reservering koppelen.' : ''}
          </Text>
        </View>

        {canBook && (
          <>
            <Text style={styles.sectionLabel}>Nieuwe reservering</Text>
            <Card style={{ marginHorizontal: 20, marginBottom: 22, padding: 16, gap: 14 }}>
              <View style={{ gap: 6 }}>
                <Text style={styles.fieldLabel}>Ruimte</Text>
                {[...bookableRooms, ...lockedRooms].map((room) => {
                  const locked = lockedRooms.includes(room);
                  const selected = selectedRoom?.id === room.id;
                  return (
                    <Pressable
                      key={room.id}
                      disabled={locked}
                      onPress={() => setSelectedRoom(room)}
                      style={[
                        styles.roomRow,
                        {
                          borderColor: selected ? colors.blue500 : colors.ink150,
                          backgroundColor: selected ? colors.blue100 : 'transparent',
                          opacity: locked ? 0.6 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.dot, { borderColor: selected ? colors.blue500 : colors.ink300, backgroundColor: selected ? colors.blue500 : 'transparent' }]} />
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={styles.roomName}>{room.name}</Text>
                        <Text style={styles.roomMeta}>{room.meta}</Text>
                      </View>
                      {locked && (
                        <View style={styles.lockRow}>
                          <LockIcon />
                          <Text style={styles.lockLabel}>Vergrendeld</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={styles.fieldLabel}>Datum</Text>
                <TextInput value={date} onChangeText={setDate} placeholder="di 16 september" placeholderTextColor={colors.ink300} style={styles.textField} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.fieldLabel}>Van</Text>
                  <TextInput value={from} onChangeText={setFrom} placeholder="19:30" placeholderTextColor={colors.ink300} style={styles.textField} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.fieldLabel}>Tot</Text>
                  <TextInput value={to} onChangeText={setTo} placeholder="21:00" placeholderTextColor={colors.ink300} style={styles.textField} />
                </View>
              </View>

              {canLink && (
                <View style={{ gap: 6 }}>
                  <Text style={styles.fieldLabel}>Leden koppelen</Text>
                  <View style={styles.chipsRow}>
                    {linked.map((m) => (
                      <View key={m.uid} style={styles.chip}>
                        <Text style={styles.chipText}>{m.name}</Text>
                        <Pressable onPress={() => setLinked((l) => l.filter((x) => x.uid !== m.uid))}>
                          <Text style={styles.chipText}>×</Text>
                        </Pressable>
                      </View>
                    ))}
                    <Pressable onPress={() => setPickerOpen((v) => !v)} style={styles.addChip}>
                      <Text style={styles.addChipText}>+ Lid toevoegen</Text>
                    </Pressable>
                  </View>
                  {pickerOpen && (
                    <Card style={{ padding: 8, maxHeight: 160 }}>
                      <ScrollView>
                        {allUsers.filter((u) => u.uid !== profile?.uid && !linked.find((l) => l.uid === u.uid)).map((u) => (
                          <Pressable
                            key={u.uid}
                            onPress={() => {
                              setLinked((l) => [...l, u]);
                              setPickerOpen(false);
                            }}
                            style={{ padding: 8 }}
                          >
                            <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body }}>{u.name}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </Card>
                  )}
                </View>
              )}

              <Button onPress={submitBooking} disabled={!selectedRoom || !date || !from || !to}>
                Reserveren
              </Button>
            </Card>
          </>
        )}

        <Text style={styles.sectionLabel}>{canCancelAny ? 'Alle reserveringen' : 'Mijn reserveringen'}</Text>
        <Card style={{ marginHorizontal: 20, overflow: 'hidden' }} noShadow>
          {bookings.length === 0 && (
            <Text style={{ padding: 16, fontFamily: fontFamily.body, color: text.muted }}>Nog geen reserveringen.</Text>
          )}
          {bookings.map((b) => (
            <View key={b.id} style={styles.bookingRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.roomName}>{b.roomName}</Text>
                <Text style={styles.bookingMeta}>{b.date} · {b.from} – {b.to}</Text>
                {b.linkedMembers.length > 0 && (
                  <Text style={styles.bookingMeta}>Met {b.linkedMembers.map((m) => m.name).join(', ')}</Text>
                )}
              </View>
              <Pressable onPress={() => cancelBooking(b.id)}>
                <Text style={styles.cancel}>Annuleren</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: surface.brandTint,
    borderWidth: 1.5,
    borderColor: colors.ink150,
    borderRadius: radius.sm,
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  noticeText: { flex: 1, fontFamily: fontFamily.body, fontSize: 12, color: text.body, lineHeight: 18 },
  sectionLabel: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: tracking.wide,
    color: colors.blue700,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  fieldLabel: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs, color: text.heading },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: radius.sm, padding: 10, marginBottom: 6 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  roomName: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading },
  roomMeta: { fontFamily: fontFamily.body, fontSize: 11, color: text.muted },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lockLabel: { fontFamily: fontFamily.bodySemibold, fontSize: 11, color: text.muted },
  textField: { borderWidth: 1.5, borderColor: colors.ink300, borderRadius: radius.sm, padding: 10, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.blue100, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10 },
  chipText: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: colors.blue700 },
  addChip: { borderWidth: 1.5, borderColor: colors.ink300, borderStyle: 'dashed', borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  addChipText: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: text.muted },
  bookingRow: { flexDirection: 'row', gap: 10, padding: 14, borderBottomWidth: 1.5, borderBottomColor: colors.ink150 },
  bookingMeta: { fontFamily: fontFamily.body, fontSize: 11, color: text.muted },
  cancel: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.error },
});
