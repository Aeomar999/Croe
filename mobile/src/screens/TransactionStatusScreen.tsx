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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, states, shape, space, layout, line } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Button } from '../theme/components/Button';
import { Pill } from '../theme/components/Pill';
import { ArrowLeft, Shield, Check } from '../theme/components/icons';
import { stateToWords, stateToPillState } from '../theme/tokens';
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

interface Props {
  transactionId?: string;
}

export function TransactionStatusScreen({ transactionId }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Mock data for now
  const status: EscrowStatus = 'FUNDS_SECURED';
  const pillState = (stateToPillState[status] ?? 'pending') as PillState;
  const pillLabel = stateToWords[status] ?? status;
  const currentStepIndex = STATUS_ORDER.indexOf(status);

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
          NO. CR-89201
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
          <Text style={{ fontFamily: 'PlusJakartaSans-ExtraBold' }}>GH₵</Text>450.00
        </Text>
        <View style={styles.itemLine}>
          <Text style={[typography.caption, { color: inkColors.tertiary }]}>Buyer</Text>
          <Text style={[typography.subhead, { color: inkColors.primary }]}>Kwame O.</Text>
        </View>
        <View style={styles.itemLine}>
          <Text style={[typography.caption, { color: inkColors.tertiary }]}>Paid</Text>
          <Text style={[typography.subhead, { color: inkColors.primary }]}>Today, 13:58</Text>
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
            You're cleared to ship
          </Text>
          <Text style={[typography.caption, { color: states.secure.deep, marginTop: 3 }]}>
            Kwame's payment is safely secured in Croe. You'll be paid out when
            he confirms delivery.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button testID="markShippedBtn" title="Mark as shipped" variant="ink" size="sm" onPress={() => {}} fullWidth />
        <Button testID="messageBuyerBtn" title="Message buyer" variant="line" size="sm" onPress={() => {}} fullWidth />
      </View>

      <View style={{ flex: 1 }} />

      {/* Dispute link */}
      <Pressable testID="disputeBtn" style={styles.disputeLink}>
        <Text style={[typography.label, { color: inkColors.tertiary }]}>
          Something wrong? Open a dispute
        </Text>
        <Text style={[typography.caption, { color: inkColors.tertiary, marginTop: 2 }]}>
          Free · most are resolved in under ten seconds
        </Text>
      </Pressable>
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
