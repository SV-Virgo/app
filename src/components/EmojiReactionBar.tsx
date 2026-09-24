import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedReaction } from '../types';
import { colors, fontFamily, radius, surface, text } from '../theme/tokens';

const EMOJI_SET = ['👍', '❤️', '😂', '🎉', '👏', '😮'];

interface Props {
  reactions: FeedReaction[];
  myUid?: string;
  onToggle: (emoji: string) => void;
}

// Emoji reactions have no permission gate anywhere in the app — any signed-in
// member can react to any post in either feed, always.
export function EmojiReactionBar({ reactions, myUid, onToggle }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const myEmoji = reactions.find((r) => r.uid === myUid)?.emoji;

  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {Array.from(counts.entries()).map(([emoji, count]) => (
          <Pressable
            key={emoji}
            onPress={() => onToggle(emoji)}
            style={[styles.pill, emoji === myEmoji && styles.pillActive]}
          >
            <Text style={styles.pillText}>{emoji} {count}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setPickerOpen((v) => !v)} style={styles.addPill}>
          <Text style={styles.addPillText}>{pickerOpen ? '×' : '+ reactie'}</Text>
        </Pressable>
      </View>
      {pickerOpen && (
        <View style={styles.row}>
          {EMOJI_SET.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                onToggle(emoji);
                setPickerOpen(false);
              }}
              style={styles.pickerEmoji}
            >
              <Text style={{ fontSize: 18 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surface.sunken,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillActive: { borderColor: colors.blue500, backgroundColor: colors.blue100 },
  pillText: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: text.body },
  addPill: { backgroundColor: surface.sunken, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  addPillText: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: text.muted },
  pickerEmoji: { backgroundColor: surface.sunken, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 8 },
});
