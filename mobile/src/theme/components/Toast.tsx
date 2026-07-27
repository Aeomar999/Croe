/**
 * Toast — ink pill, elevated, floating
 */
import React from 'react';
import { View, Text } from 'react-native';
import { ink as inkColors, surfaces, shape, shadows } from '../tokens';
import { typography } from '../typography';

interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return (
    <View
      style={{
        backgroundColor: inkColors.primary,
        borderRadius: shape.full,
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'center',
        ...shadows.elev,
      }}
    >
      <Text
        style={{
          ...typography.label,
          color: surfaces.surface,
        }}
      >
        {message}
      </Text>
    </View>
  );
}
