import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamily, fontSize, text } from '../theme/tokens';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6, gap: 2 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: text.heading },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
});
