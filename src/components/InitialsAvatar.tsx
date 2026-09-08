import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, surface } from '../theme/tokens';

export function InitialsAvatar({ initials, size = 28 }: { initials: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.label, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: surface.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fontFamily.display, color: colors.blue700 },
});
