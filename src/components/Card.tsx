import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { border, colors, radius, shadow, surface } from '../theme/tokens';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noShadow?: boolean;
}

export function Card({ children, style, noShadow }: Props) {
  return <View style={[styles.card, !noShadow && shadow.sm, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.card,
    borderWidth: border.width,
    borderColor: colors.ink150,
    borderRadius: radius.md,
  },
});
