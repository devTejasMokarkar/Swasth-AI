import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetProfile, useGetCredits, useGetMedications, useGetFiles } from '@workspace/api-client-react';
import { useUser } from '@/contexts/UserContext';

const CONDITION_LABELS: Record<string, string> = {
  blood_pressure: 'Blood Pressure',
  diabetes: 'Diabetes / Sugar',
  thyroid: 'Thyroid',
  none: 'No conditions',
};

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setOnboarded } = useUser();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const { data: profile, isLoading: profileLoading } = useGetProfile();
  const { data: credits, isLoading: creditsLoading } = useGetCredits();
  const { data: medsData } = useGetMedications();
  const { data: filesData } = useGetFiles();

  const medsCount = medsData?.medications?.filter((m) => m.active)?.length ?? 0;
  const filesCount = filesData?.files?.length ?? 0;

  const creditPct = credits ? (credits.remaining / credits.limit) * 100 : 100;
  const creditColor =
    creditPct > 50 ? colors.success : creditPct > 20 ? colors.warning : colors.emergency;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primaryMuted }]}
              onPress={() => router.push('/onboarding')}
              activeOpacity={0.8}
            >
              <Feather name="edit-2" size={14} color={colors.primary} />
              <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.emergencyLight }]}
              onPress={() => router.push('/logout')}
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={14} color={colors.emergency} />
              <Text style={[styles.logoutText, { color: colors.emergency }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar */}
        <View style={[styles.avatarCard, { backgroundColor: colors.primary }]}>
          <View style={styles.avatarCircle}>
            <Feather name="user" size={32} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.avatarTitle}>{profile?.name || 'Health Profile'}</Text>
            {profile && (
              <Text style={styles.avatarSub}>
                {profile.age}y · {profile.gender} · {profile.weightKg}kg
              </Text>
            )}
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{medsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Meds</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{filesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Health Files</Text>
          </View>
        </View>

        {/* AI Credits */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: colors.infoLight }]}>
              <Feather name="zap" size={16} color={colors.info} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>AI Credits</Text>
          </View>

          {creditsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : credits ? (
            <>
              <View style={[styles.creditBar, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.creditFill,
                    { width: `${Math.max(0, creditPct)}%` as any, backgroundColor: creditColor },
                  ]}
                />
              </View>
              <View style={styles.creditRow}>
                <Text style={[styles.creditText, { color: colors.mutedForeground }]}>
                  {credits.remaining} remaining of {credits.limit}
                </Text>
                <Text style={[styles.creditReset, { color: colors.mutedForeground }]}>
                  Resets {new Date(credits.resetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Medical Profile */}
        {profileLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : profile ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryMuted }]}>
                <Feather name="heart" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Medical Profile</Text>
            </View>
            <InfoRow label="Age" value={`${profile.age} years`} />
            <InfoRow
              label="Gender"
              value={profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
            />
            <InfoRow label="Weight" value={`${profile.weightKg} kg`} />
            <InfoRow
              label="Conditions"
              value={
                profile.conditions.length
                  ? profile.conditions.map((c) => CONDITION_LABELS[c] ?? c).join(', ')
                  : 'None'
              }
            />
            {profile.medicationsText ? (
              <InfoRow label="Medications" value={profile.medicationsText} />
            ) : null}
            {profile.historyText ? (
              <InfoRow label="Medical History" value={profile.historyText} />
            ) : null}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.noProfile, { color: colors.mutedForeground }]}>
              No profile set up. Tap Edit to add your medical information.
            </Text>
          </View>
        )}

        {/* App info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={16} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>About</Text>
          </View>
          <Text style={[styles.about, { color: colors.mutedForeground }]}>
            AI Health Companion v1.0{'\n'}
            This app is not a medical device and does not provide diagnoses.
            Always consult a qualified healthcare professional for medical advice.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  editBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  logoutText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  avatarCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 18,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTitle: { color: '#fff', fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  avatarSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 16, alignItems: 'center', gap: 4,
  },
  statNumber: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  creditBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  creditFill: { height: '100%', borderRadius: 4 },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between' },
  creditText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  creditReset: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 1, paddingVertical: 8, gap: 12,
  },
  infoLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 0.4 },
  infoValue: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 0.6, textAlign: 'right' },
  noProfile: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 8 },
  about: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  loader: { marginVertical: 8 },
});
