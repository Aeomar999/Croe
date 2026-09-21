/**
 * TransactionStatusScreen — escrow detail with timeline
 * Design: transaction-status.html
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Button } from '../theme/components/Button';
import { Pill } from '../theme/components/Pill';
import { ArrowLeft, Shield, Check } from '../theme/components/icons';
import { stateToWords, stateToPillState } from '../theme/tokens';
import { useEscrow, useShip, useConfirmDelivery } from '../hooks/useEscrow';
import { useAuthStore } from '../stores/auth';
import type { PillState, EscrowStatus } from '../theme/tokens';

const STEPS = [
  { key: 'LINK_CREATED', label: 'Link live' },
  { key: 'AWAITING_DEPOSIT', label: 'Paid' },
  { key: 'FUNDS_SECURED', label: 'On its way' },
  { key: 'DELIVERED_CONFIRMED', label: 'Delivered' },
] as const;

const STATUS_ORDER: EscrowStatus[] = [
  'LINK_CREATED',
  'AWAITING_DEPOSIT',
  'FUNDS_SECURED',
  'SHIPPED',
  'DELIVERED_CONFIRMED',
];

type Props = NativeStackScreenProps<MainStackParamList, 'TransactionStatus'>;

export function TransactionStatusScreen({ route }: Props) {
  const { transactionId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = user?.user_id;
  
  const { data: escrow, isLoading } = useEscrow(transactionId);
  const shipMutation = useShip();
  const confirmMutation = useConfirmDelivery();

  if (isLoading || !escrow) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={inkColors.primary} />
      </View>
    );
  }

  const status: EscrowStatus = escrow.current_status as EscrowStatus;
  const pillState = (stateToPillState[status] ?? 'pending') as PillState;
  const pillLabel = stateToWords[status] ?? status;
  const currentStepIndex = STATUS_ORDER.indexOf(status);
  
  const isVendor = escrow.vendor_id === currentUserId;
  const isBuyer = escrow.buyer_id === currentUserId;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={inkColors.primary} />
        </Pressable>
        <Text style={[typography.micro, { color: inkColors.tertiary }]}>
          NO. {transactionId.slice(0, 8).toUpperCase()}
        </Text>
        <View style={{ flex: 1 }} />
        <Pill state={pillState} label={pillLabel} isEnd />
      </View>

      {/* Amount block */}
      <View style={styles.amountBlock}>
        <Text style={[typography.caption, { color: inkColors.tertiary }]}>
          Held in escrow
        </Text>
        <Text style={[typography.display, { marginTop: space.s2 }]}>
          <Text style={{ fontFamily: 'PlusJakartaSans-ExtraBold' }}>GH₵</Text>{escrow.amount}
        </Text>
        <View style={styles.itemLine}>
          <Text style={[typography.caption, { color: inkColors.tertiary }]}>{isVendor ? 'Buyer' : 'Vendor'}</Text>
          <Text style={[typography.subhead, { color: inkColors.primary }]}>{isVendor ? 'Customer' : 'Store'}</Text>
        </View>
        <View style={styles.itemLine}>
          <Text style={[typography.caption, { color: inkColors.tertiary }]}>Created</Text>
          <Text style={[typography.subhead, { color: inkColors.primary }]}>
            {new Date(escrow.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Horizontal rail timeline */}
      <View style={styles.timeline}>
        {STEPS.map((step, i) => {
          const isDone = i < currentStepIndex || (i === 0 && currentStepIndex >= 0);
          const isCurrent = i === currentStepIndex;
          return (
            <React.Fragment key={step.key}>
              <View style={styles.step}>
                <View style={[
                  styles.tick,
                  isDone && styles.tickDone,
                  isCurrent && styles.tickCurrent,
                ]}>
                  {isDone ? (
                    <Check size={12} color={surfaces.surface} />
                  ) : isCurrent ? (
                    <View style={styles.tickDot} />
                  ) : null}
                </View>
                <Text style={[
                  styles.stepLabel,
                  (isDone || isCurrent) && styles.stepLabelActive,
                ]}>
                  {step.label}
                </Text>
              </View>
              {i < STEPS.length - 1 ? (
                <View style={[
                  styles.bar,
                  i < currentStepIndex && styles.barDone,
                ]} />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      {/* Wash banner */}
      <View style={styles.wash}>
        <View style={{ marginTop: 1 }}>
          <Shield size={19} color={states.secure.deep} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.label, { color: states.secure.deep }]}>
            {status === 'FUNDS_SECURED' ? (isVendor ? "You're cleared to ship" : "Funds are secured") : "Transaction Protected"}
          </Text>
          <Text style={[typography.caption, { color: states.secure.deep, marginTop: 3 }]}>
            {status === 'FUNDS_SECURED' && isVendor 
              ? "Payment is safely secured in Croe. You'll be paid out when delivery is confirmed." 
              : "Payment is safely held in escrow until the transaction is complete."}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isVendor && status === 'FUNDS_SECURED' && (
          <Button 
            testID="markShippedBtn" 
            title="Mark as shipped" 
            variant="ink" 
            size="sm" 
            onPress={() => shipMutation.mutate(transactionId)} 
            fullWidth 
            isLoading={shipMutation.isPending}
          />
        )}
        {isBuyer && status === 'SHIPPED' && (
          <Button 
            testID="confirmDeliveryBtn" 
            title="Confirm Delivery" 
            variant="ink" 
            size="sm" 
            onPress={() => confirmMutation.mutate(transactionId)} 
            fullWidth 
            isLoading={confirmMutation.isPending}
          />
        )}
      </View>

      <View style={{ flex: 1, minHeight: 20 }} />

      {/* Dispute link */}
      {status === 'DISPUTE_OPENED' || status === 'UNDER_HUMAN_REVIEW' || status === 'RESOLVED_AUTO' ? (
        <Pressable testID="disputeStatusBtn" style={styles.disputeLink} onPress={() => navigation.navigate('DisputeStatus', { transactionId })}>
          <Text style={[typography.label, { color: inkColors.primary }]}>
            View dispute status
          </Text>
        </Pressable>
      ) : (
        <Pressable testID="disputeBtn" style={styles.disputeLink} onPress={() => navigation.navigate('DisputeOpen', { transactionId })}>
          <Text style={[typography.label, { color: inkColors.tertiary }]}>
            Something wrong? Open a dispute
          </Text>
          <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 2 }]}>
            Free · most are resolved in under ten seconds
          </Text>
        </Pressable>
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
    paddingBottom: 24,
    gap: space.s6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  backBtn: {
    width: layout.iconBtnSize,
    height: layout.iconBtnSize,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountBlock: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r4,
    padding: layout.padSheet,
  },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: line.primary,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    borderRadius: shape.r2,
    padding: layout.padSheet,
    gap: 0,
  },
  step: {
    alignItems: 'center',
    gap: space.s2,
  },
  tick: {
    width: layout.tickSize,
    height: layout.tickSize,
    borderRadius: shape.full,
    borderWidth: 1.5,
    borderColor: line.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickDone: {
    backgroundColor: states.secure.fill,
    borderColor: states.secure.fill,
  },
  tickCurrent: {
    borderColor: states.secure.fill,
  },
  tickDot: {
    width: 7,
    height: 7,
    borderRadius: shape.full,
    backgroundColor: states.secure.fill,
  },
  stepLabel: {
    ...typography.micro,
    textTransform: 'none',
    fontSize: 11,
    color: inkColors.tertiary,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: inkColors.primary,
  },
  bar: {
    flex: 1,
    height: layout.railHeight,
    backgroundColor: line.primary,
    marginBottom: 20,
    marginHorizontal: 2,
  },
  barDone: {
    backgroundColor: states.secure.fill,
  },
  wash: {
    flexDirection: 'row',
    gap: space.s3,
    alignItems: 'flex-start',
    backgroundColor: states.secure.wash,
    borderRadius: shape.r4,
    padding: layout.padSheet,
    paddingLeft: space.s5,
  },
  actions: {
    gap: space.s2,
  },
  disputeLink: {
    alignItems: 'center',
    paddingVertical: space.s4,
  },
});
