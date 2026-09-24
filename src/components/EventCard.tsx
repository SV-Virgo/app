import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { border, colors, fontFamily, fontSize, radius, shadow, surface, text } from '../theme/tokens';

interface RsvpCounts {
  komt: number;
  twijfel: number;
  kan_niet: number;
}

interface Props {
  day: string;
  month: string;
  time?: string;
  title: string;
  location: string;
  tag: string;
  rsvpCounts?: RsvpCounts;
  onPressRsvp?: () => void;
  // Pre-formatted, e.g. "10 – 12 sep" or "28 aug – 2 sep" — only passed for
  // multi-day activities, shown separately from the day/month tile (which
  // stays fixed to the start date) since a tile alone can't show a range
  // that crosses a month boundary without becoming ambiguous.
  dateRangeLabel?: string;
  // Only passed when this event has an aanmeldformulier at all.
  registration?: { registered: boolean; onPress: () => void };
}

export function EventCard({ day, month, time, title, location, tag, rsvpCounts, onPressRsvp, dateRangeLabel, registration }: Props) {
  return (
    <View style={[styles.card, shadow.sm]}>
      <View style={styles.row}>
        <View style={styles.dateBox}>
          <Text style={styles.day}>{day}</Text>
          <Text style={styles.month}>{month}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          {dateRangeLabel && <Text style={styles.dateRange}>{dateRangeLabel}</Text>}
          <Text style={styles.location}>{location}{time ? ` · ${time}` : ''}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagLabel}>{tag}</Text>
        </View>
      </View>
      {onPressRsvp && rsvpCounts && (
        <Pressable onPress={onPressRsvp} style={styles.rsvpRow}>
          <Text style={styles.rsvpSummary}>
            {rsvpCounts.komt + rsvpCounts.twijfel + rsvpCounts.kan_niet === 0
              ? 'Nog niemand heeft gereageerd'
              : `${rsvpCounts.komt} komen · ${rsvpCounts.twijfel} twijfelen · ${rsvpCounts.kan_niet} kunnen niet`}
          </Text>
          <Text style={styles.rsvpChevron}>Doe mee ›</Text>
        </Pressable>
      )}
      {registration && (
        <Pressable onPress={registration.onPress} style={styles.rsvpRow}>
          <Text style={styles.rsvpSummary}>{registration.registered ? 'Je bent aangemeld' : 'Aanmelden vereist'}</Text>
          <Text style={styles.rsvpChevron}>{registration.registered ? 'Bekijken ›' : 'Aanmelden ›'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    backgroundColor: surface.card,
    borderWidth: border.width,
    borderColor: colors.ink150,
    borderRadius: radius.md,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dateBox: {
    width: 48,
    alignItems: 'center',
    backgroundColor: surface.brandTint,
    borderRadius: radius.sm,
    paddingVertical: 8,
  },
  day: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.blue700 },
  month: { fontFamily: fontFamily.bodySemibold, fontSize: 11, color: colors.blue600, textTransform: 'uppercase' },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.base, color: text.heading },
  dateRange: { fontFamily: fontFamily.bodySemibold, fontSize: 11, color: colors.blue600 },
  location: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
  tag: {
    backgroundColor: surface.sunken,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagLabel: { fontFamily: fontFamily.bodySemibold, fontSize: 11, color: text.body },
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: border.width,
    borderTopColor: colors.ink150,
    paddingTop: 10,
  },
  rsvpSummary: { flex: 1, fontFamily: fontFamily.body, fontSize: 12, color: text.muted },
  rsvpChevron: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.blue600 },
});
