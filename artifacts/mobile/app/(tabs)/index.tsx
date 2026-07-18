import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { DailyCard } from '@/components/DailyCard';
import { MedicationCard } from '@/components/MedicationCard';
import {
  useGetDailyRecommendation,
  useGetMedications,
  useGetReadings,
  useGetProfile,
  useLogMedication,
  getGetMedicationsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const { data: recData, isLoading: recLoading, error: recError, refetch: refetchRec } =
    useGetDailyRecommendation();

  const { data: medsData, isLoading: medsLoading, refetch: refetchMeds } =
    useGetMedications();

  const { data: readingsData, refetch: refetchReadings } = useGetReadings();
  const { data: profileData } = useGetProfile();

  const logMutation = useLogMedication();

  const activeMeds = medsData?.medications?.filter((m) => m.active) ?? [];
  const recentReadings = readingsData?.readings?.slice(0, 3) ?? [];

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRec(), refetchMeds(), refetchReadings()]);
    setRefreshing(false);
  }, []);

  const handleLog = async (id: string, status: 'taken' | 'missed' | 'snoozed') => {
    await logMutation.mutateAsync({ id, data: { status } });
    queryClient.invalidateQueries({ queryKey: getGetMedicationsQueryKey() });
  };

  const formatReading = (r: typeof recentReadings[0]) => {
    if (r.type === 'bp') return `${r.systolic}/${r.diastolic} mmHg`;
    if (r.type === 'sugar') return `${r.value} mg/dL`;
    if (r.type === 'weight') return `${r.value} kg`;
    return '';
  };

  const readingIcon = (type: string): keyof typeof Feather.glyphMap => {
    if (type === 'bp') return 'heart';
    if (type === 'sugar') return 'droplet';
    return 'trending-down';
  };

  const readingLabel = (type: string) => {
    if (type === 'bp') return 'Blood Pressure';
    if (type === 'sugar') return 'Blood Sugar';
    return 'Weight';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {getGreeting()}{profileData?.name ? ` ${profileData.name}` : ''}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Health Overview</Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/profile')}
            activeOpacity={0.7}
          >
            <Feather name="user" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: colors.infoLight, borderColor: colors.info + '40' }]}>
          <Feather name="info" size={12} color={colors.info} />
          <Text style={[styles.disclaimerText, { color: colors.info }]}>
            Not a medical diagnosis. Always consult a doctor for any health concerns.
          </Text>
        </View>

        {/* Daily Recommendation Card */}
        {recLoading ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.primary }]}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.loadingText}>Generating your health card…</Text>
          </View>
        ) : recError ? (
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="cloud-off" size={24} color={colors.mutedForeground} />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Couldn't load recommendation. {'\n'}Check your connection and try again.
            </Text>
            <TouchableOpacity onPress={() => refetchRec()} style={[styles.retryBtn, { borderColor: colors.primary }]}>
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : recData ? (
          <DailyCard recommendation={recData} />
        ) : null}

        {/* Recent Readings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Readings</Text>
            <TouchableOpacity onPress={() => router.push('/add-reading')} activeOpacity={0.7}>
              <View style={[styles.addBtn, { backgroundColor: colors.primaryMuted }]}>
                <Feather name="plus" size={14} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>Log</Text>
              </View>
            </TouchableOpacity>
          </View>

          {recentReadings.length === 0 ? (
            <View style={[styles.emptyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="bar-chart-2" size={16} color={colors.mutedForeground} />
              <Text style={[styles.emptyRowText, { color: colors.mutedForeground }]}>
                No readings yet — tap Log to start tracking
              </Text>
            </View>
          ) : (
            <View style={styles.readingsRow}>
              {recentReadings.map((r) => (
                <View
                  key={r.id}
                  style={[styles.readingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Feather name={readingIcon(r.type)} size={16} color={colors.primary} />
                  <Text style={[styles.readingValue, { color: colors.foreground }]}>
                    {formatReading(r)}
                  </Text>
                  <Text style={[styles.readingType, { color: colors.mutedForeground }]}>
                    {readingLabel(r.type)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Today's Medications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Medications {activeMeds.length > 0 ? `(${activeMeds.length})` : ''}
            </Text>
            <TouchableOpacity onPress={() => router.push('/add-medication')} activeOpacity={0.7}>
              <View style={[styles.addBtn, { backgroundColor: colors.primaryMuted }]}>
                <Feather name="plus" size={14} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>Add</Text>
              </View>
            </TouchableOpacity>
          </View>

          {medsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : activeMeds.length === 0 ? (
            <View style={[styles.emptyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="plus-circle" size={16} color={colors.mutedForeground} />
              <Text style={[styles.emptyRowText, { color: colors.mutedForeground }]}>
                No medications yet — add your first one
              </Text>
            </View>
          ) : (
            activeMeds.slice(0, 3).map((med) => (
              <MedicationCard
                key={med.id}
                medication={med}
                onTaken={() => handleLog(med.id, 'taken')}
                onSnoozed={() => handleLog(med.id, 'snoozed')}
                onMissed={() => handleLog(med.id, 'missed')}
              />
            ))
          )}
          {activeMeds.length > 3 && (
            <TouchableOpacity
              style={[styles.viewAllBtn, { borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/medications')}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                View all {activeMeds.length} medications
              </Text>
              <Feather name="chevron-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/symptoms')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryMuted }]}>
                <Feather name="activity" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.foreground }]}>Log Symptoms</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/add-reading')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}>
                <Feather name="bar-chart-2" size={20} color={colors.info} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.foreground }]}>Log Reading</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/files')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.warningLight }]}>
                <Feather name="upload" size={20} color={colors.warning} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.foreground }]}>Upload File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  greeting: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', marginTop: 2 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  disclaimer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, padding: 10, marginBottom: 16,
    borderWidth: 1,
  },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  loadingCard: {
    borderRadius: 20, padding: 32, marginHorizontal: 0, marginBottom: 16,
    alignItems: 'center', gap: 12,
  },
  loadingText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_400Regular' },
  errorCard: {
    borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, alignItems: 'center', gap: 10,
  },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  retryBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  addBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  emptyRowText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  readingsRow: { flexDirection: 'row', gap: 10 },
  readingCard: {
    flex: 1, padding: 14, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', gap: 4,
  },
  readingValue: { fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  readingType: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  loader: { marginTop: 16 },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  viewAllText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 14,
    alignItems: 'center', gap: 8,
  },
  quickActionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionText: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center' },
});
