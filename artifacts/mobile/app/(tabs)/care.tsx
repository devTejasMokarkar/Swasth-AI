import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { MedicationCard } from '@/components/MedicationCard';
import { EmptyState } from '@/components/EmptyState';
import {
  useGetMedications,
  useLogMedication,
  useDeleteMedication,
  useUpdateMedication,
  getGetMedicationsQueryKey,
  useGetSymptomLogs,
  useAnalyzeSymptoms,
  getGetSymptomLogsQueryKey,
  type Medication,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

const COMMON_SYMPTOMS = ['Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea'];

export default function CareScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const topPad = insets.top;

  // Medications
  const { data, isLoading, error, refetch } = useGetMedications();
  const logMutation = useLogMedication();
  const deleteMutation = useDeleteMedication();
  const updateMutation = useUpdateMedication();

  const meds = data?.medications ?? [];

  const handleLog = async (id: string, status: 'taken' | 'missed' | 'snoozed') => {
    try {
      await logMutation.mutateAsync({ id, data: { status } });
      Haptics.notificationAsync(
        status === 'taken'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      queryClient.invalidateQueries({ queryKey: getGetMedicationsQueryKey() });
    } catch {
      Alert.alert('Error', 'Could not log medication. Try again.');
    }
  };

  const handleDelete = (med: Medication) => {
    Alert.alert('Delete Medication', `Remove ${med.name} from your medication list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMutation.mutateAsync({ id: med.id });
          queryClient.invalidateQueries({ queryKey: getGetMedicationsQueryKey() });
        },
      },
    ]);
  };

  const handleToggleActive = async (med: Medication) => {
    await updateMutation.mutateAsync({
      id: med.id,
      data: {
        name: med.name,
        dose: med.dose,
        condition: med.condition,
        timesPerDay: med.timesPerDay,
        withFood: med.withFood,
        active: !med.active,
      },
    });
    queryClient.invalidateQueries({ queryKey: getGetMedicationsQueryKey() });
  };

  // Symptoms
  const [input, setInput] = useState('');
  const [lastResult, setLastResult] = useState<any | null>(null);
  const { data: logsData } = useGetSymptomLogs();
  const analyzeMutation = useAnalyzeSymptoms();

  const handleChip = (chip: string) => setInput((p) => (p ? `${p}, ${chip}` : chip));

  const handleAnalyze = async () => {
    if (!input.trim()) {
      Alert.alert('Describe your symptoms', 'Please enter your symptoms before analyzing.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await analyzeMutation.mutateAsync({ data: { inputText: input.trim() } });
      setLastResult(result);
      setInput('');
      if (result.isEmergency) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      queryClient.invalidateQueries({ queryKey: getGetSymptomLogsQueryKey() });
    } catch (err: any) {
      const status = err?.status;
      if (status === 402) {
        Alert.alert('Credits Used Up', "You've used all your AI credits this month.");
      } else if (status === 503) {
        Alert.alert('Service Unavailable', "Couldn't reach the health assistant. Try again shortly.");
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    }
  };

  const renderMed = ({ item }: { item: Medication }) => (
    <MedicationCard
      medication={item}
      onTaken={() => handleLog(item.id, 'taken')}
      onSnoozed={() => handleLog(item.id, 'snoozed')}
      onMissed={() => handleLog(item.id, 'missed')}
      onEdit={() =>
        Alert.alert(item.name, `${item.dose} · ${item.timesPerDay}x/day`, [
          { text: 'Cancel', style: 'cancel' },
          { text: item.active ? 'Pause' : 'Reactivate', onPress: () => handleToggleActive(item) },
          { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
        ])
      }
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Care</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Medications</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : error ? (
          <EmptyState
            icon="alert-circle"
            title="Couldn't load medications"
            description="Check your connection and try again."
            onAction={() => refetch()}
            actionLabel="Retry"
          />
        ) : meds.length === 0 ? (
          <EmptyState
            icon="plus-circle"
            title="No medications yet"
            description="Add your medications to track adherence and get reminders."
            actionLabel="Add Medication"
            onAction={() => {}}
          />
        ) : (
          <View style={styles.listBlock}>
            {meds.map((item) => (
              <MedicationCard
                key={item.id}
                medication={item}
                onTaken={() => handleLog(item.id, 'taken')}
                onSnoozed={() => handleLog(item.id, 'snoozed')}
                onMissed={() => handleLog(item.id, 'missed')}
                onEdit={() =>
                  Alert.alert(item.name, `${item.dose} · ${item.timesPerDay}x/day`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: item.active ? 'Pause' : 'Reactivate', onPress: () => handleToggleActive(item) },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
                  ])
                }
              />
            ))}
          </View>
        )}

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Symptom Checker</Text>
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Describe your symptoms in detail…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.chipsRow}>
            {COMMON_SYMPTOMS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => handleChip(s)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: colors.foreground }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.analyzeBtn,
              { backgroundColor: input.trim() ? colors.primary : colors.muted },
            ]}
            onPress={handleAnalyze}
            disabled={analyzeMutation.isPending || !input.trim()}
            activeOpacity={0.8}
          >
            {analyzeMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather
                  name="search"
                  size={16}
                  color={input.trim() ? '#fff' : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.analyzeBtnText,
                    { color: input.trim() ? '#fff' : colors.mutedForeground },
                  ]}
                >
                  Analyze
                </Text>
              </>
            )}
          </TouchableOpacity>

          {lastResult && !lastResult.isEmergency && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>Analysis Result</Text>
              <Text style={[styles.resultReason, { color: colors.foreground }]}>
                {lastResult.aiReason}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  content: { padding: 16, gap: 12, paddingBottom: 120 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  divider: { height: 1, marginVertical: 12 },
  listBlock: { gap: 12 },
  inputCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  textInput: { minHeight: 64, fontSize: 14, fontFamily: 'Inter_400Regular' },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' as any },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 8, marginTop: 6 },
  chipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginTop: 10, justifyContent: 'center' },
  analyzeBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  resultCard: { marginTop: 12, borderRadius: 10, borderWidth: 1, padding: 10 },
  resultLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  resultReason: { marginTop: 8, fontSize: 14, fontFamily: 'Inter_400Regular' },
});
