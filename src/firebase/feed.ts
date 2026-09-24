import { addDoc, deleteDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { collections, docRef, orderBy, query, watchCollection, where } from './firestore';
import type { FeedComment, FeedPost, FeedReaction, FeedType } from '../types';

export function watchFeed(feedType: FeedType, onData: (posts: FeedPost[]) => void) {
  const q = query(collections.feed, where('feedType', '==', feedType), orderBy('createdAt', 'desc'));
  return watchCollection<FeedPost>(q, onData);
}

export async function createFeedPost(post: Omit<FeedPost, 'id' | 'createdAt' | 'deleted'>) {
  await addDoc(collections.feed, { ...post, deleted: false, createdAt: Date.now() });
}

export async function editFeedPost(id: string, patch: { title?: string; body: string }) {
  await updateDoc(docRef('feed', id), { ...patch, editedAt: Date.now() });
}

// Soft delete: content stays in place, the UI renders a "Dit bericht is
// verwijderd" tombstone instead — this keeps any replies underneath a
// deleted post attached to something instead of orphaning them. Used for
// the ledenfeed.
export async function softDeleteFeedPost(id: string) {
  await updateDoc(docRef('feed', id), { deleted: true });
}

// Hard delete: the post disappears entirely, along with any comments and
// reactions attached to it so nothing is left orphaned. Used for the
// hoofdfeed, where a removed announcement should just be gone rather than
// leaving a tombstone.
export async function deleteFeedPost(id: string) {
  const [commentsSnap, reactionsSnap] = await Promise.all([
    getDocs(query(collections.feedComments, where('postId', '==', id))),
    getDocs(query(collections.feedReactions, where('postId', '==', id))),
  ]);
  const batch = writeBatch(db);
  commentsSnap.forEach((d) => batch.delete(d.ref));
  reactionsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(docRef('feed', id));
  await batch.commit();
}

export async function setPostPinned(id: string, pinned: boolean) {
  await updateDoc(docRef('feed', id), { pinned });
}

export function watchCommentsForPost(postId: string, onData: (comments: FeedComment[]) => void) {
  const q = query(collections.feedComments, where('postId', '==', postId), orderBy('createdAt', 'asc'));
  return watchCollection<FeedComment>(q, onData);
}

export async function createComment(comment: Omit<FeedComment, 'id' | 'createdAt'>) {
  await addDoc(collections.feedComments, { ...comment, createdAt: Date.now() });
}

export async function editComment(id: string, body: string) {
  await updateDoc(docRef('feedComments', id), { body, editedAt: Date.now() });
}

// Comments have no tombstone state, unlike ledenfeed posts — deleting one
// just removes it outright.
export async function deleteComment(id: string) {
  await deleteDoc(docRef('feedComments', id));
}

// One listener for every reaction across every post, rather than one query
// per post — screens derive per-post counts and "did I react" from this.
export function watchAllFeedReactions(onData: (reactions: FeedReaction[]) => void) {
  return watchCollection<FeedReaction>(collections.feedReactions, onData);
}

export async function setReaction(postId: string, uid: string, emoji: string) {
  await setDoc(docRef('feedReactions', `${postId}_${uid}`), { id: `${postId}_${uid}`, postId, uid, emoji });
}

export async function removeReaction(postId: string, uid: string) {
  await deleteDoc(docRef('feedReactions', `${postId}_${uid}`));
}
