import { addDoc } from 'firebase/firestore';
import { collections, orderBy, query, watchCollection } from './firestore';
import type { FeedPost } from '../types';

export function watchFeed(onData: (posts: FeedPost[]) => void) {
  const q = query(collections.feed, orderBy('createdAt', 'desc'));
  return watchCollection<FeedPost>(q, onData);
}

export async function createFeedPost(post: Omit<FeedPost, 'id' | 'createdAt'>) {
  await addDoc(collections.feed, { ...post, createdAt: Date.now() });
}
