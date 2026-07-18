import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { RiskBadge } from '@/components/RiskBadge';
import { EmptyState } from '@/components/EmptyState';
import {
  useGetSymptomLogs,
  useAnalyzeSymptoms,
  getGetSymptomLogsQueryKey,
  type SymptomLog,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

const COMMON_SYMPTOMS = [
  'Headache', 'Fever', 'Cough', 'Fatigue',
  'Nausea', 'Dizziness', 'Back pain', 'Sore throat',
];

function EmergencyBanner({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.emergencyBanner, { backgroundColor: colors.emergencyLight }]}>
      <Feather name="alert-triangle" size={20} color={colors.emergency} />
      <View style={styles.emergencyContent}>
        <Text style={[styles.emergencyTitle, { color: colors.emergency }]}>Emergency Detected</Text>
        <Text style={[styles.emergencyBody, { color: colors.emergency }]}>
          Your symptoms may require immediate emergency care. Do not wait.
        </Text>
        <TouchableOpacity
          style={[styles.emergencyCall, { backgroundColor: colors.emergency }]}
          onPress={() => Linking.openURL('tel:112')}
          activeOpacity={0.8}
        >
          <Feather name="phone" size={14} color="#fff" />
          <Text style={styles.emergencyCallText}>Call Emergency Services</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="x" size={18} color={colors.emergency} />
      </TouchableOpacity>
    </View>
  );
}

export default function SymptomsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const [input, setInput] = useState('');
  const [showEmergency, setShowEmergency] = useState(false);
  const [lastResult, setLastResult] = useState<SymptomLog | null>(null);

  const { data, isLoading, refetch } = useGetSymptomLogs();
  const analyzeMutation = useAnalyzeSymptoms();

  const logs = data?.logs ?? [];

  const handleChip = (chip: string) => {
    setInput((prev) => (prev ? `${prev}, ${chip}` : chip));
  };

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
        setShowEmergency(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      queryClient.invalidateQueries({ queryKey: getGetSymptomLogsQueryKey() });
    } catch (err: any) {
      const status = err?.status;
      if (status === 402) {
        Alert.alert(
          'Credits Used Up',
          "You've used all your AI credits this month. Credits reset after 30 days.",
        );
      } else if (status === 503) {
        Alert.alert('Service Unavailable', "Couldn't reach the health assistant. Try again shortly.");
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    }
  };

  const tierLabel = (tier: string) => {
    switch (tier) {
      case 'home_care': return 'Home care recommended';
      case 'monitor': return 'Monitor for 24-48h';
      case 'see_doctor_24h': return 'See a doctor today';
      case 'emergency': return 'EMERGENCY';
      default: return tier;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={[styles.title, { color: colors.foreground }]}>Symptom Checker</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Describe your symptoms for an AI-powered health assessment
        </Text>

        {/* Emergency banner */}
        {showEmergency && <EmergencyBanner onClose={() => setShowEmergency(false)} />}

        {/* Input */}
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Describe your symptoms in detail…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Quick chips */}
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
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="search" size={16} color={input.trim() ? '#fff' : colors.mutedForeground} />
                <Text
                  style={[
                    styles.analyzeBtnText,
                    { color: input.trim() ? '#fff' : colors.mutedForeground },
                  ]}
                >
                  Analyze Symptoms
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            Not a medical diagnosis. Consult a doctor for any concerns.
          </Text>
        </View>

        {/* Latest result */}
        {lastResult && !lastResult.isEmergency && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>Analysis Result</Text>
            <RiskBadge tier={lastResult.tier as any} score={lastResult.riskScore} />
            <Text style={[styles.resultReason, { color: colors.foreground }]}>{lastResult.aiReason}</Text>
            <View style={styles.adviceList}>
              {lastResult.advice.map((a, i) => (
                <View key={i} style={styles.adviceItem}>
                  <View style={[styles.adviceDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.adviceText, { color: colors.foreground }]}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* History */}
        {logs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Past Assessments</Text>
            {logs.map((log) => (
              <View
                key={log.id}
                style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                    {new Date(log.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                  <RiskBadge tier={log.tier as any} score={log.riskScore} compact />
                </View>
                <Text style={[styles.historySymptoms, { color: colors.foreground }]} numberOfLines={2}>
                  {log.inputText}
                </Text>
                {log.isEmergency && (
                  <View style={[styles.emergencyTag, { backgroundColor: colors.emergencyLight }]}>
                    <Feather name="alert-triangle" size={10} color={colors.emergency} />
                    <Text style={[styles.emergencyTagText, { color: colors.emergency }]}>
                      Emergency — logged for reference
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {!isLoading && logs.length === 0 && !lastResult && (
          <View style={styles.emptyHistory}>
            <Text style={[styles.emptyHistoryText, { color: colors.mutedForeground }]}>
              No symptom logs yet. Enter your symptoms above.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 16, lineHeight: 20 },
  emergencyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  emergencyContent: { flex: 1, gap: 6 },
  emergencyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emergencyBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  emergencyCall: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start',
  },
  emergencyCallText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  inputCard: {
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16, gap: 12,
  },
  textInput: {
    minHeight: 96, fontSize: 15, fontFamily: 'Inter_400Regular',
    lineHeight: 22, padding: 0,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 14,
  },
  analyzeBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  disclaimer: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 16 },
  resultCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16, gap: 12 },
  resultLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultReason: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  adviceList: { gap: 8 },
  adviceItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  adviceDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  adviceText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  section: { gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  historyCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  historySymptoms: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  emergencyTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
  },
  emergencyTagText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  emptyHistory: { padding: 24, alignItems: 'center' },
  emptyHistoryText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
