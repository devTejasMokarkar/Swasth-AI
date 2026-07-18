import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSaveProfile } from '@workspace/api-client-react';
import { useUser } from '@/contexts/UserContext';
import * as Haptics from 'expo-haptics';

type Condition = 'blood_pressure' | 'diabetes' | 'thyroid' | 'none';
type Gender = 'male' | 'female' | 'other';

const CONDITIONS: { key: Condition; label: string; icon: string }[] = [
  { key: 'blood_pressure', label: 'Blood Pressure', icon: '❤️' },
  { key: 'diabetes', label: 'Diabetes / Sugar', icon: '🩸' },
  { key: 'thyroid', label: 'Thyroid', icon: '🦋' },
  { key: 'none', label: 'None of the above', icon: '✓' },
];

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
];

const TOTAL_STEPS = 3;

function StepIndicator({ step }: { step: number }) {
  const colors = useColors();
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            {
              backgroundColor: i < step ? colors.primary : colors.muted,
              width: i < step ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setOnboarded } = useUser();
  const saveMutation = useSaveProfile();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [dobYear, setDobYear] = useState(() => new Date().getUTCFullYear() - 30);
  const [dobMonth, setDobMonth] = useState(1);
  const [dobDay, setDobDay] = useState(1);
  const [dobError, setDobError] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [weight, setWeight] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [medicationsText, setMedicationsText] = useState('');
  const [historyText, setHistoryText] = useState('');

  const toggleCondition = (cond: Condition) => {
    if (cond === 'none') {
      setConditions(['none']);
      return;
    }
    setConditions((prev) => {
      const without = prev.filter((c) => c !== 'none');
      if (without.includes(cond)) return without.filter((c) => c !== cond);
      return [...without, cond];
    });
  };

  const getDobString = () => {
    const year = String(dobYear).padStart(4, '0');
    const month = String(dobMonth).padStart(2, '0');
    const day = String(dobDay).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateAgeFromDob = (year: number, month: number, day: number): number => {
    const dobDate = new Date(Date.UTC(year, month - 1, day));
    const now = new Date();
    let age = now.getUTCFullYear() - dobDate.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - dobDate.getUTCMonth();
    const dayDiff = now.getUTCDate() - dobDate.getUTCDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
    }
    return age;
  };

  const validateStep1 = () => {
    let valid = true;

    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      valid = false;
    }

    const ageFromDob = calculateAgeFromDob(dobYear, dobMonth, dobDay);
    if (ageFromDob < 1 || ageFromDob > 120) {
      setDobError('Age must be between 1 and 120 years.');
      valid = false;
    } else {
      setDobError(null);
    }

    if (!gender) {
      Alert.alert('Gender Required', 'Please select your gender.');
      valid = false;
    }

    const numericWeight = Number(weight);
    if (!weight) {
      setWeightError('Weight is required.');
      valid = false;
    } else if (!/^[0-9]+(\.[0-9]*)?$/.test(weight)) {
      setWeightError('Weight must be a number.');
      valid = false;
    } else if (isNaN(numericWeight) || numericWeight < 1) {
      setWeightError('Enter a valid weight in kg.');
      valid = false;
    } else if (numericWeight > 300) {
      setWeightError('Weight must be 300 kg or less.');
      valid = false;
    } else {
      setWeightError(null);
    }

    if (!valid) {
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (conditions.length === 0) {
      Alert.alert('Select Conditions', 'Please select your conditions or "None of the above".');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    try {
      const ageFromDob = calculateAgeFromDob(dobYear, dobMonth, dobDay);
      await saveMutation.mutateAsync({
        data: {
          name: name.trim(),
          age: ageFromDob,
          gender: gender!,
          weightKg: Number(weight),
          conditions,
          medicationsText,
          historyText,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/starter-pack');
    } catch (err: any) {
      const message =
        err?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Could not save your profile. Please try again.';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 24, paddingBottom: bottomPad + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Feather name="activity" size={24} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Health Companion</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {step === 1
              ? "Let's start with some basics"
              : step === 2
              ? 'Your existing health conditions'
              : 'Your current medications & history'}
          </Text>
        </View>

        <StepIndicator step={step} />

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="e.g. Ramesh"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Date of Birth</Text>
              <View style={styles.dobRow}>
                <View style={styles.dobInputGroup}>
                  <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Year</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    keyboardType="number-pad"
                    value={String(dobYear)}
                    onChangeText={(value) => {
                      const year = Number(value.replace(/[^0-9]/g, ''));
                      if (!Number.isNaN(year) && year >= 1900 && year <= new Date().getUTCFullYear()) {
                        setDobYear(year);
                      }
                      if (dobError) setDobError(null);
                    }}
                    maxLength={4}
                  />
                </View>
                <View style={styles.dobInputGroup}>
                  <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Month</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    keyboardType="number-pad"
                    value={String(dobMonth)}
                    onChangeText={(value) => {
                      const month = Number(value.replace(/[^0-9]/g, ''));
                      if (!Number.isNaN(month) && month >= 1 && month <= 12) {
                        setDobMonth(month);
                      }
                      if (dobError) setDobError(null);
                    }}
                    maxLength={2}
                  />
                </View>
                <View style={styles.dobInputGroup}>
                  <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Day</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    keyboardType="number-pad"
                    value={String(dobDay)}
                    onChangeText={(value) => {
                      const day = Number(value.replace(/[^0-9]/g, ''));
                      if (!Number.isNaN(day) && day >= 1 && day <= 31) {
                        setDobDay(day);
                      }
                      if (dobError) setDobError(null);
                    }}
                    maxLength={2}
                  />
                </View>
              </View>
              {dobError ? (
                <Text style={[styles.fieldError, { color: colors.destructive }]}> {dobError} </Text>
              ) : null}

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>
                Gender
              </Text>
              <View style={styles.genderRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    style={[
                      styles.genderBtn,
                      {
                        backgroundColor: gender === g.key ? colors.primary : colors.muted,
                        borderColor: gender === g.key ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setGender(g.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        { color: gender === g.key ? '#fff' : colors.foreground },
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>
                Weight (kg)
              </Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="e.g. 70"
                placeholderTextColor={colors.mutedForeground}
                value={weight}
                onChangeText={(value) => {
                  setWeight(value.replace(/[^0-9.]/g, ''));
                  if (weightError) setWeightError(null);
                }}
                keyboardType="decimal-pad"
                maxLength={5}
              />
              {weightError ? (
                <Text style={[styles.fieldError, { color: colors.destructive }]}> {weightError} </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Step 2: Conditions */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepHint, { color: colors.mutedForeground }]}>
              Select all that apply. This helps personalize your health guidance.
            </Text>
            {CONDITIONS.map((c) => {
              const isSelected = conditions.includes(c.key);
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[
                    styles.conditionCard,
                    {
                      backgroundColor: isSelected ? colors.primaryMuted : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleCondition(c.key)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.conditionCheck,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.muted,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {isSelected && <Feather name="check" size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.conditionLabel, { color: colors.foreground }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 3: Medications & History */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Current Medications (optional)
              </Text>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                List medications you're taking, e.g. "Metformin 500mg, Amlodipine 5mg"
              </Text>
              <TextInput
                style={[styles.textArea, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="Enter medications…"
                placeholderTextColor={colors.mutedForeground}
                value={medicationsText}
                onChangeText={setMedicationsText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>
                Medical History / Allergies (optional)
              </Text>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                Include past surgeries, allergies, or important conditions
              </Text>
              <TextInput
                style={[styles.textArea, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="e.g. Penicillin allergy, appendectomy 2018…"
                placeholderTextColor={colors.mutedForeground}
                value={historyText}
                onChangeText={setHistoryText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttons}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.backBtn, { borderColor: colors.border }]}
              onPress={() => setStep((s) => s - 1)}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={16} color={colors.foreground} />
              <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary, flex: step > 1 ? 1 : undefined }]}
            onPress={step < TOTAL_STEPS ? handleNext : handleSubmit}
            disabled={saveMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>
              {step < TOTAL_STEPS ? 'Continue' : saveMutation.isPending ? 'Saving…' : 'Get Started'}
            </Text>
            {step < TOTAL_STEPS && <Feather name="arrow-right" size={16} color="#fff" />}
          </TouchableOpacity>
        </View>

        <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
          Your health data is stored securely and never shared without consent.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 24, gap: 8 },
  logo: {
    width: 60, height: 60, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  stepRow: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  stepDot: { height: 8, borderRadius: 4 },
  stepContent: { gap: 12, marginBottom: 24 },
  fieldCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  fieldHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 6, lineHeight: 17 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontFamily: 'Inter_400Regular',
  },
  textArea: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 80,
  },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  genderText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  stepHint: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  conditionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1.5, padding: 14,
  },
  conditionCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  conditionLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  buttons: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
  },
  backBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
    width: '100%',
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  privacy: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18, marginBottom: 8 },
  dobRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dobInputGroup: {
    flex: 1,
  },
  fieldError: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 8 },
});
