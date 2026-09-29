import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { changePassword, passwordPolicyProblems } from '../firebase/auth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors, fontFamily, fontSize, shadow, surface, text } from '../theme/tokens';

const MIN_LENGTH = 8;

function changePasswordErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Je huidige wachtwoord klopt niet.';
  if (code === 'auth/password-does-not-meet-requirements') {
    return 'Je nieuwe wachtwoord voldoet niet aan de eisen: gebruik minstens een cijfer en een speciaal teken.';
  }
  if (code === 'auth/weak-password') return `Kies een sterker wachtwoord van minstens ${MIN_LENGTH} tekens.`;
  if (code === 'auth/too-many-requests') return 'Te veel pogingen. Wacht even en probeer het opnieuw.';
  return 'Wachtwoord wijzigen is mislukt. Probeer het nog eens.';
}

// Shown instead of the rest of the app while profile.mustChangePassword is
// set — i.e. right after logging in with a password that was mailed by the
// inviteMember or resetPassword Cloud Function.
export function ChangePasswordScreen() {
  const { profile, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (next.length < MIN_LENGTH) return setError(`Je nieuwe wachtwoord moet minstens ${MIN_LENGTH} tekens hebben.`);
    if (next !== repeat) return setError('De nieuwe wachtwoorden zijn niet hetzelfde.');
    if (next === current) return setError('Kies een ander wachtwoord dan het wachtwoord uit de e-mail.');
    setSubmitting(true);
    try {
      const problems = await passwordPolicyProblems(next);
      if (problems.length > 0) {
        setError(`Je nieuwe wachtwoord mist nog: ${problems.join(', ')}.`);
        setSubmitting(false);
        return;
      }
      // Clearing mustChangePassword makes RootNavigator switch to the app.
      await changePassword(current, next);
    } catch (err) {
      console.error('changePassword failed:', err);
      setError(changePasswordErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.hero}>
        <Image source={require('../../assets/brand/logo-white.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <SafeAreaView edges={['bottom']} style={[styles.sheet, shadow.lg]}>
        <ScrollView contentContainerStyle={{ gap: 18 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 4 }}>
            <Text style={styles.welcome}>Kies je eigen wachtwoord</Text>
            <Text style={styles.sub}>
              {profile?.name ? `Hoi ${profile.name.split(' ')[0]}, je` : 'Je'} bent ingelogd met een wachtwoord uit de e-mail. Stel nu je
              eigen wachtwoord in.
            </Text>
          </View>
          <Input label="Wachtwoord uit de e-mail" placeholder="••••••••" secureTextEntry value={current} onChangeText={setCurrent} autoCapitalize="none" />
          <Input label="Nieuw wachtwoord" placeholder={`Minstens ${MIN_LENGTH} tekens`} secureTextEntry value={next} onChangeText={setNext} autoCapitalize="none" />
          <Input label="Herhaal nieuw wachtwoord" placeholder="••••••••" secureTextEntry value={repeat} onChangeText={setRepeat} autoCapitalize="none" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ alignItems: 'center', gap: 14, marginTop: 6 }}>
            <Button onPress={handleSubmit} disabled={submitting || !current || !next || !repeat}>
              {submitting ? 'Bezig…' : 'Wachtwoord opslaan'}
            </Button>
            <Pressable onPress={logout} hitSlop={8}>
              <Text style={styles.link}>Uitloggen</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.brand },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, paddingBottom: 20 },
  logo: { height: 56, width: 160 },
  sheet: {
    backgroundColor: surface.pageAlt,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
  },
  welcome: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: text.heading },
  sub: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
  error: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error },
  link: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.link },
});
