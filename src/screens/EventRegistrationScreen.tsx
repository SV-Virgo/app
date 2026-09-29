import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { watchRegistrationForm, watchMySubmission, submitRegistration } from '../firebase/registrations';
import { createSumupCheckout, confirmSumupPayment, openHostedCheckout } from '../firebase/payments';
import type { RegistrationForm, RegistrationSubmission } from '../types';
import { useAuth } from '../state/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, fontFamily, fontSize, radius, surface, text } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function EventRegistrationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EventRegistration'>>();
  const { eventId, eventTitle } = route.params;
  const { profile } = useAuth();

  const [form, setForm] = useState<RegistrationForm | null | undefined>(undefined);
  const [mySubmission, setMySubmission] = useState<RegistrationSubmission | null | undefined>(undefined);

  const [name, setName] = useState(profile?.name ?? '');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [payingIndex, setPayingIndex] = useState<number | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => watchRegistrationForm(eventId, setForm), [eventId]);
  useEffect(() => {
    if (!profile) return;
    return watchMySubmission(eventId, profile.uid, setMySubmission);
  }, [eventId, profile]);

  const missingRequired = useMemo(() => {
    if (!form) return true;
    if (!name.trim() || !address.trim() || !postalCode.trim() || !city.trim()) return true;
    return form.questions.some((q) => q.required && !answers[q.id]?.trim());
  }, [form, name, address, postalCode, city, answers]);

  async function submit() {
    if (!profile || !form) return;
    setSubmitting(true);
    try {
      await submitRegistration(
        eventId,
        profile.uid,
        { name: name.trim(), address: address.trim(), postalCode: postalCode.trim(), city: city.trim() },
        answers,
        form.price || undefined,
        form.installments,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function startPayment(index: number | null) {
    setStartingCheckout(true);
    setPayingIndex(index);
    let checkoutId: string;
    try {
      checkoutId = await createSumupCheckout(eventId, index ?? undefined);
    } catch (err) {
      Alert.alert('Betalen mislukt', err instanceof Error ? err.message : 'Probeer het later opnieuw.');
      return;
    } finally {
      setStartingCheckout(false);
    }

    await openHostedCheckout(checkoutId);
    await confirmAfterReturn(index);
  }

  // Runs whenever the member is back from the checkout page, however it
  // ended. SumUp can still report PENDING for a moment right after a
  // successful payment, so retry a few times before giving up — the
  // sumupWebhook Cloud Function catches anything later still. A paid status
  // needs no message: the submission watch updates the screen by itself.
  async function confirmAfterReturn(index: number | null) {
    setConfirming(true);
    try {
      let status = await confirmSumupPayment(eventId, index ?? undefined);
      for (let attempt = 0; status === 'pending' && attempt < 3; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        status = await confirmSumupPayment(eventId, index ?? undefined);
      }
      if (status === 'failed') {
        Alert.alert('Betaling mislukt', 'Er is niets afgeschreven. Probeer het opnieuw.');
      } else if (status === 'pending') {
        Alert.alert(
          'Nog geen betaling ontvangen',
          'Heb je het betaalscherm gesloten zonder te betalen? Dan kun je het opnieuw proberen. Heb je wel betaald, dan wordt dit binnen een paar minuten bijgewerkt.',
        );
      }
    } catch (err) {
      console.error('confirmSumupPayment failed:', err);
      Alert.alert('Betaling controleren mislukt', 'We konden je betaling niet controleren. Heb je betaald, dan wordt dit binnen een paar minuten bijgewerkt.');
    } finally {
      setConfirming(false);
    }
  }

  const loading = form === undefined || mySubmission === undefined;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.close}>Sluiten</Text></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {loading && <Text style={styles.hint}>Laden…</Text>}

        {!loading && !form && <Text style={styles.hint}>Er is geen aanmeldformulier voor deze activiteit.</Text>}

        {!loading && form && mySubmission && (
          <Card style={{ padding: 14, gap: 8 }}>
            <Text style={styles.sectionTitle}>Je bent aangemeld</Text>
            <Text style={styles.hint}>{mySubmission.naw.name} · {mySubmission.naw.address}, {mySubmission.naw.postalCode} {mySubmission.naw.city}</Text>
            {form.questions.map((q) =>
              mySubmission.answers[q.id] ? (
                <Text key={q.id} style={styles.answerLine}>
                  <Text style={styles.answerLabel}>{q.label}: </Text>
                  {mySubmission.answers[q.id]}
                </Text>
              ) : null,
            )}
            {mySubmission.installments ? (
              <View style={{ gap: 10 }}>
                {mySubmission.installments.map((inst, i) => (
                  <View key={i} style={styles.installmentRow}>
                    <Text style={styles.hint}>
                      Termijn {i + 1} ·{' '}
                      {inst.paymentStatus === 'paid'
                        ? `Betaald · ${inst.amount}`
                        : inst.paymentStatus === 'failed'
                        ? `Mislukt · ${inst.amount}`
                        : `Nog te betalen · ${inst.amount}`}
                    </Text>
                    {inst.paymentStatus !== 'paid' && (
                      <Button onPress={() => startPayment(i)} disabled={startingCheckout || confirming} style={{ flex: 0 }}>
                        {(startingCheckout || confirming) && payingIndex === i ? 'Bezig…' : 'Betalen'}
                      </Button>
                    )}
                  </View>
                ))}
              </View>
            ) : mySubmission.amount ? (
              <>
                <Text style={styles.hint}>
                  {mySubmission.paymentStatus === 'paid'
                    ? `Betaald · ${mySubmission.amount}`
                    : mySubmission.paymentStatus === 'failed'
                    ? `Betaling mislukt · ${mySubmission.amount}`
                    : `Nog te betalen · ${mySubmission.amount}`}
                </Text>
                {mySubmission.paymentStatus !== 'paid' && (
                  <Button onPress={() => startPayment(null)} disabled={startingCheckout || confirming}>
                    {startingCheckout || confirming ? 'Bezig…' : 'Betalen'}
                  </Button>
                )}
              </>
            ) : (
              <Text style={styles.hint}>Deze activiteit is gratis.</Text>
            )}
          </Card>
        )}

        {!loading && form && !mySubmission && (
          <>
            <Text style={styles.sectionTitle}>Aanmelden</Text>
            {form.price ? (
              <Text style={styles.hint}>Deelname kost {form.price}. Je betaalt na het aanmelden.</Text>
            ) : (
              <Text style={styles.hint}>Deelname aan deze activiteit is gratis.</Text>
            )}

            <Card style={{ padding: 14, gap: 12 }}>
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>Naam</Text>
                <TextInput value={name} onChangeText={setName} placeholder="Volledige naam" placeholderTextColor={colors.ink300} style={styles.input} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>Adres</Text>
                <TextInput value={address} onChangeText={setAddress} placeholder="Straat en huisnummer" placeholderTextColor={colors.ink300} style={styles.input} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ gap: 6, flex: 1 }}>
                  <Text style={styles.label}>Postcode</Text>
                  <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="1234 AB" placeholderTextColor={colors.ink300} style={styles.input} />
                </View>
                <View style={{ gap: 6, flex: 2 }}>
                  <Text style={styles.label}>Woonplaats</Text>
                  <TextInput value={city} onChangeText={setCity} placeholder="Plaats" placeholderTextColor={colors.ink300} style={styles.input} />
                </View>
              </View>

              {form.questions.map((q) => (
                <View key={q.id} style={{ gap: 6 }}>
                  <Text style={styles.label}>{q.label}{q.required ? '' : ' (optioneel)'}</Text>
                  {q.type === 'text' && (
                    <TextInput
                      value={answers[q.id] ?? ''}
                      onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                      placeholder="Jouw antwoord"
                      placeholderTextColor={colors.ink300}
                      style={styles.input}
                    />
                  )}
                  {q.type === 'yesno' && (
                    <View style={styles.chipRow}>
                      {['Ja', 'Nee'].map((opt) => (
                        <Pressable
                          key={opt}
                          onPress={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          style={[styles.chip, answers[q.id] === opt && styles.chipActive]}
                        >
                          <Text style={[styles.chipLabel, answers[q.id] === opt && styles.chipLabelActive]}>{opt}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {q.type === 'choice' && (
                    <View style={styles.chipRow}>
                      {(q.options ?? []).map((opt) => (
                        <Pressable
                          key={opt}
                          onPress={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          style={[styles.chip, answers[q.id] === opt && styles.chipActive]}
                        >
                          <Text style={[styles.chipLabel, answers[q.id] === opt && styles.chipLabelActive]}>{opt}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              <Button onPress={submit} disabled={submitting || missingRequired}>
                {submitting ? 'Bezig…' : 'Aanmelden'}
              </Button>
            </Card>
          </>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.page },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  close: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: colors.blue600 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fontFamily.display, fontSize: fontSize.md, color: text.heading, marginHorizontal: 8 },
  sectionTitle: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.base, color: text.heading },
  installmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
  label: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs, color: text.heading },
  input: { borderWidth: 1.5, borderColor: colors.ink150, borderRadius: radius.sm, padding: 10, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink150 },
  chipActive: { backgroundColor: surface.brand, borderColor: surface.brand },
  chipLabel: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.sm, color: text.body },
  chipLabelActive: { color: text.onBrand },
  answerLine: { fontFamily: fontFamily.body, fontSize: 12, color: text.body },
  answerLabel: { fontFamily: fontFamily.bodySemibold, color: text.heading },
});
