import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { surfaces, ink as inkColors, space, layout, states, line, shape } from '../theme/tokens';
import { typography } from '../theme/typography';
import { ArrowLeft, FileText, Shield } from '../theme/components/icons';
import { useKycStatus } from '../hooks/useUser';
import { Pill } from '../theme/components/Pill';

export function KycScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { data: kyc, isLoading } = useKycStatus();

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={inkColors.primary} />
      </View>
    );
  }

  const tier = kyc?.tier ?? 0;
  const status = kyc?.status ?? 'PENDING';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={inkColors.primary} />
        </Pressable>
        <Text style={typography.heading}>KYC Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.iconCircle}>
            <Shield size={32} color={states.secure.deep} />
          </View>
          <Text style={[typography.title, { marginTop: space.s4 }]}>Current Tier: {tier}</Text>
          <Text style={[typography.body, { color: inkColors.tertiary, textAlign: 'center', marginTop: space.s2 }]}>
            {tier === 0 && 'You are unverified. Please upgrade to unlock higher limits.'}
            {tier === 1 && 'You are verified at Tier 1 (phone verified).'}
            {tier === 2 && 'You are verified at Tier 2 (ID verified).'}
          </Text>
          
          <View style={{ marginTop: space.s4 }}>
            <Pill state={status === 'VERIFIED' ? 'done' : 'caution'} label={status} />
          </View>
        </View>

        {tier < 2 && (
          <View style={styles.upgradeSection}>
            <Text style={typography.title}>Upgrade to Tier {tier + 1}</Text>
            <Text style={[typography.body, { color: inkColors.secondary, marginTop: space.s2 }]}>
              Submit a valid government ID to unlock higher transaction limits and enhanced trust score.
            </Text>
            
            <Pressable style={styles.primaryBtn}>
              <FileText size={20} color={surfaces.surface} />
              <Text style={styles.primaryBtnText}>Upload ID Document</Text>
            </Pressable>
          </View>
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: space.s4,
    borderBottomWidth: 1,
    borderBottomColor: line.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    padding: layout.gutter,
    gap: space.s6,
  },
  statusCard: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: line.primary,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: states.secure.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeSection: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
    borderWidth: 1,
    borderColor: line.primary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
    height: layout.buttonHeight,
    backgroundColor: inkColors.primary,
    borderRadius: shape.r2,
    marginTop: space.s6,
  },
  primaryBtnText: {
    ...typography.label,
    color: surfaces.surface,
  },
});
