/**
 * HomeScreen — vendor dashboard
 * Design: home.html
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { BalanceBlock } from '../theme/components/BalanceBlock';
import { Pill } from '../theme/components/Pill';
import { TransactionRow } from '../components/TransactionRow';
import { Bell, Plus } from '../theme/components/icons';
import { useEscrowList } from '../hooks/useEscrow';
import { useUserProfile } from '../hooks/useUser';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import type { EscrowStatus } from '../theme/tokens';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { data: profile } = useUserProfile();
  const { data: escrows, isLoading, refetch } = useEscrowList();
  const [refreshing, setRefreshing] = React.useState(false);

  const [filter, setFilter] = React.useState('ALL');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredEscrows = React.useMemo(() => {
    if (!escrows) return [];
    if (filter === 'ALL') return escrows;
    if (filter === 'AWAITING') return escrows.filter(tx => tx.current_status === 'AWAITING_DEPOSIT');
    if (filter === 'SHIPPED') return escrows.filter(tx => tx.current_status === 'SHIPPED');
    if (filter === 'DONE') return escrows.filter(tx => ['FUNDS_RELEASED', 'FUNDS_REFUNDED', 'DELIVERED_CONFIRMED', 'RESOLVED_AUTO'].includes(tx.current_status));
    return escrows;
  }, [escrows, filter]);

  // Compute balances
  const secured = escrows?.filter(tx => tx.current_status === 'FUNDS_SECURED').reduce((acc, tx) => acc + parseFloat(tx.amount), 0) || 0;
  const awaiting = escrows?.filter(tx => tx.current_status === 'AWAITING_DEPOSIT').reduce((acc, tx) => acc + parseFloat(tx.amount), 0) || 0;
  const total = secured + awaiting;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={inkColors.tertiary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.heading, { color: inkColors.tertiary }]}>
          Hello, {profile?.phone_number ? profile.phone_number.slice(-4) : 'there'}
        </Text>
        <Pressable style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Bell size={21} color={inkColors.primary} />
        </Pressable>
      </View>

      {/* Balance block */}
      <BalanceBlock
        label="Total held in escrow"
        amount={total.toFixed(2)}
        pillState="secure"
        pillLabel="Protected"
        showEye
        allocation={{ secured, awaiting }}
        actions={[
          { title: 'New link', variant: 'ink', onPress: () => navigation.navigate('CreateEscrow') },
          { title: 'Statement', variant: 'line', onPress: () => navigation.navigate('Statement') },
        ]}
      />

      {/* Escrows section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={typography.subhead}>Escrows</Text>
          <Pressable onPress={() => navigation.navigate('Search')}>
            <Text style={[typography.label, { color: inkColors.tertiary }]}>Search</Text>
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRail}
        >
          <Pressable style={[styles.chip, filter === 'ALL' && styles.chipActive]} onPress={() => setFilter('ALL')}>
            <Text style={[styles.chipText, filter === 'ALL' && styles.chipTextActive]}>All active</Text>
          </Pressable>
          <Pressable style={[styles.chip, filter === 'AWAITING' && styles.chipActive]} onPress={() => setFilter('AWAITING')}>
            <Text style={[styles.chipText, filter === 'AWAITING' && styles.chipTextActive]}>Awaiting</Text>
          </Pressable>
          <Pressable style={[styles.chip, filter === 'SHIPPED' && styles.chipActive]} onPress={() => setFilter('SHIPPED')}>
            <Text style={[styles.chipText, filter === 'SHIPPED' && styles.chipTextActive]}>Shipped</Text>
          </Pressable>
          <Pressable style={[styles.chip, filter === 'DONE' && styles.chipActive]} onPress={() => setFilter('DONE')}>
            <Text style={[styles.chipText, filter === 'DONE' && styles.chipTextActive]}>Done</Text>
          </Pressable>
        </ScrollView>

        {/* Transaction list */}
        <View style={styles.txList}>
          {isLoading && !refreshing ? (
            <ActivityIndicator color={inkColors.primary} style={{ marginTop: space.s8 }} />
          ) : !filteredEscrows || filteredEscrows.length === 0 ? (
            <Text style={[typography.body, { color: inkColors.tertiary, textAlign: 'center', marginTop: space.s6 }]}>
              No active escrows
            </Text>
          ) : (
            filteredEscrows.map((tx: any, idx: number) => (
              <TransactionRow
                key={tx.transaction_id}
                title={tx.item_description || `Transaction ${tx.transaction_id.slice(0, 4)}`}
                subtitle={tx.role === 'buyer' ? 'Sent' : 'Link shared'}
                amount={tx.amount}
                date={new Date(tx.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                status={tx.current_status as EscrowStatus}
                initials={tx.role === 'buyer' ? 'B' : 'V'}
                railOn={idx % 4}
                onPress={() => navigation.navigate('TransactionStatus', { transactionId: tx.transaction_id })}
              />
            ))
          )}
        </View>
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
    paddingHorizontal: layout.gutter,
    paddingBottom: 120,
    gap: space.s6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bellBtn: {
    width: layout.iconBtnSize,
    height: layout.iconBtnSize,
    borderRadius: shape.full,
    backgroundColor: surfaces.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: space.s3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipRail: {
    gap: space.s2,
  },
  chip: {
    paddingHorizontal: space.s4,
    height: layout.buttonHeightSm,
    borderRadius: shape.full,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: inkColors.primary,
    borderColor: inkColors.primary,
  },
  chipText: {
    ...typography.label,
    fontSize: 13,
    color: inkColors.secondary,
  },
  chipTextActive: {
    color: surfaces.surface,
  },
  txList: {
    gap: space.s3,
  },
});
