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
import { useAddReading, getGetReadingsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

type ReadingType = 'bp' | 'sugar' | 'weight';

const TYPE_OPTIONS: { key: ReadingType; label: string; unit: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'bp', label: 'Blood Pressure', unit: 'mmHg', icon: 'heart' },
  { key: 'sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: 'droplet' },
  { key: 'weight', label: 'Weight', unit: 'kg', icon: 'trending-down' },
];

const BP_REFERENCE = [
  { label: 'Normal', value: '< 120/80', color: '#22C55E' },
  { label: 'Elevated', value: '120-129/<80', color: '#F59E0B' },
  { label: 'High Stage 1', value: '130-139/80-89', color: '#F97316' },
  { label: 'High Stage 2', value: '≥140/≥90', color: '#DC2626' },
];

const SUGAR_REFERENCE = [
  { label: 'Normal (fasting)', value: '< 100 mg/dL', color: '#22C55E' },
  { label: 'Pre-diabetic', value: '100-125 mg/dL', color: '#F59E0B' },
  { label: 'Diabetic', value: '≥ 126 mg/dL', color: '#DC2626' },
];

export default function AddReadingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const addMutation = useAddReading();

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [type, setType] = useState<ReadingType>('bp');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  const handleSave = async () => {
    const payload: any = { type, note };

    if (type === 'bp') {
      if (!systolic || !diastolic) {
        Alert.alert('Missing Values', 'Please enter both systolic and diastolic values.');
        return;
      }
      payload.systolic = Number(systolic);
      payload.diastolic = Number(diastolic);
    } else {
      if (!value) {
        Alert.alert('Missing Value', `Please enter your ${type === 'sugar' ? 'blood sugar' : 'weight'} reading.`);
        return;
      }
      payload.value = Number(value);
    }

    try {
      await addMutation.mutateAsync({ data: payload });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: getGetReadingsQueryKey() });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save reading. Please try again.');
    }
  };

  const selectedConfig = TYPE_OPTIONS.find((t) => t.key === type)!;
  const reference = type === 'bp' ? BP_REFERENCE : type === 'sugar' ? SUGAR_REFERENCE : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Selector */}
        <View style={[styles.fieldGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reading Type</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: type === opt.key ? colors.primary : colors.muted,
                    borderColor: type === opt.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setType(opt.key);
                  setSystolic(''); setDiastolic(''); setValue('');
                }}
                activeOpacity={0.8}
              >
                <Feather name={opt.icon} size={16} color={type === opt.key ? '#fff' : colors.mutedForeground} />
                <Text style={[styles.typeBtnText, { color: type === opt.key ? '#fff' : colors.foreground }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input fields */}
        <View style={[styles.fieldGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.inputHeader}>
            <View style={[styles.inputIcon, { backgroundColor: colors.primaryMuted }]}>
              <Feather name={selectedConfig.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.inputTitle, { color: colors.foreground }]}>
              {selectedConfig.label}
            </Text>
            <Text style={[styles.inputUnit, { color: colors.mutedForeground }]}>
              {selectedConfig.unit}
            </Text>
          </View>

          {type === 'bp' ? (
            <View style={styles.bpRow}>
              <View style={styles.bpField}>
                <Text style={[styles.bpLabel, { color: colors.mutedForeground }]}>Systolic</Text>
                <TextInput
                  style={[styles.bpInput, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder="120"
                  placeholderTextColor={colors.mutedForeground}
                  value={systolic}
                  onChangeText={setSystolic}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <Text style={[styles.bpSlash, { color: colors.mutedForeground }]}>/</Text>
              <View style={styles.bpField}>
                <Text style={[styles.bpLabel, { color: colors.mutedForeground }]}>Diastolic</Text>
                <TextInput
                  style={[styles.bpInput, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder="80"
                  placeholderTextColor={colors.mutedForeground}
                  value={diastolic}
                  onChangeText={setDiastolic}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>
          ) : (
            <TextInput
              style={[styles.valueInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={type === 'sugar' ? '100' : '70.0'}
              placeholderTextColor={colors.mutedForeground}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              maxLength={6}
            />
          )}

          <TextInput
            style={[styles.noteInput, { color: colors.foreground, borderColor: colors.border }]}
            placeholder="Note (optional) — e.g. fasting, post-meal"
            placeholderTextColor={colors.mutedForeground}
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* Reference ranges */}
        {reference && (
          <View style={[styles.fieldGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reference Ranges</Text>
            {reference.map((r) => (
              <View key={r.label} style={styles.refRow}>
                <View style={[styles.refDot, { backgroundColor: r.color }]} />
                <Text style={[styles.refLabel, { color: colors.foreground }]}>{r.label}</Text>
                <Text style={[styles.refValue, { color: colors.mutedForeground }]}>{r.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={addMutation.isPending}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {addMutation.isPending ? 'Saving…' : 'Save Reading'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  fieldGroup: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  typeRow: { gap: 8 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  typeBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  inputHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  inputTitle: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  inputUnit: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  bpRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bpField: { flex: 1, gap: 6 },
  bpLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  bpInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center',
  },
  bpSlash: { fontSize: 32, fontFamily: 'Inter_300Light', paddingBottom: 8 },
  valueInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center',
  },
  noteInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: 'Inter_400Regular',
  },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  refDot: { width: 10, height: 10, borderRadius: 5 },
  refLabel: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  refValue: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  saveBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
