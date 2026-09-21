/**
 * LinksScreen — active escrow list with filter/search
 * Shows all escrows with status filters and search
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { TransactionRow } from '../components/TransactionRow';
import { Search, Plus } from '../theme/components/icons';
import { useNavigation } from '@react-navigation/native';
import { useEscrowList } from '../hooks/useEscrow';
import { StateIllustration } from '../theme/components/StateIllustration';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import type { EscrowStatus } from '../theme/tokens';

type FilterKey = 'all' | 'awaiting' | 'shipped' | 'done';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All active' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'done', label: 'Done' },
];

export function LinksScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState<FilterKey>('all');
  const [search, setSearch] = React.useState('');
  
  const { data: escrows, isLoading, refetch } = useEscrowList();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = (escrows || []).filter((tx: any) => {
    if (filter === 'awaiting') return tx.current_status === 'AWAITING_DEPOSIT' || tx.current_status === 'LINK_CREATED';
    if (filter === 'shipped') return tx.current_status === 'SHIPPED' || tx.current_status === 'FUNDS_SECURED';
    if (filter === 'done') return tx.current_status === 'FUNDS_RELEASED' || tx.current_status === 'FUNDS_REFUNDED' || tx.current_status === 'RESOLVED_AUTO';
    return true;
  }).filter((tx: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const desc = tx.item_description || '';
    return desc.toLowerCase().includes(q) || tx.transaction_id.toLowerCase().includes(q);
  });

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
        <Text style={typography.heading}>Links</Text>
        <Pressable style={styles.addBtn} onPress={() => navigation.navigate('CreateEscrow')}>
          <Plus size={20} color={inkColors.primary} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={18} color={inkColors.tertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search escrows..."
          placeholderTextColor={inkColors.tertiary}
        />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRail}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Results count */}
      <Text style={[typography.caption, { color: inkColors.tertiary }]}>
        {filtered.length} escrow{filtered.length !== 1 ? 's' : ''}
      </Text>

      {/* Escrow list */}
      <View style={styles.txList}>
        {isLoading && !refreshing ? (
          <ActivityIndicator color={inkColors.primary} style={{ marginTop: space.s8 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <StateIllustration type="empty-no-transactions" style={styles.emptyIllustration} />
            <Text style={[typography.subhead, { color: inkColors.tertiary }]}>
              No escrows found
            </Text>
            <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 4 }]}>
              {search ? 'Try a different search' : 'Create a link to get started'}
            </Text>
          </View>
        ) : (
          filtered.map((tx: any, idx: number) => (
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
    gap: space.s4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: shape.full,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    height: layout.inputMinHeight,
    paddingHorizontal: space.s4,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.r2,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: inkColors.primary,
    padding: 0,
  },
  chipRail: {
    gap: space.s2,
  },
  chip: {
    paddingHorizontal: space.s4,
    height: 40,
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
  empty: {
    alignItems: 'center',
    paddingVertical: space.s12,
  },
  emptyIllustration: {
    width: 180,
    height: 180,
  },
});
