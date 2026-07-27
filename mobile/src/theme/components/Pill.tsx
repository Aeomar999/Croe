/**
 * Pill — TWO idioms:
 *   TRACE: 10px state mark + words, no capsule (default, for lists/rows)
 *   SIGNAL: solid capsule, ONE per screen (hero balance, screen head)
 *
 * RULE: Trace lands all five states at ONE optical weight;
 * Signal is what earns the saturation.
 */
import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { states, shape, ink as inkColors, surfaces, line, type PillState } from '../tokens';
import { typography } from '../typography';

type PillIdiom = 'trace' | 'signal' | 'signal-hero';

interface PillProps {
  state: PillState;
  label: string;
  idiom?: PillIdiom;
  isMine?: boolean;    // trace: ring instead of disc (your move)
  isEnd?: boolean;     // trace: right-aligned mark
  isCased?: boolean;   // trace: white capsule (surface only)
  hasHz?: boolean;     // signal: horizon time appended
  hzText?: string;
}

const stateConfig = {
  pending: { mark: '#5B5E63', ...states.pending },
  secure: { mark: states.secure.deep, ...states.secure },
  done: { mark: states.done.deep, ...states.done },
  caution: { mark: states.caution.deep, ...states.caution },
  danger: { mark: states.danger.deep, ...states.danger },
};

export function Pill({
  state,
  label,
  idiom = 'trace',
  isMine = false,
  isEnd = false,
  isCased = false,
  hasHz = false,
  hzText,
}: PillProps) {
  const config = stateConfig[state];

  if (idiom === 'signal' || idiom === 'signal-hero') {
    const isHero = idiom === 'signal-hero';
    const ph = isHero ? 34 : 28;

    return (
      <View
        style={{
          height: ph,
          borderRadius: shape.full,
          backgroundColor: config.fill,
          flexDirection: 'row',
          alignItems: 'center',
          gap: ph * 0.22,
          paddingTop: 1,
          paddingRight: ph * 0.5,
          paddingBottom: 0,
          paddingLeft: ph * 0.34,
        } as ViewStyle}
      >
        <Text
          style={{
            fontFamily: 'PlusJakartaSans-Bold',
            fontSize: isHero ? 14 : 12.5,
            fontWeight: '700',
            color: config.on,
            letterSpacing: isHero ? 0 : 0.006 * 12.5,
            fontVariant: ['tabular-nums', 'lining-nums'],
          }}
        >
          {label}
        </Text>
        {hasHz && hzText ? (
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-SemiBold',
              fontSize: isHero ? 14 : 12.5,
              fontWeight: '600',
              color: config.on,
              opacity: 0.74,
              fontStyle: 'normal',
            }}
          >
            {'· '}{hzText}
          </Text>
        ) : null}
      </View>
    );
  }

  // TRACE idiom
  const markStyle: ViewStyle = isMine
    ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: config.mark }
    : { backgroundColor: config.mark };

  return (
    <View
      style={{
        flexDirection: isEnd ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 7,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: shape.full,
          ...markStyle,
        }}
      />
      {isCased ? (
        <View
          style={{
            height: 26,
            borderRadius: shape.full,
            backgroundColor: surfaces.surface,
            borderWidth: 1,
            borderColor: line.primary,
            paddingHorizontal: 12,
            paddingLeft: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              ...typography.label,
              fontSize: 12.5,
              color: inkColors.secondary,
            }}
          >
            {label}
          </Text>
        </View>
      ) : (
        <Text
          style={{
            fontFamily: 'PlusJakartaSans-SemiBold',
            fontSize: 12.5,
            fontWeight: '600',
            letterSpacing: -0.002 * 12.5,
            color: inkColors.secondary,
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
