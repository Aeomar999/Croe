/**
 * TransactionRow — reusable trow for escrow list items
 * Matches design: home.html trow pattern
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { surfaces, ink as inkColors, line, states, shape, space, layout } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Pill } from '../theme/components/Pill';
import type { PillState } from '../theme/tokens';
import { stateToWords, stateToPillState } from '../theme/tokens';
import type { EscrowStatus } from '../theme/tokens';

interface TransactionRowProps {
  title: string;
  subtitle: string;
  amount: string;
  currency?: string;
  date: string;
  status: EscrowStatus;
  initials?: string;
  urgentNote?: string;
  railSteps?: number;
  railOn?: number;
  onPress?: () => void;
}

export function TransactionRow({
  title,
  subtitle,
  amount,
  currency = 'GH₵',
  date,
  status,
  initials,
  urgentNote,
  railOn = 0,
  railSteps = 4,
  onPress,
}: TransactionRowProps) {
  const pillState = (stateToPillState[status] ?? 'pending') as PillState;
  const pillLabel = stateToWords[status] ?? status;
  const isSecure = pillState === 'secure';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {/* Main line */}
      <View style={styles.main}>
        <View style={[styles.mark, isSecure && styles.markSecure]}>
          {initials ? (
            <Text style={[styles.markText, isSecure && styles.markTextSecure]}>
              {initials}
            </Text>
          ) : null}
        </View>
        <View style={styles.lead}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={styles.vals}>
          <Text style={styles.amount}>{currency} {amount}</Text>
          <Text style={styles.meta}>{date}</Text>
        </View>
      </View>

      {/* Rail */}
      <View style={styles.rail}>
        {Array.from({ length: railSteps }).map((_, i) => (
          <View
            key={i}
            style={[styles.railStep, i < railOn && styles.railStepOn]}
          />
        ))}
      </View>

      {/* Footer */}
      <View style={styles.foot}>
        {urgentNote ? (
          <Text style={styles.urgentNote}>{urgentNote}</Text>
        ) : (
          <View />
        )}
        <Pill state={pillState} label={pillLabel} isEnd />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: surfaces.surface,
    borderRadius: shape.r3,
    padding: layout.padSheet,
    gap: space.s3,
  },
  rowPressed: {
    opacity: 0.92,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  mark: {
    width: layout.avatarSize,
    height: layout.avatarSize,
    borderRadius: shape.r2,
    backgroundColor: surfaces.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markSecure: {
    backgroundColor: states.secure.fill,
  },
  markText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: inkColors.primary,
  },
  markTextSecure: {
    color: states.secure.on,
  },
  lead: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.subhead,
    color: inkColors.primary,
  },
  subtitle: {
    ...typography.caption,
    color: inkColors.tertiary,
    marginTop: 1,
  },
  vals: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: inkColors.primary,
  },
  meta: {
    ...typography.caption,
    color: inkColors.tertiary,
    marginTop: 1,
  },
  rail: {
    flexDirection: 'row',
    gap: 2,
    height: layout.railHeight,
  },
  railStep: {
    flex: 1,
    borderRadius: shape.full,
    backgroundColor: line.primary,
  },
  railStepOn: {
    backgroundColor: states.secure.fill,
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgentNote: {
    ...typography.caption,
    color: states.caution.deep,
    fontWeight: '600',
  },
});
