/**
 * Button — Croe's primary interaction component
 * Variants: ink (default), line, quiet, wash, danger, disabled
 * Sizes: default (52px), sm (44px)
 * Optional leading glyph well
 */
import React from 'react';
import { Pressable, Text, type ViewStyle, type TextStyle } from 'react-native';
import { ink as inkColors, surfaces, line, states, shape, layout, motion } from '../tokens';
import { typography } from '../typography';

type ButtonVariant = 'ink' | 'line' | 'quiet' | 'wash' | 'danger' | 'disabled';
type ButtonSize = 'default' | 'sm';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  testID?: string;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  ink: {
    container: { backgroundColor: inkColors.primary },
    text: { color: surfaces.surface },
  },
  line: {
    container: {
      backgroundColor: surfaces.surface,
      borderWidth: 1,
      borderColor: line.primary,
    },
    text: { color: inkColors.primary },
  },
  quiet: {
    container: { backgroundColor: 'transparent' },
    text: { color: inkColors.secondary },
  },
  wash: {
    container: { backgroundColor: states.pending.fill },
    text: { color: inkColors.primary },
  },
  danger: {
    container: { backgroundColor: states.danger.wash },
    text: { color: states.danger.deep },
  },
  disabled: {
    container: { backgroundColor: states.pending.fill },
    text: { color: inkColors.tertiary },
  },
};

export function Button({
  title,
  onPress,
  variant = 'ink',
  size = 'default',
  fullWidth = false,
  disabled = false,
  testID,
}: ButtonProps) {
  const v = disabled ? 'disabled' : variant;
  const s = variantStyles[v];

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }: { pressed: boolean }) => ({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: size === 'sm' ? layout.buttonHeightSm : layout.buttonHeight,
        paddingHorizontal: layout.gutter,
        borderRadius: shape.full,
        ...(fullWidth ? { width: '100%' } : {}),
        ...s.container,
        opacity: pressed && !disabled ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          ...typography.label,
          ...s.text,
          fontSize: size === 'sm' ? 14 : 15,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
