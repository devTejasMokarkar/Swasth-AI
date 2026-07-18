import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type Tier = 'home_care' | 'monitor' | 'see_doctor_24h' | 'emergency';

interface RiskBadgeProps {
  tier: Tier;
  score: number;
  compact?: boolean;
}

const TIER_CONFIG: Record<Tier, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  home_care: { label: 'Home Care', icon: 'home' },
  monitor: { label: 'Monitor 24-48h', icon: 'eye' },
  see_doctor_24h: { label: 'See Doctor Today', icon: 'user' },
  emergency: { label: 'Emergency', icon: 'alert-circle' },
};

export function RiskBadge({ tier, score, compact = false }: RiskBadgeProps) {
  const colors = useColors();

  const tierColorMap: Record<Tier, string> = {
    home_care: colors.homeCare,
    monitor: colors.warning,
    see_doctor_24h: colors.seeDoctor,
    emergency: colors.emergency,
  };
  const tierBgMap: Record<Tier, string> = {
    home_care: colors.successLight,
    monitor: colors.warningLight,
    see_doctor_24h: '#FEE8D5',
    emergency: colors.emergencyLight,
  };

  const config = TIER_CONFIG[tier];
  const color = tierColorMap[tier];
  const bg = tierBgMap[tier];

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: bg }]}>
        <Feather name={config.icon} size={12} color={color} />
        <Text style={[styles.compactLabel, { color }]}>{config.label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: color + '40' }]}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
          <Feather name={config.icon} size={20} color={color} />
        </View>
        <View>
          <Text style={[styles.tierLabel, { color }]}>{config.label}</Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
            Risk score: {score}/100
          </Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: color }]}>
          <Text style={styles.scoreNumber}>{score}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  scorePill: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
});
