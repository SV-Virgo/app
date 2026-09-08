import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors, fontFamily, fontSize, radius, shadow, surface, text } from '../theme/tokens';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Image source={require('../../assets/brand/logo-white.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Vrienden voor het leven</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={[styles.sheet, shadow.lg]}>
          <View style={{ gap: 4 }}>
            <Text style={styles.welcome}>Welkom terug</Text>
            <Text style={styles.sub}>Log in met je lidmaatschapsaccount</Text>
          </View>
          <Input
            label="E-mailadres"
            placeholder="Mail@domain.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Wachtwoord"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ alignItems: 'center', gap: 14, marginTop: 6 }}>
            <Button onPress={handleLogin} disabled={submitting || !email || !password}>
              {submitting ? 'Bezig…' : 'Inloggen'}
            </Button>
            <Text style={styles.link}>Nog geen account? Meld je aan bij het bestuur</Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.brand, justifyContent: 'flex-end' },
  hero: { alignItems: 'center', justifyContent: 'center', gap: 18, paddingTop: 90, paddingBottom: 20, paddingHorizontal: 32 },
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
