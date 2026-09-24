import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { sendCategoryNotification } from '../../firebase/notifications';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors, fontFamily, fontSize, radius, surface, text } from '../../theme/tokens';

export function AdminNotificationsScreen() {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setSent(false);
    try {
      await sendCategoryNotification('custom', title.trim(), body.trim());
      setSent(true);
      setTitle('');
      setBody('');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.close}>Sluiten</Text></Pressable>
        <Text style={styles.headerTitle}>Melding versturen</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Card style={{ padding: 14, gap: 12 }}>
          <Text style={styles.hint}>
            Gaat naar elk lid dat "Losse meldingen" aan heeft staan bij Meldingen in hun profiel.
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titel"
            placeholderTextColor={colors.ink300}
            style={styles.input}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Bericht"
            placeholderTextColor={colors.ink300}
            multiline
            style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
          />
          {sent && <Text style={styles.sentText}>Melding verstuurd.</Text>}
          <Button onPress={send} disabled={sending || !title.trim() || !body.trim()}>
            {sending ? 'Bezig…' : 'Versturen'}
          </Button>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  close: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: colors.blue600 },
  headerTitle: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: text.heading },
  hint: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted, lineHeight: 17 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.ink150,
    borderRadius: radius.sm,
    padding: 10,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: text.body,
  },
  sentText: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: colors.success },
});
