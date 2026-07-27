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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { TransactionRow } from '../components/TransactionRow';
import { Search, Plus } from '../theme/components/icons';
import type { EscrowStatus } from '../theme/tokens';

type FilterKey = 'all' | 'awaiting' | 'shipped' | 'done';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All active' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'done', label: 'Done' },
];

const MOCK_LINKS = [
  {
    transaction_id: '1',
    title: 'Nike Air Max 270',
    subtitle: 'Kwame O.',
    amount: '450.00',
    date: '24 Jul',
    status: 'SHIPPED' as EscrowStatus,
    initials: 'KO',
    railOn: 3,
  },
  {
    transaction_id: '2',
    title: 'Ankara dress',
    subtitle: 'Link shared',
    amount: '320.00',
    date: '25 Jul',
    status: 'AWAITING_DEPOSIT' as EscrowStatus,
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
    status: 'FUNDS_SECURED' as EscrowStatus,
    initials: 'YM',
    urgentNote: 'Ship within 48h',
    railOn: 2,
  },
  {
    transaction_id: '4',
    title: 'iPhone 13 case',
    subtitle: 'Ama D.',
    amount: '85.00',
    date: '19 Jul',
    status: 'FUNDS_RELEASED' as EscrowStatus,
    initials: 'AD',
    railOn: 4,
  },
  {
    transaction_id: '5',
    title: 'Leather bag',
    subtitle: 'Link shared',
    amount: '250.00',
    date: '27 Jul',
    status: 'LINK_CREATED' as EscrowStatus,
    initials: '',
    railOn: 0,
  },
];

export function LinksScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState<FilterKey>('all');
  const [search, setSearch] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  const filtered = MOCK_LINKS.filter((tx) => {
    if (filter === 'awaiting') return tx.status === 'AWAITING_DEPOSIT' || tx.status === 'LINK_CREATED';
    if (filter === 'shipped') return tx.status === 'SHIPPED' || tx.status === 'FUNDS_SECURED';
    if (filter === 'done') return tx.status === 'FUNDS_RELEASED' || tx.status === 'FUNDS_REFUNDED';
    return true;
  }).filter((tx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return tx.title.toLowerCase().includes(q) || tx.subtitle.toLowerCase().includes(q);
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
        <Pressable style={styles.addBtn}>
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
        {filtered.map((tx) => (
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
            onPress={() => {}}
          />
        ))}
      </View>

      {filtered.length === 0 && (
        <View style={styles.empty}>
          <Text style={[typography.subhead, { color: inkColors.tertiary }]}>
            No escrows found
          </Text>
          <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 4 }]}>
            {search ? 'Try a different search' : 'Create a link to get started'}
          </Text>
        </View>
      )}
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
});
