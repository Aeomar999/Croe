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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { BalanceBlock } from '../theme/components/BalanceBlock';
import { Pill } from '../theme/components/Pill';
import { TransactionRow } from '../components/TransactionRow';
import { Bell, Plus } from '../theme/components/icons';
import { useEscrowList } from '../hooks/useEscrow';

// Mock data for demo
const MOCK_TRANSACTIONS = [
  {
    transaction_id: '1',
    title: 'Nike Air Max 270',
    subtitle: 'Kwame O.',
    amount: '450.00',
    date: '24 Jul',
    status: 'SHIPPED' as const,
    initials: 'KO',
    railOn: 3,
  },
  {
    transaction_id: '2',
    title: 'Ankara dress',
    subtitle: 'Link shared',
    amount: '320.00',
    date: '25 Jul',
    status: 'AWAITING_DEPOSIT' as const,
    initials: '',
    urgentNote: 'Expires in 21h',
    railOn: 1,
  },
  {
    transaction_id: '3',
    title: 'JBL Flip 6 speaker',
    subtitle: 'Yaw M.',
    amount: '780.00',
    date: '26 Jul',
    status: 'FUNDS_SECURED' as const,
    initials: 'YM',
    urgentNote: 'Ship within 48h',
    railOn: 2,
    isMine: true,
  },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data: escrows, isLoading, refetch } = useEscrowList();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const displayData = escrows?.length ? escrows : MOCK_TRANSACTIONS;

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
          Hello, there
        </Text>
        <Pressable style={styles.bellBtn}>
          <Bell size={21} color={inkColors.primary} />
        </Pressable>
      </View>

      {/* Balance block */}
      <BalanceBlock
        label="Total held in escrow"
        amount="1,635.00"
        pillState="secure"
        pillLabel="Protected"
        showEye
        allocation={{ secured: 1315, awaiting: 320 }}
        actions={[
          { title: 'New link', variant: 'ink', onPress: () => {} },
          { title: 'Withdraw', variant: 'line', onPress: () => {} },
        ]}
      />

      {/* Escrows section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={typography.subhead}>Escrows</Text>
          <Text style={[typography.label, { color: inkColors.tertiary }]}>See all</Text>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRail}
        >
          <View style={[styles.chip, styles.chipActive]}>
            <Text style={[styles.chipText, styles.chipTextActive]}>All active</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Awaiting</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Shipped</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Done</Text>
          </View>
        </ScrollView>

        {/* Transaction list */}
        <View style={styles.txList}>
          {MOCK_TRANSACTIONS.map((tx) => (
            <TransactionRow
              key={tx.transaction_id}
              title={tx.title}
              subtitle={tx.subtitle}
              amount={tx.amount}
              date={tx.date}
              status={tx.status}
              initials={tx.initials}
              urgentNote={tx.urgentNote}
              railOn={tx.railOn}
            />
          ))}
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
