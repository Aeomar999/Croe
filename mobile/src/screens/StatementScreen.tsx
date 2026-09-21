import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, layout, space, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { TransactionRow } from '../components/TransactionRow';
import { ArrowLeft } from '../theme/components/icons';
import { useEscrowList } from '../hooks/useEscrow';
import { useAuthStore } from '../stores/auth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import type { EscrowStatus } from '../theme/tokens';

export function StatementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = user?.user_id;
  const { data: escrows } = useEscrowList();

  const terminalEscrows = React.useMemo(() => {
    return (escrows || []).filter(tx => 
      ['FUNDS_RELEASED', 'FUNDS_REFUNDED', 'CANCELLED'].includes(tx.current_status)
    );
  }, [escrows]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={inkColors.primary} />
        </Pressable>
        <Text style={typography.title}>Statement</Text>
      </View>

      <FlatList
        data={terminalEscrows}
        keyExtractor={item => item.transaction_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[typography.body, { color: inkColors.tertiary, textAlign: 'center', marginTop: space.s8 }]}>
            No completed transactions found.
          </Text>
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
  list: {
    padding: layout.gutter,
    gap: space.s3,
  },
});
