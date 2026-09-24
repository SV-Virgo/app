import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { watchCommentsForPost, createComment, editComment, deleteComment } from '../firebase/feed';
import type { FeedComment } from '../types';
import { InitialsAvatar } from './InitialsAvatar';
import { colors, fontFamily, fontSize, radius, text } from '../theme/tokens';
import { formatRelativeTime } from '../utils/date';

interface Props {
  postId: string;
  myUid?: string;
  myName?: string;
  canModerate: boolean;
}

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export function CommentThread({ postId, myUid, myName, canModerate }: Props) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  useEffect(() => watchCommentsForPost(postId, setComments), [postId]);

  async function submit() {
    if (!draft.trim() || !myUid || !myName) return;
    await createComment({ postId, authorUid: myUid, authorName: myName, authorInitials: initialsOf(myName), body: draft.trim() });
    setDraft('');
  }

  async function saveEdit(id: string) {
    if (!editDraft.trim()) return;
    await editComment(id, editDraft.trim());
    setEditingId(null);
  }

  return (
    <View style={styles.wrap}>
      {comments.map((c) => {
        const canEdit = c.authorUid === myUid;
        const isEditing = editingId === c.id;
        return (
          <View key={c.id} style={styles.row}>
            <InitialsAvatar initials={c.authorInitials} size={24} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.headerRow}>
                <Text style={styles.author}>{c.authorName}</Text>
                <Text style={styles.time}>{formatRelativeTime(c.createdAt)}</Text>
              </View>
              {isEditing ? (
                <View style={{ gap: 6 }}>
                  <TextInput value={editDraft} onChangeText={setEditDraft} style={styles.editInput} multiline />
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <Pressable onPress={() => setEditingId(null)}>
                      <Text style={styles.actionLink}>Annuleren</Text>
                    </Pressable>
                    <Pressable onPress={() => saveEdit(c.id)}>
                      <Text style={styles.actionLink}>Opslaan</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.body}>{c.body}</Text>
                  {(canEdit || canModerate) && (
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      {canEdit && (
                        <Pressable onPress={() => { setEditingId(c.id); setEditDraft(c.body); }}>
                          <Text style={styles.actionLink}>Bewerken</Text>
                        </Pressable>
                      )}
                      <Pressable onPress={() => deleteComment(c.id)}>
                        <Text style={styles.deleteLink}>Verwijderen</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}

      {myUid && myName && (
        <View style={styles.composeRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Schrijf een reactie…"
            placeholderTextColor={colors.ink300}
            style={styles.composeInput}
            multiline
          />
          <Pressable onPress={submit} disabled={!draft.trim()} hitSlop={8}>
            <Text style={[styles.sendLabel, !draft.trim() && { opacity: 0.4 }]}>Versturen</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, borderTopWidth: 1.5, borderTopColor: colors.ink150, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  author: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: text.heading },
  time: { fontFamily: fontFamily.body, fontSize: 11, color: text.muted },
  body: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  actionLink: { fontFamily: fontFamily.bodyBold, fontSize: 11, color: colors.blue600 },
  deleteLink: { fontFamily: fontFamily.bodyBold, fontSize: 11, color: colors.error },
  editInput: {
    borderWidth: 1.5,
    borderColor: colors.ink150,
    borderRadius: radius.sm,
    padding: 8,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.body,
  },
  composeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  composeInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.ink150,
    borderRadius: radius.sm,
    padding: 8,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.body,
    maxHeight: 80,
  },
  sendLabel: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.blue600, paddingBottom: 10 },
});
