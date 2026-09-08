import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontFamily, fontSize, radius, surface, text } from '../theme/tokens';

interface Props {
  children: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ children, onPress, variant = 'primary', disabled, style }: Props) {
  const bg =
    variant === 'primary' ? surface.brand : variant === 'danger' ? colors.error : 'transparent';
  const color = variant === 'secondary' ? text.body : text.onBrand;
  const borderColor = variant === 'secondary' ? colors.ink150 : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  label: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
  },
});
