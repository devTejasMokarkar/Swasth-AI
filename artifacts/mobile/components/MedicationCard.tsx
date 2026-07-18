import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { Medication } from '@workspace/api-client-react';

interface MedicationCardProps {
  medication: Medication;
  onTaken?: () => void;
  onSnoozed?: () => void;
  onMissed?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
}

export function MedicationCard({
  medication,
  onTaken,
  onSnoozed,
  onMissed,
  onEdit,
  showActions = true,
}: MedicationCardProps) {
  const colors = useColors();

  const conditionLabel = medication.condition || null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
          <Feather name="plus-circle" size={20} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{medication.name}</Text>
          <Text style={[styles.dose, { color: colors.mutedForeground }]}>
            {medication.dose} · {medication.timesPerDay}x/day
            {medication.withFood ? ' · with food' : ''}
          </Text>
          {conditionLabel && (
            <View style={[styles.conditionPill, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.conditionText, { color: colors.primary }]}>{conditionLabel}</Text>
            </View>
          )}
        </View>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.editBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {showActions && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.successLight }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTaken?.();
            }}
            activeOpacity={0.7}
          >
            <Feather name="check" size={14} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>Taken</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.warningLight }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSnoozed?.();
            }}
            activeOpacity={0.7}
          >
            <Feather name="clock" size={14} color={colors.warning} />
            <Text style={[styles.actionText, { color: colors.warning }]}>Snooze</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.emergencyLight }]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onMissed?.();
            }}
            activeOpacity={0.7}
          >
            <Feather name="x" size={14} color={colors.emergency} />
            <Text style={[styles.actionText, { color: colors.emergency }]}>Missed</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  dose: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  conditionPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  conditionText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  editBtn: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
});
