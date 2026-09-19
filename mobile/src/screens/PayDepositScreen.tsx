/**
 * PayDepositScreen — buyer's payment view
 * Design: pay-deposit.html
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line, carriers as carrier } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Button } from '../theme/components/Button';
import { Pill } from '../theme/components/Pill';
import { BalanceBlock } from '../theme/components/BalanceBlock';
import { Shield, Lock, ChevronRight } from '../theme/components/icons';

type CarrierKey = 'MTN' | 'TELECEL' | 'AIRTELTIGO';

const CARRIERS: { key: CarrierKey; label: string; bg: string; textColor: string }[] = [
  { key: 'MTN', label: 'MTN', bg: carrier.mtn, textColor: inkColors.primary },
  { key: 'TELECEL', label: 'TEL', bg: carrier.telecel, textColor: '#FFFFFF' },
  { key: 'AIRTELTIGO', label: 'AT', bg: carrier.at, textColor: '#FFFFFF' },
];

export function PayDepositScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedCarrier, setSelectedCarrier] = React.useState<CarrierKey>('MTN');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.lockBtn}>
          <Lock size={18} color={inkColors.primary} />
        </View>
        <Text style={[typography.heading, { flex: 1, textAlign: 'center' }]}>
          Secure payment
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Balance block — buyer's view */}
      <View style={styles.balanceSheet}>
        <View style={styles.balHead}>
          <Text style={[typography.subhead, { color: inkColors.secondary }]}>
            You're paying into escrow
          </Text>
          <Pill state="secure" label="Protected" idiom="signal" />
        </View>
        <Text style={[typography.display, { marginTop: space.s2 }]}>
          <Text style={{ fontFamily: 'PlusJakartaSans-ExtraBold' }}>GH₵</Text>450.00
        </Text>
        <View style={styles.allocBar}>
          <View style={[styles.allocSeg, { flex: 1, backgroundColor: states.secure.fill }]} />
        </View>
        <Text style={[typography.caption, { marginTop: space.s2, color: inkColors.tertiary }]}>
          Held until you confirm delivery
        </Text>
        <View style={styles.itemLine}>
          <Text style={[typography.caption, { color: inkColors.tertiary }]}>Item</Text>
          <Text style={[typography.subhead, { color: inkColors.primary }]}>Nike Air Max 270</Text>
        </View>
        <View style={styles.itemLine}>
          <Text style={[typography.caption, { color: inkColors.tertiary }]}>Protection</Text>
          <Text style={[typography.subhead, { color: inkColors.primary }]}>24h after delivery</Text>
        </View>
      </View>

      {/* Vendor trust row */}
      <View style={styles.vendorRow}>
        <View style={styles.vendorMark}>
          <Text style={[typography.label, { color: inkColors.secondary }]}>AM</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.subhead}>Akosua's Closet</Text>
          <Text style={[typography.caption, { marginTop: 2 }]}>Trust 98 · 214 deliveries</Text>
        </View>
        <Pill state="done" label="Verified" isEnd />
      </View>

      {/* Payment method */}
      <View style={styles.field}>
        <Text style={styles.label}>Payment method</Text>
        <Pressable style={styles.methodRow}>
          <View style={[styles.carrierDot, { backgroundColor: carrier.mtn }]} />
          <View style={{ flex: 1 }}>
            <Text style={typography.subhead}>MTN MoMo</Text>
            <Text style={[typography.caption, { marginTop: 2 }]}>+233 24 123 4567</Text>
          </View>
          <ChevronRight size={18} color={inkColors.tertiary} />
        </Pressable>
      </View>

      {/* Carrier picker */}
      <View style={styles.carrierPicker}>
        {CARRIERS.map((c) => (
          <Pressable
            key={c.key}
            testID={`carrier-${c.key.toLowerCase()}`}
            style={[styles.ctile, selectedCarrier === c.key && styles.ctileActive]}
            onPress={() => setSelectedCarrier(c.key)}
          >
            <View style={[styles.cmark, { backgroundColor: c.bg }]}>
              <Text style={[typography.label, { color: c.textColor, fontSize: 12.5 }]}>{c.label}</Text>
            </View>
            <Text style={[
              styles.cname,
              selectedCarrier === c.key && styles.cnameActive,
            ]}>
              {c.key === 'MTN' ? 'MTN MoMo' : c.key === 'TELECEL' ? 'Telecel' : 'AT Money'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Reassurance wash */}
      <View style={styles.washSecure}>
        <Shield size={19} color={states.secure.deep} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.label, { color: states.secure.deep }]}>
            The seller isn't paid yet
          </Text>
          <Text style={[typography.caption, { color: states.secure.deep, marginTop: 3 }]}>
            Croe holds your money until you confirm the item arrived.
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, minHeight: 20 }} />

      {/* CTA */}
      <View>
        <Button
          testID="payNowBtn"
          title="Pay GH₵ 450.00"
          variant="ink"
          onPress={() => {}}
          fullWidth
        />
        <Text style={styles.footNote}>
          Approved on your phone · Croe never sees your PIN
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingBottom: 24,
    gap: space.s6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.s2,
  },
  lockBtn: {
    width: 44,
    height: 44,
    borderRadius: shape.full,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSheet: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
  },
  balHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocBar: {
    flexDirection: 'row',
    height: layout.allocBarHeight,
    borderRadius: shape.full,
    gap: 2,
    marginTop: 11,
    overflow: 'hidden',
  },
  allocSeg: {
    borderRadius: shape.full,
  },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: line.primary,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    borderRadius: shape.r2,
    padding: 10,
    paddingHorizontal: 12,
  },
  vendorMark: {
    width: 40,
    height: 40,
    borderRadius: shape.r1,
    backgroundColor: surfaces.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.s3,
  },
  field: {
    gap: space.s2,
  },
  label: {
    ...typography.label,
    color: inkColors.secondary,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.r2,
    padding: 12,
    paddingHorizontal: space.s4,
    gap: space.s3,
  },
  carrierDot: {
    width: 8,
    height: 8,
    borderRadius: shape.full,
  },
  carrierPicker: {
    flexDirection: 'row',
    gap: space.s2,
  },
  ctile: {
    flex: 1,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.r3,
    padding: 13,
    alignItems: 'center',
    gap: 9,
  },
  ctileActive: {
    backgroundColor: inkColors.primary,
    borderColor: inkColors.primary,
  },
  cmark: {
    width: 40,
    height: 40,
    borderRadius: shape.r1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cname: {
    ...typography.caption,
    fontWeight: '600',
  },
  cnameActive: {
    color: surfaces.surface,
    fontWeight: '700',
  },
  washSecure: {
    flexDirection: 'row',
    gap: space.s3,
    alignItems: 'flex-start',
    backgroundColor: states.secure.wash,
    borderRadius: shape.r4,
    padding: space.s4,
    paddingLeft: space.s5,
  },
  footNote: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: space.s3,
  },
});
