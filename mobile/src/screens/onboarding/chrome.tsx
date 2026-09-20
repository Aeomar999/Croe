/**
 * Chrome shared by the onboarding screens — the wordmark and the page dots.
 */
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ink as inkColors, line, shape, states } from '../../theme/tokens';

/** `croe` with a --secure full stop. The only place the wordmark is set in type. */
export function Wordmark() {
  return (
    <View style={styles.brand}>
      <Text style={styles.brandText}>croe</Text>
      <Text style={styles.brandDot}>.</Text>
    </View>
  );
}

interface DotsProps {
  count: number;
  activeIndex: number;
}

export function Dots({ count, activeIndex }: DotsProps) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => {
        const isActive = i === activeIndex;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive && styles.dotActive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
  },
  brandText: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 22,
    fontWeight: '800',
    color: inkColors.primary,
    letterSpacing: -0.88,
  },
  brandDot: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 22,
    fontWeight: '800',
    color: states.secure.fill,
    letterSpacing: -0.88,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: shape.full,
    backgroundColor: line.secondary,
  },
  dotActive: {
    width: 20,
    backgroundColor: inkColors.primary,
  },
});
