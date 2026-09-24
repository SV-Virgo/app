import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { editFeedPost, softDeleteFeedPost, deleteFeedPost, setPostPinned, setReaction, removeReaction } from '../firebase/feed';
import type { FeedPost, FeedReaction } from '../types';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { InitialsAvatar } from './InitialsAvatar';
import { EmojiReactionBar } from './EmojiReactionBar';
import { CommentThread } from './CommentThread';
import { colors, fontFamily, fontSize, radius, text } from '../theme/tokens';
import { formatRelativeTime } from '../utils/date';

interface Props {
  post: FeedPost;
  reactions: FeedReaction[];
  myUid?: string;
  myName?: string;
  canModerate: boolean;
}

export function PostCard({ post, reactions, myUid, myName, canModerate }: Props) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title ?? '');
  const [editBody, setEditBody] = useState(post.body);

  const isOwn = post.authorUid === myUid;
  const canEdit = isOwn;
  const canModifyStatus = isOwn || canModerate;

  async function toggleReaction(emoji: string) {
    if (!myUid) return;
    const mine = reactions.find((r) => r.uid === myUid);
    if (mine?.emoji === emoji) await removeReaction(post.id, myUid);
    else await setReaction(post.id, myUid, emoji);
  }

  // Ledenfeed posts soft-delete (deleted:true) and are filtered out of the
  // feed list entirely — see HomeScreen's LedenFeed/HoofdFeed. Kept as a
  // soft delete rather than a hard one purely so the comments underneath
  // aren't orphaned in Firestore, even though they're no longer reachable
  // from the UI once the post itself is filtered out.
  // Hoofdfeed posts hard-delete outright, comments/reactions included.
  async function handleDelete() {
    if (post.feedType === 'hoofd') await deleteFeedPost(post.id);
    else await softDeleteFeedPost(post.id);
  }

  async function saveEdit() {
    if (!editBody.trim()) return;
    await editFeedPost(post.id, post.title !== undefined ? { title: editTitle.trim(), body: editBody.trim() } : { body: editBody.trim() });
    setEditing(false);
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <InitialsAvatar initials={post.authorInitials} />
        <View style={{ flex: 1 }}>
          <Text style={styles.displayName}>{post.displayName}</Text>
          <Text style={styles.time}>
            {formatRelativeTime(post.createdAt)}{post.editedAt ? ' · bewerkt' : ''}
          </Text>
        </View>
        {post.pinned && <Badge tone="brand">Aankondiging</Badge>}
      </View>

      {editing ? (
        <View style={{ gap: 8 }}>
          {post.title !== undefined && (
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Titel"
              placeholderTextColor={colors.ink300}
              style={styles.editInput}
            />
          )}
          <TextInput
            value={editBody}
            onChangeText={setEditBody}
            multiline
            style={[styles.editInput, { minHeight: 70, textAlignVertical: 'top' }]}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }}>
              Annuleren
            </Button>
            <Button onPress={saveEdit} style={{ flex: 1 }}>
              Opslaan
            </Button>
          </View>
        </View>
      ) : (
        <>
          {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
          <Text style={styles.body}>{post.body}</Text>
          {post.photoUrl ? <Image source={{ uri: post.photoUrl }} style={styles.photo} /> : null}
        </>
      )}

      {!editing && (canEdit || canModifyStatus) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {canEdit && (
            <Pressable onPress={() => setEditing(true)}>
              <Text style={styles.actionLink}>Bewerken</Text>
            </Pressable>
          )}
          {canModifyStatus && post.pinned && (
            <Pressable onPress={() => setPostPinned(post.id, false)}>
              <Text style={styles.actionLink}>Van aankondigingen halen</Text>
            </Pressable>
          )}
          {canModifyStatus && (
            <Pressable onPress={handleDelete}>
              <Text style={styles.deleteLink}>Verwijderen</Text>
            </Pressable>
          )}
        </View>
      )}

      <EmojiReactionBar reactions={reactions} myUid={myUid} onToggle={toggleReaction} />

      {post.commentsEnabled && (
        <CommentThread postId={post.id} myUid={myUid} myName={myName} canModerate={canModerate} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginBottom: 12, padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  displayName: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading },
  time: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted },
  title: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.base, color: text.heading },
  body: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body, lineHeight: fontSize.sm * 1.5 },
  photo: { width: '100%', height: 150, borderRadius: radius.sm, marginTop: 4 },
  actionLink: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.blue600 },
  deleteLink: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.error },
  editInput: {
    borderWidth: 1.5,
    borderColor: colors.ink150,
    borderRadius: radius.sm,
    padding: 10,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.body,
  },
});
