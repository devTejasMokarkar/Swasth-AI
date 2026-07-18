import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  type Medication,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

export default function MedicationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading, error, refetch } = useGetMedications();
  const logMutation = useLogMedication();
  const deleteMutation = useDeleteMedication();
  const updateMutation = useUpdateMedication();

  const meds = data?.medications ?? [];
  const active = meds.filter((m) => m.active);
  const inactive = meds.filter((m) => !m.active);
  const displayed = showInactive ? meds : active;

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
    Alert.alert(
      'Delete Medication',
      `Remove ${med.name} from your medication list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMutation.mutateAsync({ id: med.id });
            queryClient.invalidateQueries({ queryKey: getGetMedicationsQueryKey() });
          },
        },
      ],
    );
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

  const renderItem = ({ item }: { item: Medication }) => (
    <MedicationCard
      medication={item}
      onTaken={() => handleLog(item.id, 'taken')}
      onSnoozed={() => handleLog(item.id, 'snoozed')}
      onMissed={() => handleLog(item.id, 'missed')}
      showActions={item.active}
      onEdit={() => {
        Alert.alert(item.name, `${item.dose} · ${item.timesPerDay}x/day`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: item.active ? 'Pause' : 'Reactivate',
            onPress: () => handleToggleActive(item),
          },
          { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
        ]);
      }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Medications</Text>
        <TouchableOpacity
          style={[styles.addFab, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/add-medication')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      {inactive.length > 0 && (
        <View style={[styles.tabRow, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, !showInactive && [styles.tabActive, { borderBottomColor: colors.primary }]]}
            onPress={() => setShowInactive(false)}
          >
            <Text style={[styles.tabText, { color: !showInactive ? colors.primary : colors.mutedForeground }]}>
              Active ({active.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, showInactive && [styles.tabActive, { borderBottomColor: colors.primary }]]}
            onPress={() => setShowInactive(true)}
          >
            <Text style={[styles.tabText, { color: showInactive ? colors.primary : colors.mutedForeground }]}>
              Paused ({inactive.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <EmptyState
            icon="alert-circle"
            title="Couldn't load medications"
            description="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon="plus-circle"
            title="No medications yet"
            description="Add your medications to track adherence and get reminders."
            actionLabel="Add Medication"
            onAction={() => router.push('/add-medication')}
          />
        </View>
      ) : (
        <FlatList
          data={displayed}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!displayed.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  addFab: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12, paddingHorizontal: 8, marginRight: 16,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
