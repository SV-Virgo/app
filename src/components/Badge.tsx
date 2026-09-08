import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, radius, surface, text } from '../theme/tokens';

interface Props {
  children: string;
  tone?: 'brand' | 'accent';
}

export function Badge({ children, tone = 'brand' }: Props) {
  const bg = tone === 'brand' ? surface.brand : surface.accent;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  label: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: text.onBrand,
  },
});
