/**
 * Avatar — 44px circle with initials
 * Default: ink fill, white text
 * Quiet: pending fill, secondary text
 */
import React from 'react';
import { View, Text } from 'react-native';
import { ink as inkColors, surfaces, states, shape, layout } from '../tokens';

interface AvatarProps {
  initials: string;
  quiet?: boolean;
  size?: number;
}

export function Avatar({ initials, quiet = false, size = layout.avatarSize }: AvatarProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: shape.full,
        backgroundColor: quiet ? states.pending.fill : inkColors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'PlusJakartaSans-Bold',
          fontSize: size * 0.34,
          fontWeight: '700',
          color: quiet ? inkColors.secondary : surfaces.surface,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
