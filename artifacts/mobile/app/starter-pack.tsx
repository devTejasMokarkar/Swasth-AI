import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/contexts/UserContext';

const FEATURES = [
  '100 Health Credits',
  'AI Health Tips',
  'Symptom Checker',
  'Home Remedy Suggestions',
  'Daily Diet Recommendations',
  'Disease History',
  'AI Health Report',
];

const COMING_SOON_STANDARD = [
  'Unlimited AI Requests',
  'Smart Health Score',
  'Weekly Reports',
  'Medicine Reminder',
  'Advanced AI',
];

const COMING_SOON_PREMIUM = [
  'Unlimited Credits',
  'Family Health Profiles',
  'AI Doctor Chat',
  'ECG & Lab Report Analysis',
  'Priority AI Models',
  'Health Forecasting',
];

export default function StarterPackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setOnboarded } = useUser();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const handleContinue = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setOnboarded(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 24, paddingBottom: bottomPad + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
            <Feather name="award" size={18} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>Starter Pack</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Choose your plan</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Starter is free today and includes 100 Health Credits.
          </Text>
        </View>

        <View style={[styles.card, styles.highlightCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.planName, { color: colors.primary }]}>Starter</Text>
          <Text style={[styles.planPrice, { color: colors.foreground }]}>FREE</Text>
          <Text style={[styles.planMeta, { color: colors.mutedForeground }]}>100 Health Credits</Text>
          <View style={styles.featureList}>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Feather name="check-circle" size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.planRow}>
            <Text style={[styles.planName, { color: colors.foreground }]}>Standard</Text>
            <Text style={[styles.comingSoon, { color: colors.warning }]}>Coming Soon</Text>
          </View>
          <View style={styles.featureList}>
            {COMING_SOON_STANDARD.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.planRow}>
            <Text style={[styles.planName, { color: colors.foreground }]}>Premium</Text>
            <Text style={[styles.comingSoon, { color: colors.warning }]}>Coming Soon</Text>
          </View>
          <View style={styles.featureList}>
            {COMING_SOON_PREMIUM.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Continue with Starter</Text>
          <Feather name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  header: { gap: 8, marginBottom: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  highlightCard: {
    borderWidth: 2,
  },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  planPrice: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  planMeta: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  comingSoon: { fontSize: 12, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  featureList: { gap: 10, marginTop: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontFamily: 'Inter_500Medium', flexShrink: 1 },
  cta: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
  },
  ctaText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
