import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  deleteRegistrationForm,
  saveRegistrationForm,
  watchRegistrationForm,
  watchSubmissionsForEvent,
} from '../../firebase/registrations';
import { splitEuroAmount } from '../../utils/money';
import type { RegistrationForm, RegistrationQuestion, RegistrationQuestionType, RegistrationSubmission } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors, fontFamily, fontSize, radius, surface, text } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { confirmDestructive } from '../../utils/confirm';

const QUESTION_TYPE_LABELS: Record<RegistrationQuestionType, string> = {
  text: 'Tekst',
  choice: 'Meerkeuze',
  yesno: 'Ja / Nee',
};

function newQuestion(): RegistrationQuestion {
  return { id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`, type: 'text', label: '', required: true };
}

export function AdminEventRegistrationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AdminEventRegistration'>>();
  const { eventId, eventTitle } = route.params;

  const [existingForm, setExistingForm] = useState<RegistrationForm | null | undefined>(undefined);
  const [submissions, setSubmissions] = useState<RegistrationSubmission[]>([]);
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [price, setPrice] = useState('');
  const [installments, setInstallments] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => watchRegistrationForm(eventId, setExistingForm), [eventId]);
  useEffect(() => watchSubmissionsForEvent(eventId, setSubmissions), [eventId]);

  useEffect(() => {
    if (existingForm) {
      setQuestions(existingForm.questions);
      setPrice(existingForm.price ?? '');
      setInstallments(existingForm.installments ?? 1);
    }
  }, [existingForm]);

  const hasForm = existingForm !== null && existingForm !== undefined;

  function addQuestion() {
    setQuestions((qs) => [...qs, newQuestion()]);
  }

  function updateQuestion(id: string, patch: Partial<RegistrationQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }

  async function save() {
    setSaving(true);
    try {
      await saveRegistrationForm(eventId, questions.filter((q) => q.label.trim()), price.trim() || undefined, installments);
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteForm() {
    Alert.alert('Aanmeldformulier verwijderen', 'Leden kunnen zich hierna niet meer aanmelden. Bestaande aanmeldingen blijven bewaard.', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          await deleteRegistrationForm(eventId);
          setQuestions([]);
          setPrice('');
          setInstallments(1);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.close}>Sluiten</Text></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={styles.sectionTitle}>Aanmeldformulier</Text>
        <Text style={styles.hint}>
          Elke aanmelding vraagt altijd naam, adres en woonplaats. Voeg hieronder eventuele extra vragen toe en stel
          een bedrag in als er betaald moet worden.
        </Text>

        <Card style={{ padding: 14, gap: 12 }}>
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Bedrag (optioneel, bijv. €12,50)</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="Laat leeg voor gratis"
              placeholderTextColor={colors.ink300}
              style={styles.input}
            />
          </View>

          {price.trim() ? (
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>In termijnen betalen</Text>
              <View style={styles.typeRow}>
                {[1, 2, 3, 4].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setInstallments(n)}
                    style={[styles.typeChip, installments === n && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeChipLabel, installments === n && styles.typeChipLabelActive]}>
                      {n === 1 ? 'Uit' : `${n} termijnen`}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {installments > 1 && (
                <Text style={styles.hint}>Leden betalen dit op hun eigen moment in {installments} losse termijnen: {splitEuroAmount(price, installments).join(' + ')}.</Text>
              )}
            </View>
          ) : null}

          {questions.map((q, idx) => (
            <View key={q.id} style={styles.questionBox}>
              <View style={styles.questionHeaderRow}>
                <Text style={styles.questionIndex}>Vraag {idx + 1}</Text>
                <Pressable onPress={() => confirmDestructive(`Vraag ${idx + 1} verwijderen?`, () => removeQuestion(q.id), { message: 'De vraag is pas definitief weg nadat je het formulier opslaat.' })}>
                  <Text style={styles.delete}>Verwijderen</Text>
                </Pressable>
              </View>
              <TextInput
                value={q.label}
                onChangeText={(v) => updateQuestion(q.id, { label: v })}
                placeholder="Vraag, bijv. Heb je een dieetwens?"
                placeholderTextColor={colors.ink300}
                style={styles.input}
              />
              <View style={styles.typeRow}>
                {(Object.keys(QUESTION_TYPE_LABELS) as RegistrationQuestionType[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => updateQuestion(q.id, { type: t })}
                    style={[styles.typeChip, q.type === t && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeChipLabel, q.type === t && styles.typeChipLabelActive]}>
                      {QUESTION_TYPE_LABELS[t]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {q.type === 'choice' && (
                <TextInput
                  value={(q.options ?? []).join(', ')}
                  onChangeText={(v) => updateQuestion(q.id, { options: v.split(',').map((o) => o.trim()).filter(Boolean) })}
                  placeholder="Opties, gescheiden door een komma"
                  placeholderTextColor={colors.ink300}
                  style={styles.input}
                />
              )}
              <Pressable onPress={() => updateQuestion(q.id, { required: !q.required })} style={styles.checkboxRow}>
                <View style={[styles.checkbox, q.required && styles.checkboxChecked]} />
                <Text style={styles.checkboxLabel}>Verplicht</Text>
              </Pressable>
            </View>
          ))}

          <Button variant="secondary" onPress={addQuestion}>+ Vraag toevoegen</Button>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {hasForm && (
              <Button variant="danger" onPress={confirmDeleteForm} style={{ flex: 1 }}>
                Formulier verwijderen
              </Button>
            )}
            <Button onPress={save} disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Bezig…' : hasForm ? 'Opslaan' : 'Formulier aanmaken'}
            </Button>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Aanmeldingen ({submissions.length})</Text>
        {submissions.length === 0 && <Text style={styles.hint}>Nog niemand heeft zich aangemeld.</Text>}
        {submissions.map((s) => (
          <Card key={s.id} style={{ padding: 14, gap: 6 }} noShadow>
            <View style={styles.submissionHeaderRow}>
              <Text style={styles.submissionName}>{s.naw.name}</Text>
              {s.amount ? (
                <View
                  style={[
                    styles.paymentBadge,
                    s.paymentStatus === 'paid' ? styles.paymentBadgePaid : s.paymentStatus === 'failed' ? styles.paymentBadgeFailed : styles.paymentBadgePending,
                  ]}
                >
                  <Text style={styles.paymentBadgeLabel}>
                    {s.paymentStatus === 'paid' ? `Betaald · ${s.amount}` : s.paymentStatus === 'failed' ? 'Betaling mislukt' : `Nog te betalen · ${s.amount}`}
                  </Text>
                </View>
              ) : (
                <View style={[styles.paymentBadge, styles.paymentBadgeFree]}>
                  <Text style={styles.paymentBadgeLabel}>Gratis</Text>
                </View>
              )}
            </View>
            <Text style={styles.submissionMeta}>{s.naw.address}, {s.naw.postalCode} {s.naw.city}</Text>
            {s.installments && (
              <Text style={styles.submissionMeta}>
                {s.installments
                  .map((inst, i) => `Termijn ${i + 1}: ${inst.amount} · ${inst.paymentStatus === 'paid' ? 'betaald' : inst.paymentStatus === 'failed' ? 'mislukt' : 'open'}`)
                  .join('  ·  ')}
              </Text>
            )}
            {existingForm?.questions.map((q) => (
              s.answers[q.id] ? (
                <Text key={q.id} style={styles.answerLine}>
                  <Text style={styles.answerLabel}>{q.label}: </Text>
                  {s.answers[q.id]}
                </Text>
              ) : null
            ))}
          </Card>
        ))}
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
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted },
  label: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs, color: text.heading },
  input: { borderWidth: 1.5, borderColor: colors.ink150, borderRadius: radius.sm, padding: 10, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  questionBox: { gap: 8, borderTopWidth: 1.5, borderTopColor: colors.ink150, paddingTop: 12 },
  questionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionIndex: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs, color: text.muted },
  delete: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.error },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink150 },
  typeChipActive: { backgroundColor: surface.brand, borderColor: surface.brand },
  typeChipLabel: { fontFamily: fontFamily.bodySemibold, fontSize: 12, color: text.body },
  typeChipLabelActive: { color: text.onBrand },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.ink300 },
  checkboxChecked: { backgroundColor: surface.brand, borderColor: surface.brand },
  checkboxLabel: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.body },
  submissionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  submissionName: { flex: 1, fontFamily: fontFamily.displaySemibold, fontSize: fontSize.sm, color: text.heading },
  submissionMeta: { fontFamily: fontFamily.body, fontSize: 12, color: text.muted },
  answerLine: { fontFamily: fontFamily.body, fontSize: 12, color: text.body },
  answerLabel: { fontFamily: fontFamily.bodySemibold, color: text.heading },
  paymentBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  paymentBadgePaid: { backgroundColor: '#DCF7E3' },
  paymentBadgePending: { backgroundColor: '#FFF3CD' },
  paymentBadgeFailed: { backgroundColor: '#FBDADA' },
  paymentBadgeFree: { backgroundColor: surface.sunken },
  paymentBadgeLabel: { fontFamily: fontFamily.bodySemibold, fontSize: 11, color: text.heading },
});
