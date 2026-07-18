import React, { useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/contexts/UserContext';
import { useQueryClient } from '@tanstack/react-query';

export default function LogoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout } = useUser();

  useEffect(() => {
    let mounted = true;
    (async () => {
      await queryClient.clear();
      await logout();
      if (mounted) router.replace('/onboarding');
    })();
    return () => {
      mounted = false;
    };
  }, [logout, queryClient, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>Logging out...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
