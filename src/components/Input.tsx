import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { border, colors, fontFamily, fontSize, radius, surface, text } from '../theme/tokens';

interface Props extends TextInputProps {
  label: string;
}

export function Input({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.ink300}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs, color: text.heading },
  input: {
    borderWidth: border.width,
    borderColor: colors.ink300,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.body,
    backgroundColor: surface.card,
  },
});
