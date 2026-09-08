import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, surface, text } from '../theme/tokens';

interface Props {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function PermissionToggle({ label, description, value, onChange, disabled }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: surface.brand, false: colors.ink150 }}
        thumbColor={colors.cream50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink150,
  },
  text: { flex: 1, gap: 2 },
  label: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: text.heading },
  description: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted },
});
