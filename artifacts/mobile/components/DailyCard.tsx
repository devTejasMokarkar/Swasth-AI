import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { DailyRecommendation } from '@workspace/api-client-react';

interface DailyCardProps {
  recommendation: DailyRecommendation;
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statItem}>
      <Feather name={icon} size={16} color="#fff" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DietItem({
  food,
  timing,
  benefit,
}: {
  food: string;
  timing: string;
  benefit: string;
}) {
  return (
    <View style={styles.dietItem}>
      <View style={styles.imageFrame} accessibilityLabel={`${food} visual`}>
        <Text style={styles.imageBadge}>AI visual</Text>
        <View style={styles.imageGlow} />
        <Text style={styles.imageFoodMark}>{food.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.dietFood}>{food}</Text>
      <Text style={styles.dietTiming}>{timing}</Text>
      <Text style={styles.dietBenefit}>{benefit}</Text>
    </View>
  );
}

export function DailyCard({ recommendation: rec }: DailyCardProps) {
  const colors = useColors();
  const waterGoalLiters = rec.waterGoalLiters ?? (rec as any).water_goal_liters ?? 0;
  const sleepTargetHours = rec.sleepTargetHours ?? (rec as any).sleep_target_hours ?? 0;
  const greeting = rec.greeting ?? (rec as any).greeting ?? '';
  const personalizedTip = rec.personalizedTip ?? (rec as any).personalized_tip ?? '';
  const dietPlan = rec.dietPlan ?? (rec as any).diet_plan ?? [];
  const warnings = rec.warnings ?? (rec as any).warnings ?? [];

  const items = [
    {
      food: dietPlan[0]?.food ?? 'Fresh fruit',
      timing: dietPlan[0]?.timing ?? 'midday',
      benefit: dietPlan[0]?.benefit ?? 'Supports steady energy',
    },
    {
      food: dietPlan[1]?.food ?? 'Leafy greens',
      timing: dietPlan[1]?.timing ?? 'dinner',
      benefit: dietPlan[1]?.benefit ?? 'Fits a balanced, condition-aware plan',
    },
    {
      food: dietPlan[2]?.food ?? 'Nuts',
      timing: dietPlan[2]?.timing ?? 'morning',
      benefit: dietPlan[2]?.benefit ?? 'Supports satiety and nutrition',
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.primary }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.cardTitle}>Daily Health Card</Text>
            <Text style={styles.cardDate}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.dietPill}>
            <Feather name="sparkles" size={12} color="#fff" />
            <Text style={styles.dietPillText}>AI diet plan</Text>
          </View>
        </View>
        <Text style={styles.greeting}>{greeting}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today&apos;s diet plan</Text>
        <Text style={styles.sectionSubtitle}>
          Dynamic suggestions based on your profile, history, and readings
        </Text>
      </View>

      <View style={styles.dietGrid}>
        {items.map((item) => (
          <DietItem
            key={item.food + item.timing}
            food={item.food}
            timing={item.timing}
            benefit={item.benefit}
          />
        ))}
      </View>

      <View style={styles.statsGrid}>
        <StatItem icon="droplet" label="Water" value={`${waterGoalLiters}L`} />
        <View style={styles.statDivider} />
        <StatItem icon="moon" label="Sleep" value={`${sleepTargetHours}h`} />
        <View style={styles.statDivider} />
        <StatItem icon="activity" label="Move" value="Today" />
      </View>

      <View style={styles.tipBox}>
        <Feather name="star" size={14} color="rgba(255,255,255,0.9)" />
        <Text style={styles.tipText}>{personalizedTip}</Text>
      </View>

      {warnings.length > 0 && (
        <View style={styles.warningsBox}>
          {warnings.map((w, i) => (
            <View key={i} style={styles.warningItem}>
              <Feather name="alert-triangle" size={12} color="#FCA5A5" />
              <Text style={styles.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    padding: 20,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardDate: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  dietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  dietPillText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  greeting: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    opacity: 0.9,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 2,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  dietGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dietItem: {
    flex: 1,
    gap: 6,
  },
  imageFrame: {
    minHeight: 86,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  imageBadge: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  imageGlow: {
    position: 'absolute',
    right: -14,
    bottom: -14,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  imageFoodMark: {
    position: 'absolute',
    right: 12,
    bottom: 6,
    color: '#fff',
    fontSize: 30,
    lineHeight: 32,
    fontFamily: 'Inter_700Bold',
    opacity: 0.2,
  },
  dietFood: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  dietTiming: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    opacity: 0.9,
  },
  dietBenefit: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    opacity: 0.8,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tipText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    opacity: 0.9,
  },
  warningsBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 6,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  warningText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
