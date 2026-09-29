import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { requestPasswordReset } from '../firebase/auth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors, fontFamily, fontSize, radius, shadow, surface, text } from '../theme/tokens';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // "Wachtwoord vergeten" swaps the password field for a single email field
  // on the same card rather than navigating to a separate screen.
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      setError('Inloggen mislukt. Controleer je e-mailadres en wachtwoord.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setResetSent(true);
    } catch (e) {
      console.error('requestPasswordReset failed:', e);
      setError('Er ging iets mis bij het versturen. Probeer het later opnieuw.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleForgotMode() {
    setForgotMode((m) => !m);
    setResetSent(false);
    setError(null);
  }

  return (
    // 'height' on Android rather than relying on the native windowSoftInputMode
    // resize config — that alone wasn't reliably resizing the layout here,
    // likely due to how react-native-screens presents each stack screen.
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.hero}>
        <Image source={require('../../assets/brand/logo-white.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Vrienden voor het leven</Text>
      </View>
      <SafeAreaView edges={['bottom']} style={[styles.sheet, shadow.lg]}>
        <View style={{ gap: 4 }}>
          <Text style={styles.welcome}>{forgotMode ? 'Wachtwoord vergeten' : 'Welkom terug'}</Text>
          <Text style={styles.sub}>
            {forgotMode ? 'Vul je e-mailadres in, dan mailen we je een nieuw wachtwoord' : 'Log in met je lidmaatschapsaccount'}
          </Text>
        </View>
        <Input
          label="E-mailadres"
          placeholder="Mail@domain.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {!forgotMode && (
          <Input
            label="Wachtwoord"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {forgotMode && resetSent ? (
          <Text style={styles.sub}>
            Als dit e-mailadres bij ons bekend is, ontvang je binnen een paar minuten een e-mail met een nieuw wachtwoord. Kijk ook in je spam.
          </Text>
        ) : null}
        <View style={{ alignItems: 'center', gap: 14, marginTop: 6 }}>
          {forgotMode ? (
            <Button onPress={handleReset} disabled={submitting || !email.trim() || resetSent}>
              {submitting ? 'Bezig…' : resetSent ? 'Verstuurd' : 'Nieuw wachtwoord mailen'}
            </Button>
          ) : (
            <Button onPress={handleLogin} disabled={submitting || !email || !password}>
              {submitting ? 'Bezig…' : 'Inloggen'}
            </Button>
          )}
          <Pressable onPress={toggleForgotMode} hitSlop={8}>
            <Text style={styles.link}>{forgotMode ? 'Terug naar inloggen' : 'Wachtwoord vergeten?'}</Text>
          </Pressable>
          {!forgotMode && <Text style={styles.sub}>Nog geen account? Meld je aan bij het bestuur</Text>}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.brand },
  // flex: 1 so the blue hero always fills whatever space is left above the
  // card — without it, this View only takes its natural content height,
  // which can leave the card looking like it's pinned to the top with
  // little or no blue showing on taller screens.
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingTop: 40, paddingBottom: 20, paddingHorizontal: 32 },
  logo: { height: 56, width: 160 },
  tagline: { fontFamily: fontFamily.script, fontSize: fontSize.lg, color: colors.cream50, textAlign: 'center' },
  sheet: {
    backgroundColor: surface.pageAlt,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    gap: 18,
  },
  welcome: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: text.heading },
  sub: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
  error: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error },
  link: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.link },
});
