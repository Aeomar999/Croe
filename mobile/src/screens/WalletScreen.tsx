/**
 * WalletScreen — balance, allocation, transaction history
 * Design: wallet.html
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Pill } from '../theme/components/Pill';
import { Eye, ChevronDown } from '../theme/components/icons';
import { Button } from '../theme/components/Button';
import { useEscrowList } from '../hooks/useEscrow';
import type { EscrowStatus } from '../theme/tokens';

function mapStatusToHistory(status: string) {
  switch (status) {
    case 'FUNDS_RELEASED':
    case 'RESOLVED_AUTO':
      return { label: 'Paid out', amountType: 'plus', uiStatus: 'done' as const };
    case 'FUNDS_REFUNDED':
      return { label: 'Refunded', amountType: 'dim', uiStatus: 'done' as const };
    case 'CANCELLED':
    case 'EXPIRED':
      return { label: 'Cancelled', amountType: 'dim', uiStatus: 'pending' as const };
    default:
      return { label: 'Held', amountType: 'neutral', uiStatus: 'secure' as const };
  }
}

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';

export function WalletScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { data: escrows, isLoading } = useEscrowList();

  const history = React.useMemo(() => {
    if (!escrows) return [];
    return escrows.map((tx: any) => {
      const { label, amountType, uiStatus } = mapStatusToHistory(tx.current_status);
      return {
        id: tx.transaction_id,
        title: tx.item_description || `Transaction ${tx.transaction_id.slice(0, 4)}`,
        date: new Date(tx.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        initials: tx.role === 'buyer' ? 'B' : 'V',
        amount: `${amountType === 'plus' ? '+' : amountType === 'dim' ? '−' : ''}GH₵ ${tx.amount}`,
        amountType,
        status: uiStatus,
        label,
      };
    });
  }, [escrows]);

  const available = escrows?.filter((tx: any) => tx.current_status === 'FUNDS_RELEASED').reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0) || 0;
  const inEscrow = escrows?.filter((tx: any) => ['FUNDS_SECURED', 'SHIPPED', 'DELIVERED_CONFIRMED', 'DISPUTE_OPENED'].includes(tx.current_status)).reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0) || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.heading}>Wallet</Text>
        <View style={styles.selector}>
          <View style={styles.selectorMark}>
            <Text style={[typography.label, { fontSize: 13, color: surfaces.surface }]}>A</Text>
          </View>
          <Text style={[typography.label, { fontSize: 14 }]}>All time</Text>
          <ChevronDown size={14} color={inkColors.primary} />
        </View>
      </View>

      {/* Balance */}
      <View style={styles.balanceSheet}>
        <View style={styles.balHead}>
          <Text style={[typography.subhead, { color: inkColors.secondary }]}>Total Paid Out</Text>
          <Pill state="secure" label="Ready" idiom="signal" />
        </View>
        <View style={styles.balTop}>
          <Text style={typography.display}>
            <Text style={{ fontFamily: 'PlusJakartaSans-ExtraBold' }}>GH₵</Text>{available.toFixed(2)}
          </Text>
          <Pressable style={styles.eyeBtn}>
            <Eye size={21} color={inkColors.secondary} />
          </Pressable>
        </View>
        <View style={styles.allocBar}>
          <View style={[styles.allocSeg, { flex: available || 1, backgroundColor: states.secure.fill }]} />
          <View style={[styles.allocSeg, { flex: inEscrow || 1, backgroundColor: states.caution.fill }]} />
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: states.secure.fill }]} />
            <Text style={styles.legendText}>Paid Out</Text>
            <Text style={styles.legendBold}>GH₵ {available.toFixed(2)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: states.caution.fill }]} />
            <Text style={styles.legendText}>In escrow</Text>
            <Text style={styles.legendBold}>GH₵ {inEscrow.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.acts}>
          <Button title="Withdraw" variant="ink" onPress={() => Alert.alert('Notice', 'Withdrawals are automatic directly to your Mobile Money account. Manual withdrawals are not needed.')} />
          <Button title="Statement" variant="line" onPress={() => navigation.navigate('Statement')} />
        </View>
      </View>

      {/* History */}
      <View style={styles.section}>
        <View style={styles.sechead}>
          <Text style={typography.heading}>This week</Text>
          <Text style={[typography.label, { color: inkColors.tertiary }]}>See all</Text>
        </View>
        <View style={styles.table}>
          {isLoading ? (
            <ActivityIndicator color={inkColors.primary} style={{ margin: space.s8 }} />
          ) : history.length === 0 ? (
            <Text style={[typography.body, { textAlign: 'center', margin: space.s8, color: inkColors.tertiary }]}>
              No transaction history
            </Text>
          ) : (
            history.map((tx: any) => (
              <View key={tx.id} style={styles.trow}>
                <View style={styles.trowMain}>
                  <View style={styles.tmark}>
                    <Text style={[typography.label, { color: inkColors.secondary }]}>{tx.initials}</Text>
                  </View>
                  <View style={styles.tlead}>
                    <Text style={styles.ttitle}>{tx.title}</Text>
                    <Text style={styles.tsub}>{tx.date}</Text>
                  </View>
                  <View style={styles.tvals}>
                    <Text style={[
                      styles.tval,
                      tx.amountType === 'plus' && styles.tvalPlus,
                      tx.amountType === 'dim' && styles.tvalDim,
                    ]}>
                      {tx.amount}
                    </Text>
                    <Pill state={tx.status} label={tx.label} isEnd />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={{ flex: 1, minHeight: 20 }} />
      <Text style={styles.footNote}>Payouts arrive in minutes · 2.5% fee deducted</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: surfaces.canvas },
  content: {
    paddingHorizontal: layout.gutter,
    paddingBottom: 120,
    gap: space.s6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: shape.full,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
  },
  selectorMark: {
    width: 28,
    height: 28,
    borderRadius: shape.full,
    backgroundColor: inkColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSheet: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
    gap: space.s3,
  },
  balHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  eyeBtn: {
    width: layout.iconBtnSize,
    height: layout.iconBtnSize,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocBar: {
    flexDirection: 'row',
    height: layout.allocBarHeight,
    borderRadius: shape.full,
    gap: 2,
    overflow: 'hidden',
  },
  allocSeg: { borderRadius: shape.full },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.s3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: shape.full,
  },
  legendText: {
    ...typography.caption,
    fontSize: 11.5,
  },
  legendBold: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
    color: inkColors.primary,
  },
  acts: {
    flexDirection: 'row',
    gap: space.s2,
    marginTop: space.s2,
  },
  section: { gap: space.s3 },
  sechead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  table: { gap: 10 },
  trow: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r2,
  },
  trowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: 10,
    paddingHorizontal: 12,
  },
  tmark: {
    width: 40,
    height: 40,
    borderRadius: shape.r1,
    backgroundColor: surfaces.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlead: { flex: 1, minWidth: 0 },
  ttitle: {
    fontSize: 14.5,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.006,
    color: inkColors.primary,
  },
  tsub: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-Medium',
    color: inkColors.tertiary,
    marginTop: 1,
  },
  tvals: { flex: 0, textAlign: 'right', alignItems: 'flex-end', gap: 2 },
  tval: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.015,
    fontVariant: ['tabular-nums', 'lining-nums'],
  },
  tvalPlus: { color: states.secure.deep },
  tvalDim: { color: inkColors.tertiary },
  footNote: {
    ...typography.caption,
    textAlign: 'center',
    fontSize: 11.5,
  },
});
