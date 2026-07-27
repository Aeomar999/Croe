/**
 * Table (trow) — the global style for every list of records
 * Escrows, wallet history, evidence, KYC tiers, payouts.
 * Do not invent a second row treatment.
 *
 * trow-main: always. mark · title over subtitle · value over meta.
 * trow-rail: optional 4-step lifecycle.
 * trow-foot: optional context with status.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { surfaces, ink as inkColors, line, states, shape, layout, space, type PillState } from '../tokens';
import { typography } from '../typography';
import { Pill } from './Pill';

// ─── 4-Step Rail ────────────────────────────────────────────────
interface RailProps {
  steps: [boolean, boolean, boolean, boolean]; // which are "on"
  state: PillState;
}

const stateToRailColor: Record<PillState, string> = {
  pending: '#5B5E63',
  secure: states.secure.deep,
  done: states.done.deep,
  caution: states.caution.deep,
  danger: states.danger.deep,
};

export function TableRowRail({ steps, state }: RailProps) {
  const railColor = stateToRailColor[state];
  return (
    <View style={{ flexDirection: 'row', gap: 2, height: layout.railHeight, flex: 0 }}>
      {steps.map((on, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: on ? railColor : line.primary,
            borderRadius: shape.full,
          }}
        />
      ))}
    </View>
  );
}

// ─── Table Row ──────────────────────────────────────────────────
interface TableRowProps {
  initials?: string;
  title: string;
  subtitle?: string;
  amount: string; // e.g. "GH₵ 450.00"
  meta?: string; // e.g. "24 Jul 2026"
  railSteps?: [boolean, boolean, boolean, boolean];
  pillState?: PillState;
  pillLabel?: string;
  pillIsMine?: boolean;
  urgentNote?: string;
  footLabel?: string;
  state?: PillState;
}

export function TableRow({
  initials,
  title,
  subtitle,
  amount,
  meta,
  railSteps,
  pillState,
  pillLabel,
  pillIsMine,
  urgentNote,
  footLabel,
  state = 'secure',
}: TableRowProps) {
  return (
    <View
      style={{
        backgroundColor: surfaces.surface,
        borderRadius: shape.r2,
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.s3,
          padding: 10,
          paddingRight: 12,
          paddingLeft: 12,
        }}
      >
        {/* Mark */}
        <View
          style={{
            width: layout.markSize,
            height: layout.markSize,
            borderRadius: shape.r1,
            backgroundColor: surfaces.sunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {initials ? (
            <Text
              style={{
                fontFamily: 'PlusJakartaSans-Bold',
                fontSize: 12.5,
                fontWeight: '700',
                color: inkColors.secondary,
              }}
            >
              {initials}
            </Text>
          ) : null}
        </View>

        {/* Lead (title + subtitle) */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-Bold',
              fontSize: 14.5,
              fontWeight: '700',
              letterSpacing: -0.006 * 14.5,
              color: inkColors.primary,
              overflow: 'hidden',
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                fontFamily: 'PlusJakartaSans-Medium',
                fontSize: 12,
                fontWeight: '500',
                color: inkColors.tertiary,
                marginTop: 1,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Values (amount + meta) */}
        <View style={{ flex: 0, alignItems: 'flex-end' }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-Bold',
              fontSize: 15,
              fontWeight: '700',
              letterSpacing: -0.015 * 15,
              fontVariant: ['tabular-nums', 'lining-nums'],
              color: inkColors.primary,
            }}
          >
            {amount}
          </Text>
          {meta ? (
            <Text
              style={{
                fontFamily: 'PlusJakartaSans-Medium',
                fontSize: 11.5,
                fontWeight: '500',
                color: inkColors.tertiary,
                marginTop: 1,
              }}
            >
              {meta}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Rail (optional) */}
      {railSteps ? (
        <View style={{ paddingHorizontal: 12 }}>
          <TableRowRail steps={railSteps} state={state} />
        </View>
      ) : null}

      {/* Foot (optional) */}
      {(urgentNote || pillLabel) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.s3,
            paddingVertical: 7,
            paddingHorizontal: 12,
          }}
        >
          {urgentNote ? (
            <Text
              style={{
                fontFamily: 'PlusJakartaSans-SemiBold',
                fontSize: 11.5,
                fontWeight: '600',
                color: states.caution.deep,
                flex: 1,
                overflow: 'hidden',
              }}
              numberOfLines={1}
            >
              {urgentNote}
            </Text>
          ) : footLabel ? (
            <Text
              style={{
                fontFamily: 'PlusJakartaSans-Medium',
                fontSize: 11.5,
                fontWeight: '500',
                color: inkColors.tertiary,
                flex: 1,
              }}
            >
              {footLabel}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {pillLabel && pillState ? (
            <Pill state={pillState} label={pillLabel} isEnd isMine={pillIsMine} />
          ) : null}
        </View>
      )}
    </View>
  );
}
