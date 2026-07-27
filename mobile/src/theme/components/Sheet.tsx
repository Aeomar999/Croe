/**
 * Sheet — white container on --canvas
 * RULE: A white sheet on canvas gets NO border and NO shadow.
 * Fill contrast is the depth.
 */
import React from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import { surfaces, shape, layout } from '../tokens';

interface SheetProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
}

export function Sheet({ children, style, padding = layout.padSheet, radius = shape.r4 }: SheetProps) {
  return (
    <View
      style={[
        {
          backgroundColor: surfaces.surface,
          borderRadius: radius,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
