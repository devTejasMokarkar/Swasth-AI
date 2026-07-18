import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAddMedication, getGetMedicationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

const CONDITION_OPTIONS = [
  { value: 'blood_pressure', label: 'Blood Pressure' },
  { value: 'diabetes', label: 'Diabetes / Sugar' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'other', label: 'Other' },
];

const TIMES_PER_DAY_OPTIONS = [1, 2, 3, 4];

// Common presets per condition
const PRESETS: Record<string, { name: string; dose: string }[]> = {
  blood_pressure: [
    { name: 'Amlodipine', dose: '5mg' },
    { name: 'Metoprolol', dose: '25mg' },
    { name: 'Lisinopril', dose: '10mg' },
  ],
  diabetes: [
    { name: 'Metformin', dose: '500mg' },
    { name: 'Glibenclamide', dose: '5mg' },
    { name: 'Insulin', dose: 'As prescribed' },
  ],
  thyroid: [
    { name: 'Levothyroxine', dose: '50mcg' },
    { name: 'Thyroxine', dose: '25mcg' },
  ],
};

export default function AddMedicationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const addMutation = useAddMedication();

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [condition, setCondition] = useState('');
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [withFood, setWithFood] = useState(false);

  const presets = condition ? PRESETS[condition] ?? [] : [];

  const applyPreset = (preset: { name: string; dose: string }) => {
    setName(preset.name);
    setDose(preset.dose);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter the medication name.');
      return;
    }
    if (!dose.trim()) {
      Alert.alert('Dose Required', 'Please enter the dose (e.g. 500mg).');
      return;
    }

    try {
      await addMutation.mutateAsync({
        data: { name: name.trim(), dose: dose.trim(), condition, timesPerDay, withFood },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: getGetMedicationsQueryKey() });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save medication. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Presets (shown when condition is selected) */}
        {presets.length > 0 && (
          <View style={[styles.presetBox, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '30' }]}>
            <Text style={[styles.presetTitle, { color: colors.primary }]}>Common presets</Text>
            <View style={styles.presetChips}>
              {presets.map((p) => (
                <TouchableOpacity
                  key={p.name}
                  style={[styles.presetChip, { backgroundColor: colors.primary }]}
                  onPress={() => applyPreset(p)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.presetChipText}>{p.name} {p.dose}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.presetNote, { color: colors.primary }]}>
              Tap to pre-fill — you must confirm the dose yourself.
            </Text>
          </View>
        )}

        {/* Medication Name */}
        <View style={[styles.fieldGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Medication Name *</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            placeholder="e.g. Metformin"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            autoCapitalize="words"
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>
            Dose *
          </Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            placeholder="e.g. 500mg, 1 tablet"
            placeholderTextColor={colors.mutedForeground}
            value={dose}
            onChangeText={setDose}
            returnKeyType="done"
          />
        </View>

        {/* Condition */}
        <View style={[styles.fieldGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>For Condition</Text>
          <View style={styles.optionGrid}>
            {CONDITION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: condition === opt.value ? colors.primary : colors.muted,
                    borderColor: condition === opt.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setCondition(condition === opt.value ? '' : opt.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: condition === opt.value ? '#fff' : colors.foreground },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Times per day */}
        <View style={[styles.fieldGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Times per Day</Text>
          <View style={styles.timesRow}>
            {TIMES_PER_DAY_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.timeBtn,
                  {
                    backgroundColor: timesPerDay === t ? colors.primary : colors.muted,
                    borderColor: timesPerDay === t ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTimesPerDay(t)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.timeBtnText,
                    { color: timesPerDay === t ? '#fff' : colors.foreground },
                  ]}
                >
                  {t}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* With food */}
          <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>Take with food</Text>
              <Text style={[styles.switchHint, { color: colors.mutedForeground }]}>
                Reminder will mention to take with meals
              </Text>
            </View>
            <Switch
              value={withFood}
              onValueChange={setWithFood}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={addMutation.isPending}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {addMutation.isPending ? 'Adding…' : 'Add Medication'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  presetBox: {
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 8,
  },
  presetTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  presetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  presetChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  presetChipText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_500Medium' },
  presetNote: { fontSize: 11, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  fieldGroup: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: 'Inter_400Regular',
  },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  optionText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  timesRow: { flexDirection: 'row', gap: 10 },
  timeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
    alignItems: 'center',
  },
  timeBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, paddingTop: 12, marginTop: 4,
  },
  switchLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  switchHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  saveBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
