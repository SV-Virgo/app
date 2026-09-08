import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { border, colors, fontFamily, fontSize, radius, shadow, surface, text } from '../theme/tokens';

interface Props {
  day: string;
  month: string;
  title: string;
  location: string;
  tag: string;
}

export function EventCard({ day, month, title, location, tag }: Props) {
  return (
    <View style={[styles.card, shadow.sm]}>
      <View style={styles.dateBox}>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.month}>{month}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.location}>{location}</Text>
      </View>
      <View style={styles.tag}>
        <Text style={styles.tagLabel}>{tag}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: surface.card,
    borderWidth: border.width,
    borderColor: colors.ink150,
    borderRadius: radius.md,
    padding: 14,
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
  location: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
  tag: {
    backgroundColor: surface.sunken,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagLabel: { fontFamily: fontFamily.bodySemibold, fontSize: 11, color: text.body },
});
