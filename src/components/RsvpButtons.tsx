import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RsvpValue } from '../types';
import { colors, fontFamily, radius, text } from '../theme/tokens';

interface Props {
  value?: RsvpValue;
  onChange: (value: RsvpValue) => void;
}

const OPTIONS: { value: RsvpValue; label: string; activeColor: string }[] = [
  { value: 'komt', label: 'Ik kom', activeColor: colors.success },
  { value: 'twijfel', label: 'Twijfel', activeColor: colors.blue500 },
  { value: 'kan_niet', label: 'Ik kan niet', activeColor: colors.error },
];

export function RsvpButtons({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.button, { borderColor: active ? opt.activeColor : colors.ink150, backgroundColor: active ? opt.activeColor : 'transparent' }]}
          >
            <Text style={[styles.label, { color: active ? colors.cream50 : text.muted }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  button: { flex: 1, borderWidth: 1.5, borderRadius: radius.pill, paddingVertical: 7, alignItems: 'center' },
  label: { fontFamily: fontFamily.bodyBold, fontSize: 12 },
});
