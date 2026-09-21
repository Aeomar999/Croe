import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, layout, space, shape, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { TransactionRow } from '../components/TransactionRow';
import { ArrowLeft, Search } from '../theme/components/icons';
import { useEscrowList } from '../hooks/useEscrow';
import { useAuthStore } from '../stores/auth';
import { StateIllustration } from '../theme/components/StateIllustration';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import type { EscrowStatus } from '../theme/tokens';

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = user?.user_id;
  const [query, setQuery] = useState('');
  const { data: escrows } = useEscrowList();

  const filteredEscrows = React.useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return (escrows || []).filter(tx => 
      (tx.item_description?.toLowerCase() || '').includes(q) ||
      (tx.transaction_id?.toLowerCase() || '').includes(q)
    );
  }, [query, escrows]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={inkColors.primary} />
        </Pressable>
        <View style={styles.searchBar}>
          <Search size={18} color={inkColors.tertiary} />
          <TextInput
            style={styles.input}
            placeholder="Search item or ID..."
            placeholderTextColor={inkColors.tertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      <FlatList
        data={filteredEscrows}
        keyExtractor={item => item.transaction_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <StateIllustration type="empty-no-transactions" style={styles.emptyIllustration} />
            <Text style={[typography.body, { color: inkColors.tertiary, textAlign: 'center', marginTop: space.s4 }]}>
              {query ? 'No results found' : 'Start typing to search'}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isBuyer = item.buyer_id === currentUserId;
          const initials = isBuyer ? 'B' : 'V';
          const subtitle = isBuyer ? 'Sent' : 'Link shared';
          return (
            <TransactionRow
              title={item.item_description || `Transaction ${item.transaction_id.slice(0, 4)}`}
              subtitle={subtitle}
              amount={item.amount}
              date={new Date(item.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              status={item.current_status as EscrowStatus}
              initials={initials}
              railOn={index % 4}
              onPress={() => navigation.navigate('TransactionStatus', { transactionId: item.transaction_id })}
            />
          );
        }}
      />
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.full,
    paddingHorizontal: space.s3,
    height: 40,
    gap: space.s2,
  },
  input: {
    flex: 1,
    ...typography.body,
    height: '100%',
  },
  list: {
    padding: layout.gutter,
    gap: space.s3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: space.s8,
    paddingHorizontal: space.s4,
  },
  emptyIllustration: {
    width: 180,
    height: 180,
  },
});
