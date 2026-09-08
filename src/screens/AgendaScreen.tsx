import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { watchAgendaEvents } from '../firebase/agenda';
import type { AgendaEvent } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { EventCard } from '../components/EventCard';
import { fontFamily, surface, text } from '../theme/tokens';

export function AgendaScreen() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  useEffect(() => watchAgendaEvents(setEvents), []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Agenda" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}>
        {events.length === 0 && <Text style={styles.empty}>Nog geen evenementen gepland.</Text>}
        {events.map((ev) => (
          <View key={ev.id}>
            <EventCard day={ev.day} month={ev.month} title={ev.title} location={ev.location} tag={ev.tag} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  empty: { textAlign: 'center', color: text.muted, fontFamily: fontFamily.body, marginTop: 20 },
});
