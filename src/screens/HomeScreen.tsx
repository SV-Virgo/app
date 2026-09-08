import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../state/AuthContext';
import { watchFeed, createFeedPost } from '../firebase/feed';
import type { FeedPost } from '../types';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { Button } from '../components/Button';
import { BellIcon } from '../components/MiscIcons';
import { colors, fontFamily, fontSize, radius, surface, text, tracking } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function HomeScreen() {
  const { profile, hasPermission } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);

  useEffect(() => watchFeed(setPosts), []);

  const pinnedPosts = posts.filter((p) => p.pinned);
  const latestPosts = posts.filter((p) => !p.pinned);
  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  async function submitPost() {
    if (!title.trim() || !body.trim() || !profile) return;
    await createFeedPost({
      authorName: profile.name,
      authorInitials: initials,
      badge: pinned ? 'Bestuur' : undefined,
      pinned,
      title: title.trim(),
      body: body.trim(),
    });
    setTitle('');
    setBody('');
    setPinned(false);
    setComposing(false);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/brand/logo-ink.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brand}>Virgo</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <BellIcon />
          <Pressable onPress={() => navigation.navigate('Profiel')}>
            <InitialsAvatar initials={initials} size={30} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {hasPermission('feed.post') && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            {!composing ? (
              <Button variant="secondary" onPress={() => setComposing(true)}>
                + Nieuwe update plaatsen
              </Button>
            ) : (
              <Card style={{ padding: 14, gap: 10 }}>
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
                <Pressable onPress={() => setPinned((v) => !v)} style={styles.pinRow}>
                  <View style={[styles.checkbox, pinned && { backgroundColor: surface.brand, borderColor: surface.brand }]} />
                  <Text style={styles.pinLabel}>Vastzetten als aankondiging</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button variant="secondary" onPress={() => setComposing(false)} style={{ flex: 1 }}>
                    Annuleren
                  </Button>
                  <Button onPress={submitPost} style={{ flex: 1 }}>
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
            {pinnedPosts.map((item) => (
              <Card key={item.id} style={styles.postCard}>
                {item.badge ? <Badge tone="brand">{item.badge}</Badge> : null}
                <Text style={styles.postTitle}>{item.title}</Text>
                <Text style={styles.postBody}>{item.body}</Text>
                <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
              </Card>
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>Laatste updates</Text>
        {latestPosts.map((item) => (
          <Card key={item.id} style={styles.postCard}>
            <View style={styles.postHeaderRow}>
              <InitialsAvatar initials={item.authorInitials} />
              <Text style={styles.author}>{item.authorName}</Text>
              <Text style={styles.postTimeInline}>{formatTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postBody}>{item.body}</Text>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.postPhoto} />
            ) : null}
          </Card>
        ))}
        {posts.length === 0 && (
          <Text style={styles.empty}>Nog geen updates.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(ts: number) {
  const diffMs = Date.now() - ts;
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'zojuist';
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  return `${days} dag${days === 1 ? '' : 'en'} geleden`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { height: 22, width: 22 },
  brand: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: text.heading },
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
  postCard: { marginHorizontal: 20, marginBottom: 12, padding: 16, gap: 6 },
  postHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading },
  postTimeInline: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted, marginLeft: 'auto' },
  postTitle: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.base, color: text.heading },
  postBody: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body, lineHeight: fontSize.sm * 1.5 },
  postTime: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted },
  postPhoto: { width: '100%', height: 150, borderRadius: radius.sm, marginTop: 4 },
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
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.ink300 },
  pinLabel: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
});
