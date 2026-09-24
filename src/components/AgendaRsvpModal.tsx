import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AgendaRsvp, RsvpValue } from '../types';
import { RsvpButtons } from './RsvpButtons';
import { colors, fontFamily, fontSize, radius, surface, text } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  eventTitle: string;
  rsvps: AgendaRsvp[];
  myUid?: string;
  onChangeMy: (value: RsvpValue) => void;
}

const GROUPS: { value: RsvpValue; label: string }[] = [
  { value: 'komt', label: 'Komt' },
  { value: 'twijfel', label: 'Twijfelt' },
  { value: 'kan_niet', label: 'Kan niet' },
];

export function AgendaRsvpModal({ visible, onClose, eventTitle, rsvps, myUid, onChangeMy }: Props) {
  const myValue = rsvps.find((r) => r.uid === myUid)?.value;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{eventTitle}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>Sluiten</Text>
            </Pressable>
          </View>

          <Text style={styles.prompt}>Doe je mee?</Text>
          <RsvpButtons value={myValue} onChange={onChangeMy} />

          <ScrollView style={{ marginTop: 18 }}>
            {GROUPS.map((group) => {
              const names = rsvps.filter((r) => r.value === group.value).map((r) => r.memberName);
              return (
                <View key={group.value} style={styles.group}>
                  <Text style={styles.groupLabel}>{group.label} ({names.length})</Text>
                  <Text style={styles.groupNames}>{names.length > 0 ? names.join(', ') : 'Nog niemand'}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(36,31,28,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: surface.pageAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 20,
    maxHeight: '75%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  title: { flex: 1, fontFamily: fontFamily.display, fontSize: fontSize.md, color: text.heading },
  close: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: colors.blue600 },
  prompt: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs, color: text.heading, marginBottom: 8 },
  group: { paddingVertical: 10, borderBottomWidth: 1.5, borderBottomColor: colors.ink150 },
  groupLabel: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading, marginBottom: 2 },
  groupNames: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
});
