import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, text } from '../theme/tokens';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function ScreenHeader({ title, subtitle, actionLabel, onActionPress }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onActionPress && (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingRight: 20 },
  wrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6, gap: 2 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: text.heading },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
  action: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm, color: colors.blue600, paddingTop: 24 },
});
