/**
 * BalanceBlock — the hero component
 * Quiet label, large tabular amount, optional signal pill, eye affordance,
 * allocation bar, action buttons.
 */
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { surfaces, ink as inkColors, states, shape, layout, space } from '../tokens';
import { typography, amountHeroStyle } from '../typography';
import { Pill } from './Pill';
import { Button } from './Button';
import { Eye, EyeOff } from './icons';
import type { PillState } from '../tokens';

interface BalanceBlockProps {
  label: string;
  amount: string; // e.g. "1,635.00"
  currency?: string; // default "GH₵"
  pillState?: PillState;
  pillLabel?: string;
  showEye?: boolean;
  allocation?: { secured: number; awaiting: number };
  actions?: Array<{ title: string; variant: 'ink' | 'line'; onPress: () => void }>;
  itemLines?: Array<{ key: string; value: string }>;
}

export function BalanceBlock({
  label,
  amount,
  currency = 'GH₵',
  pillState,
  pillLabel,
  showEye = false,
  allocation,
  actions,
  itemLines,
}: BalanceBlockProps) {
  const [visible, setVisible] = useState(true);

  return (
    <View
      style={{
        backgroundColor: surfaces.surface,
        borderRadius: shape.r4,
        padding: space.s5,
      }}
    >
      {/* Top line: label + signal pill */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.s3,
        }}
      >
        <Text
          style={{
            ...typography.subhead,
            color: inkColors.secondary,
          }}
        >
          {label}
        </Text>
        {pillState && pillLabel ? (
          <Pill state={pillState} label={pillLabel} />
        ) : null}
      </View>

      {/* Amount + eye */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space.s2 }}>
        <Text style={amountHeroStyle}>
          <Text style={{ fontWeight: '800' }}>{currency}</Text>
          {visible ? amount : '••••••'}
        </Text>
        {showEye ? (
          <Pressable
            onPress={() => setVisible(!visible)}
            hitSlop={11.5}
            style={{ padding: 11.5 }}
          >
            {visible ? (
              <Eye size={21} color={inkColors.tertiary} />
            ) : (
              <EyeOff size={21} color={inkColors.tertiary} />
            )}
          </Pressable>
        ) : null}
      </View>

      {/* Item lines (buyer/paid) */}
      {itemLines?.map((line) => (
        <View
          key={line.key}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: '#E7E7E4',
          }}
        >
          <Text
            style={{
              ...typography.caption,
              color: inkColors.tertiary,
            }}
          >
            {line.key}
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-Bold',
              fontSize: 12.5,
              fontWeight: '700',
              color: inkColors.primary,
            }}
          >
            {line.value}
          </Text>
        </View>
      ))}

      {/* Allocation bar */}
      {allocation && allocation.secured + allocation.awaiting > 0 ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              gap: 2,
              height: layout.allocBarHeight,
              marginTop: 11,
              borderRadius: shape.full,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flex: allocation.secured,
                backgroundColor: states.secure.fill,
                borderRadius: shape.full,
              }}
            />
            <View
              style={{
                flex: allocation.awaiting,
                backgroundColor: states.caution.fill,
                borderRadius: shape.full,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: space.s2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: shape.full, backgroundColor: states.secure.fill }} />
              <Text style={{ fontFamily: 'PlusJakartaSans-Medium', fontSize: 11.5, fontWeight: '500', color: inkColors.tertiary }}>
                Secured{' '}
                <Text style={{ fontWeight: '700', color: inkColors.primary }}>
                  {currency} {allocation.secured.toLocaleString()}.00
                </Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: shape.full, backgroundColor: states.caution.fill }} />
              <Text style={{ fontFamily: 'PlusJakartaSans-Medium', fontSize: 11.5, fontWeight: '500', color: inkColors.tertiary }}>
                Awaiting{' '}
                <Text style={{ fontWeight: '700', color: inkColors.primary }}>
                  {currency} {allocation.awaiting.toLocaleString()}.00
                </Text>
              </Text>
            </View>
          </View>
        </>
      ) : null}

      {/* Action buttons */}
      {actions ? (
        <View
          style={{
            flexDirection: 'row',
            gap: space.s2,
            marginTop: 13,
          }}
        >
          {actions.map((action) => (
            <View key={action.title} style={{ flex: 1 }}>
              <Button
                title={action.title}
                variant={action.variant}
                onPress={action.onPress}
                fullWidth
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
