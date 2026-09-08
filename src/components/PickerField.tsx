import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, fontFamily, fontSize, radius, surface, text } from '../theme/tokens';
import { Button } from './Button';

interface Props {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

/**
 * A bordered, fixed-size field that opens the platform's native date/time
 * picker instead of a free-text input — avoids both the overflow bug free
 * text caused (unpredictable width from typed content) and invalid/unparsable
 * values.
 */
export function PickerField({ label, value, mode, onChange, minimumDate }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const displayValue = mode === 'date'
    ? value.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
    : value.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

  function openPicker() {
    setDraft(value);
    setOpen(true);
  }

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'set' && selected) onChange(selected);
      return;
    }
    // iOS: keep the picker open (spinner), only commit on "Klaar".
    if (selected) setDraft(selected);
  }

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={openPicker} style={styles.field}>
        <Text style={styles.value} numberOfLines={1}>{displayValue}</Text>
      </Pressable>

      {open && Platform.OS === 'android' && (
        <DateTimePicker value={value} mode={mode} display="default" onChange={handleChange} minimumDate={minimumDate} is24Hour />
      )}

      {open && Platform.OS !== 'android' && (
        <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                is24Hour
                textColor={text.body as unknown as string}
              />
              <View style={styles.sheetButtons}>
                <Button variant="secondary" onPress={() => setOpen(false)} style={{ flex: 1 }}>
                  Annuleren
                </Button>
                <Button
                  onPress={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                  style={{ flex: 1 }}
                >
                  Klaar
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs, color: text.heading },
  field: {
    borderWidth: 1.5,
    borderColor: colors.ink300,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  value: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  overlay: { flex: 1, backgroundColor: 'rgba(36,31,28,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: surface.pageAlt, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 16, gap: 12 },
  sheetButtons: { flexDirection: 'row', gap: 10 },
});
