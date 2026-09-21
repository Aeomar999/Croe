/**
 * ProfileScreen — user info, KYC status, settings
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Pill } from '../theme/components/Pill';
import { Avatar } from '../theme/components/Avatar';
import { ChevronRight, Shield, Bell, FileText, HelpCircle, LogOut } from '../theme/components/icons';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile, useKycStatus } from '../hooks/useUser';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

function SettingsRow({ icon, label, value, onPress, showChevron = true }: SettingsRowProps) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <View style={styles.settingsIcon}>{icon}</View>
      <Text style={styles.settingsLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? (
        <Text style={styles.settingsValue}>{value}</Text>
      ) : null}
      {showChevron ? (
        <ChevronRight size={16} color={inkColors.tertiary} />
      ) : null}
    </Pressable>
  );
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { signOut } = useAuth();
  
  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();
  const { data: kyc, isLoading: isLoadingKyc } = useKycStatus();

  const isLoading = isLoadingProfile || isLoadingKyc;
  
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={inkColors.primary} />
      </View>
    );
  }

  const phoneStr = profile?.phone_number || '';
  const score = profile?.trust_score ?? 100;
  const tier = kyc?.tier ?? 0;
  const kycStatus = kyc?.status ?? 'PENDING';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={typography.heading}>Profile</Text>

      {/* User card */}
      <View style={styles.userCard}>
        <Avatar initials={phoneStr ? phoneStr.slice(-2) : '??'} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: inkColors.primary }]}>User</Text>
          <Text style={[typography.caption, { marginTop: 2 }]}>{phoneStr}</Text>
        </View>
        {kycStatus === 'VERIFIED' && tier > 0 ? (
          <Pill state="done" label="Verified" isEnd />
        ) : (
          <Pill state="caution" label="Unverified" isEnd />
        )}
      </View>

      {/* Trust score */}
      <View style={styles.trustCard}>
        <View style={styles.trustRow}>
          <View style={styles.trustIcon}>
            <Shield size={20} color={states.secure.fill} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.subhead}>Trust score</Text>
            <Text style={[typography.caption, { marginTop: 2 }]}>Based on your transaction history</Text>
          </View>
          <Text style={[typography.title, { color: states.secure.deep }]}>{score}</Text>
        </View>
        <View style={styles.trustBar}>
          <View style={[styles.trustBarFill, { width: `${Math.max(0, Math.min(100, score))}%` }]} />
        </View>
      </View>

      {/* KYC tier */}
      <View style={styles.kycCard}>
        <View style={styles.trustRow}>
          <View style={[styles.trustIcon, { backgroundColor: states.caution.wash }]}>
            <FileText size={20} color={states.caution.deep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.subhead}>KYC tier</Text>
            <Text style={[typography.caption, { marginTop: 2 }]}>Tier {tier} — {tier > 0 ? 'Verified' : 'Unverified'}</Text>
          </View>
          <Pill state={tier > 0 ? "done" : "caution"} label={`Tier ${tier}`} isEnd />
        </View>
        {tier < 2 && (
          <Text style={[typography.caption, { marginTop: space.s3, color: inkColors.tertiary }]}>
            Upgrade to Tier {tier + 1} to unlock higher limits.
          </Text>
        )}
      </View>

      {/* Settings */}
      <View style={styles.settingsSection}>
        <SettingsRow
          icon={<Bell size={20} color={inkColors.primary} />}
          label="Notifications"
          value="On"
          onPress={() => navigation.navigate('Notifications')}
        />
        <SettingsRow
          icon={<FileText size={20} color={inkColors.primary} />}
          label="KYC verification"
          value={`Tier ${tier}`}
          onPress={() => navigation.navigate('KycStatus')}
        />
        <SettingsRow
          icon={<HelpCircle size={20} color={inkColors.primary} />}
          label="Help centre"
          onPress={() => navigation.navigate('HelpCentre')}
        />
        <SettingsRow
          icon={<Shield size={20} color={inkColors.primary} />}
          label="Security"
          onPress={() => navigation.navigate('Security')}
        />
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={signOut}>
        <LogOut size={20} color={inkColors.tertiary} />
        <Text style={[typography.label, { color: inkColors.tertiary }]}>Log out</Text>
      </Pressable>

      <Text style={[typography.caption, { textAlign: 'center', marginTop: space.s4 }]}>
        Croe v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  content: {
    paddingHorizontal: layout.gutter,
    paddingBottom: 120,
    gap: space.s6,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
    gap: space.s4,
  },
  trustCard: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  trustIcon: {
    width: 40,
    height: 40,
    borderRadius: shape.r1,
    backgroundColor: states.secure.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustBar: {
    height: layout.allocBarHeight,
    backgroundColor: line.primary,
    borderRadius: shape.full,
    marginTop: space.s4,
    overflow: 'hidden',
  },
  trustBarFill: {
    height: '100%',
    backgroundColor: states.secure.fill,
    borderRadius: shape.full,
  },
  kycCard: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
  },
  settingsSection: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: 14,
    paddingHorizontal: space.s4,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: shape.r1,
    backgroundColor: surfaces.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    ...typography.label,
    flex: 1,
  },
  settingsValue: {
    ...typography.caption,
    color: inkColors.tertiary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
    height: layout.buttonHeight,
    backgroundColor: surfaces.surface,
    borderRadius: shape.r2,
    borderWidth: 1,
    borderColor: line.primary,
  },
});

