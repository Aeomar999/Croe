/**
 * ChoiceRow — carrier picker, delivery mode, dispute reason
 * 20px radio marker, 8px carrier dots
 */
import React from 'react';
import { Pressable, View, Text, type ViewStyle } from 'react-native';
import { surfaces, line, line as lineColors, ink as inkColors, shape, layout, space } from '../tokens';
import { typography } from '../typography';

interface ChoiceRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  dotColor?: string; // carrier colour (MTN, Telecel, AT)
  icon?: React.ReactNode;
}

export function ChoiceRow({ label, selected, onPress, dotColor, icon }: ChoiceRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) =>
        ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.s3,
          backgroundColor: surfaces.surface,
          borderWidth: 1,
          borderColor: selected ? inkColors.primary : lineColors.primary,
          borderRadius: shape.r2,
          padding: 14,
          paddingRight: space.s4,
          opacity: pressed ? 0.9 : 1,
        }) as ViewStyle
      }
    >
      {/* Radio marker */}
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: shape.full,
          borderWidth: 1.5,
          borderColor: selected ? inkColors.primary : line.secondary,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? inkColors.primary : 'transparent',
        }}
      >
        {selected ? (
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: shape.full,
              backgroundColor: surfaces.surface,
            }}
          />
        ) : null}
      </View>

      {/* Carrier dot */}
      {dotColor ? (
        <View
          style={{
            width: layout.dotSize,
            height: layout.dotSize,
            borderRadius: shape.full,
            backgroundColor: dotColor,
          }}
        />
      ) : null}

      {icon ? icon : null}

      <Text
        style={{
          ...typography.subhead,
          flex: 1,
          color: inkColors.primary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
