import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surfaces, ink as inkColors, layout, space, line, shape, states } from '../theme/tokens';
import { typography } from '../theme/typography';
import { ArrowLeft, ChevronRight, Lock, Shield, Smartphone } from '../theme/components/icons';
import { api, friendlyError } from '../api/client';

export function SecurityScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const res = await api.get('/auth/sessions');
      return res.data.sessions;
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/sessions/revoke-other');
    },
    onSuccess: () => {
      Alert.alert('Success', 'Signed out of all other devices.');
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (error) => {
      Alert.alert('Error', friendlyError(error));
    }
  });

  const handleChangePin = () => {
    // Navigate to a dedicated Change PIN screen when built
    Alert.alert('Change PIN', 'This feature is coming soon.');
  };

  const handleRevokeOther = () => {
    Alert.alert(
      'Sign Out Other Devices',
      'Are you sure you want to sign out of all other devices?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => revokeMutation.mutate() }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={inkColors.primary} />
        </Pressable>
        <Text style={typography.title}>Security</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={[typography.label, { color: inkColors.tertiary, marginBottom: space.s2 }]}>AUTHENTICATION</Text>
        
        <Pressable style={styles.row} onPress={handleChangePin}>
          <View style={styles.iconBox}>
            <Lock size={20} color={inkColors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={typography.subhead}>Change PIN</Text>
            <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 2 }]}>
              Update your 6-digit security PIN
            </Text>
          </View>
          <ChevronRight size={16} color={inkColors.tertiary} />
        </Pressable>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Lock size={20} color={inkColors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={typography.subhead}>Biometric Login</Text>
            <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 2 }]}>
              Use Face ID or Fingerprint
            </Text>
          </View>
          <Text style={[typography.subhead, { color: inkColors.tertiary }]}>Setup</Text>
        </View>

        <Text style={[typography.label, { color: inkColors.tertiary, marginTop: space.s6, marginBottom: space.s2 }]}>ACTIVE SESSIONS</Text>
        
        {isLoadingSessions ? (
          <ActivityIndicator size="small" color={inkColors.primary} style={{ marginTop: space.s4 }} />
        ) : (
          <>
            {sessions?.map((session: any) => (
              <View key={session.session_id} style={[styles.sessionCard, { marginBottom: space.s2 }]}>
                <Text style={typography.subhead}>{session.device_name || 'Unknown Device'}</Text>
                <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 2 }]}>
                  {session.is_current ? 'Current Device' : `Last active: ${new Date(session.last_active_at).toLocaleDateString()}`}
                </Text>
              </View>
            ))}
          </>
        )}

        <Pressable 
          style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: space.s3, marginTop: space.s4, borderRadius: shape.r2, backgroundColor: surfaces.sunken }, revokeMutation.isPending && { opacity: 0.5 }]} 
          onPress={handleRevokeOther}
          disabled={revokeMutation.isPending}
        >
          <Shield size={20} color={states.danger.deep} />
          <Text style={[typography.body, { color: states.danger.deep, marginLeft: 8 }]}>
            {revokeMutation.isPending ? 'Signing out...' : 'Sign out of all other devices'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    paddingVertical: space.s3,
    gap: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: line.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: layout.gutter,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.s3,
    backgroundColor: surfaces.surface,
    paddingHorizontal: space.s3,
    borderRadius: shape.r2,
    marginBottom: space.s2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: shape.r1,
    backgroundColor: surfaces.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.s3,
  },
  rowText: {
    flex: 1,
  },
  sessionCard: {
    backgroundColor: surfaces.surface,
    padding: layout.padSheet,
    borderRadius: shape.r2,
    borderLeftWidth: 3,
    borderLeftColor: states.secure.fill,
  },
});
