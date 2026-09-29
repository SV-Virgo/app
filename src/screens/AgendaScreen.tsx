import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { watchAgendaEvents, watchAllAgendaRsvps, setAgendaRsvp } from '../firebase/agenda';
import { watchAllRegistrationForms, watchMySubmissions } from '../firebase/registrations';
import type { AgendaEvent, AgendaRsvp, RegistrationForm, RegistrationSubmission } from '../types';
import { useAuth } from '../state/AuthContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { EventCard } from '../components/EventCard';
import { AgendaRsvpModal } from '../components/AgendaRsvpModal';
import { formatDateRange } from '../utils/date';
import { fontFamily, surface, text } from '../theme/tokens';

// What the member still owes on their signup, for the agenda card — undefined
// when nothing is open (free, fully paid, or not signed up).
function openPaymentNote(submission: RegistrationSubmission | undefined): string | undefined {
  if (!submission?.amount) return undefined;
  if (submission.installments) {
    const open = submission.installments.filter((i) => i.paymentStatus !== 'paid').length;
    if (open === 0) return undefined;
    return `${open} van ${submission.installments.length} termijnen nog te betalen`;
  }
  return submission.paymentStatus === 'paid' ? undefined : `${submission.amount} nog te betalen`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
import type { RootStackParamList } from '../navigation/types';

export function AgendaScreen() {
  const { profile, hasPermission } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [rsvps, setRsvps] = useState<AgendaRsvp[]>([]);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [registrationForms, setRegistrationForms] = useState<RegistrationForm[]>([]);
  const [mySubmissions, setMySubmissions] = useState<RegistrationSubmission[]>([]);
  useEffect(() => watchAgendaEvents(setEvents), []);
  useEffect(() => watchAllAgendaRsvps(setRsvps), []);
  useEffect(() => watchAllRegistrationForms(setRegistrationForms), []);
  useEffect(() => {
    if (!profile) return;
    return watchMySubmissions(profile.uid, setMySubmissions);
  }, [profile]);

  const openEvent = events.find((ev) => ev.id === openEventId) ?? null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader
        title="Agenda"
        actionLabel={hasPermission('agenda.manage') ? 'Beheren' : undefined}
        onActionPress={() => navigation.navigate('AdminAgenda')}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}>
        {events.length === 0 && <Text style={styles.empty}>Nog geen evenementen gepland.</Text>}
        {events.map((ev) => {
          const rsvpEnabled = ev.rsvpEnabled !== false;
          const eventRsvps = rsvps.filter((r) => r.eventId === ev.id);
          const isMultiDay = !!ev.endDate && !isSameDay(new Date(ev.date), new Date(ev.endDate));
          const form = registrationForms.find((f) => f.eventId === ev.id);
          const mySubmission = mySubmissions.find((s) => s.eventId === ev.id);
          return (
            <View key={ev.id}>
              <EventCard
                day={ev.day}
                month={ev.month}
                dateRangeLabel={isMultiDay ? formatDateRange(new Date(ev.date), new Date(ev.endDate!)) : undefined}
                time={ev.time}
                title={ev.title}
                location={ev.location}
                tag={ev.tag}
                rsvpCounts={
                  rsvpEnabled
                    ? {
                        komt: eventRsvps.filter((r) => r.value === 'komt').length,
                        twijfel: eventRsvps.filter((r) => r.value === 'twijfel').length,
                        kan_niet: eventRsvps.filter((r) => r.value === 'kan_niet').length,
                      }
                    : undefined
                }
                onPressRsvp={rsvpEnabled && profile ? () => setOpenEventId(ev.id) : undefined}
                registration={
                  form && profile
                    ? {
                        registered: !!mySubmission,
                        openPayment: openPaymentNote(mySubmission),
                        onPress: () => navigation.navigate('EventRegistration', { eventId: ev.id, eventTitle: ev.title }),
                      }
                    : undefined
                }
              />
            </View>
          );
        })}
      </ScrollView>

      {openEvent && profile && (
        <AgendaRsvpModal
          visible
          onClose={() => setOpenEventId(null)}
          eventTitle={openEvent.title}
          rsvps={rsvps.filter((r) => r.eventId === openEvent.id)}
          myUid={profile.uid}
          onChangeMy={(value) => setAgendaRsvp(openEvent.id, profile.uid, profile.name, value)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  empty: { textAlign: 'center', color: text.muted, fontFamily: fontFamily.body, marginTop: 20 },
});
