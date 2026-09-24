import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../state/AuthContext';
import { watchFeed, watchAllFeedReactions, createFeedPost } from '../firebase/feed';
import { sendCategoryNotification } from '../firebase/notifications';
import type { FeedPost, FeedReaction, FeedType } from '../types';
import { Card } from '../components/Card';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { Button } from '../components/Button';
import { PostCard } from '../components/PostCard';
import { colors, fontFamily, fontSize, radius, surface, text, tracking } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export function HomeScreen() {
  const { profile, hasPermission } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<FeedType>('hoofd');
  const [hoofdPosts, setHoofdPosts] = useState<FeedPost[]>([]);
  const [ledenPosts, setLedenPosts] = useState<FeedPost[]>([]);
  const [reactions, setReactions] = useState<FeedReaction[]>([]);

  useEffect(() => watchFeed('hoofd', setHoofdPosts), []);
  useEffect(() => watchFeed('leden', setLedenPosts), []);
  useEffect(() => watchAllFeedReactions(setReactions), []);

  const canModerate = hasPermission('feed.moderate');
  const initials = profile ? initialsOf(profile.name) : '??';

  // Identities this member can post the hoofdfeed under — "Bestuur" if they
  // have feed.postMain, plus whichever committees they've been granted in
  // Leden beheren. More than one means they choose per post; zero means the
  // hoofdfeed compose box doesn't show at all.
  const hoofdIdentities = useMemo(
    () => [...(hasPermission('feed.postMain') ? ['Bestuur'] : []), ...(profile?.committeeIdentities ?? [])],
    [hasPermission, profile],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/brand/logo-ink.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brand}>Virgo</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Profiel')}>
          <InitialsAvatar initials={initials} size={30} />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setTab('hoofd')} style={[styles.tab, tab === 'hoofd' && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === 'hoofd' && styles.tabLabelActive]}>Hoofdfeed</Text>
        </Pressable>
        <Pressable onPress={() => setTab('leden')} style={[styles.tab, tab === 'leden' && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === 'leden' && styles.tabLabelActive]}>Ledenfeed</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {tab === 'hoofd' ? (
          <HoofdFeed
            posts={hoofdPosts}
            reactions={reactions}
            identities={hoofdIdentities}
            myUid={profile?.uid}
            myName={profile?.name}
            canModerate={canModerate}
          />
        ) : (
          <LedenFeed
            posts={ledenPosts}
            reactions={reactions}
            canPost={hasPermission('feed.postMembers')}
            myUid={profile?.uid}
            myName={profile?.name}
            myInitials={initials}
            canModerate={canModerate}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HoofdFeed({
  posts,
  reactions,
  identities,
  myUid,
  myName,
  canModerate,
}: {
  posts: FeedPost[];
  reactions: FeedReaction[];
  identities: string[];
  myUid?: string;
  myName?: string;
  canModerate: boolean;
}) {
  const [composing, setComposing] = useState(false);
  const [identity, setIdentity] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  useEffect(() => {
    if (!identity && identities.length > 0) setIdentity(identities[0]);
  }, [identities, identity]);

  const pinnedPosts = posts.filter((p) => p.pinned && !p.deleted);
  const latestPosts = posts.filter((p) => !p.pinned && !p.deleted);

  async function submit() {
    if (!title.trim() || !body.trim() || !myUid || !myName || !identity) return;
    await createFeedPost({
      feedType: 'hoofd',
      authorUid: myUid,
      authorName: myName,
      // The avatar shows authorInitials, so this has to match the posting
      // identity (e.g. "AC" for Activiteitencommissie), not the personal
      // poster — otherwise the avatar gives away who posted even though
      // displayName correctly says "Bestuur"/the committee name.
      authorInitials: initialsOf(identity),
      displayName: identity,
      title: title.trim(),
      body: body.trim(),
      pinned,
      commentsEnabled,
    });
    // A pinned post is an "aankondiging" — its own notification category,
    // separate from (not in addition to) the regular mainfeed one.
    await sendCategoryNotification(pinned ? 'announcement' : 'mainFeed', pinned ? 'Nieuwe aankondiging' : 'Nieuwe update', `${identity}: ${title.trim()}`);
    setTitle('');
    setBody('');
    setPinned(false);
    setCommentsEnabled(true);
    setComposing(false);
  }

  return (
    <>
      {identities.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          {!composing ? (
            <Button variant="secondary" onPress={() => setComposing(true)}>
              + Nieuwe update plaatsen
            </Button>
          ) : (
            <Card style={{ padding: 14, gap: 10 }}>
              {identities.length > 1 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {identities.map((id) => (
                    <Pressable
                      key={id}
                      onPress={() => setIdentity(id)}
                      style={[styles.identityChip, identity === id && styles.identityChipActive]}
                    >
                      <Text style={[styles.identityChipLabel, identity === id && styles.identityChipLabelActive]}>{id}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <TextInput
                placeholder="Titel"
                placeholderTextColor={colors.ink300}
                value={title}
                onChangeText={setTitle}
                style={styles.composeInput}
              />
              <TextInput
                placeholder="Bericht"
                placeholderTextColor={colors.ink300}
                value={body}
                onChangeText={setBody}
                multiline
                style={[styles.composeInput, { minHeight: 70, textAlignVertical: 'top' }]}
              />
              <Pressable onPress={() => setPinned((v) => !v)} style={styles.checkRow}>
                <View style={[styles.checkbox, pinned && styles.checkboxChecked]} />
                <Text style={styles.checkLabel}>Vastzetten als aankondiging</Text>
              </Pressable>
              <Pressable onPress={() => setCommentsEnabled((v) => !v)} style={styles.checkRow}>
                <View style={[styles.checkbox, commentsEnabled && styles.checkboxChecked]} />
                <Text style={styles.checkLabel}>Reacties toestaan (emoji's kunnen altijd)</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button variant="secondary" onPress={() => setComposing(false)} style={{ flex: 1 }}>
                  Annuleren
                </Button>
                <Button onPress={submit} style={{ flex: 1 }}>
                  Plaatsen
                </Button>
              </View>
            </Card>
          )}
        </View>
      )}

      {pinnedPosts.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Aankondigingen</Text>
          {pinnedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              reactions={reactions.filter((r) => r.postId === post.id)}
              myUid={myUid}
              myName={myName}
              canModerate={canModerate}
            />
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>Laatste updates</Text>
      {latestPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          reactions={reactions.filter((r) => r.postId === post.id)}
          myUid={myUid}
          myName={myName}
          canModerate={canModerate}
        />
      ))}
      {posts.length === 0 && <Text style={styles.empty}>Nog geen updates.</Text>}
    </>
  );
}

function LedenFeed({
  posts,
  reactions,
  canPost,
  myUid,
  myName,
  myInitials,
  canModerate,
}: {
  posts: FeedPost[];
  reactions: FeedReaction[];
  canPost: boolean;
  myUid?: string;
  myName?: string;
  myInitials: string;
  canModerate: boolean;
}) {
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState('');

  async function submit() {
    if (!body.trim() || !myUid || !myName) return;
    await createFeedPost({
      feedType: 'leden',
      authorUid: myUid,
      authorName: myName,
      authorInitials: myInitials,
      displayName: myName,
      body: body.trim(),
      commentsEnabled: true,
    });
    setBody('');
    setComposing(false);
  }

  return (
    <>
      {canPost && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          {!composing ? (
            <Button variant="secondary" onPress={() => setComposing(true)}>
              + Iets plaatsen
            </Button>
          ) : (
            <Card style={{ padding: 14, gap: 10 }}>
              <TextInput
                placeholder="Wat wil je delen?"
                placeholderTextColor={colors.ink300}
                value={body}
                onChangeText={setBody}
                multiline
                style={[styles.composeInput, { minHeight: 70, textAlignVertical: 'top' }]}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button variant="secondary" onPress={() => setComposing(false)} style={{ flex: 1 }}>
                  Annuleren
                </Button>
                <Button onPress={submit} style={{ flex: 1 }}>
                  Plaatsen
                </Button>
              </View>
            </Card>
          )}
        </View>
      )}

      {posts.filter((p) => !p.deleted).map((post) => (
        <PostCard
          key={post.id}
          post={post}
          reactions={reactions.filter((r) => r.postId === post.id)}
          myUid={myUid}
          myName={myName}
          canModerate={canModerate}
        />
      ))}
      {posts.filter((p) => !p.deleted).length === 0 && <Text style={styles.empty}>Nog niemand heeft iets geplaatst.</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { height: 22, width: 22 },
  brand: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: text.heading },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill, backgroundColor: surface.sunken },
  tabActive: { backgroundColor: surface.brand },
  tabLabel: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: text.muted },
  tabLabelActive: { color: text.onBrand },
  sectionLabel: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: tracking.wide,
    color: colors.blue700,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  empty: { textAlign: 'center', color: text.muted, fontFamily: fontFamily.body, marginTop: 20 },
  composeInput: {
    borderWidth: 1.5,
    borderColor: colors.ink150,
    borderRadius: radius.sm,
    padding: 10,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.body,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.ink300 },
  checkboxChecked: { backgroundColor: surface.brand, borderColor: surface.brand },
  checkLabel: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  identityChip: { borderWidth: 1.5, borderColor: colors.ink150, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  identityChipActive: { backgroundColor: surface.brand, borderColor: surface.brand },
  identityChipLabel: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: text.body },
  identityChipLabelActive: { color: text.onBrand },
});
