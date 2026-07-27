/**
 * Input — text field with label, prefix, focus/error states
 * Variants: text, phone (with +233 prefix), amount (with GH₵ prefix + 22px/800), textarea
 */
import React, { useState } from 'react';
import { View, TextInput, Text, type ViewStyle } from 'react-native';
import { surfaces, line, ink as inkColors, states, shape, layout, space } from '../tokens';
import { typography } from '../typography';

type InputVariant = 'text' | 'phone' | 'amount' | 'textarea';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  helper?: string;
  variant?: InputVariant;
  error?: string;
  editable?: boolean;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  helper,
  variant = 'text',
  error,
  editable = true,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const containerStyle: ViewStyle = {
    width: '100%',
    minHeight: variant === 'textarea' ? 108 : layout.inputMinHeight,
    paddingHorizontal: variant === 'textarea' ? space.s4 : space.s4,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: error ? states.danger.fill : focused ? inkColors.primary : line.primary,
    borderRadius: shape.r2,
    flexDirection: 'row',
    alignItems: variant === 'textarea' ? 'flex-start' : 'center',
    gap: space.s3,
  };

  const textProps = {
    style: {
      ...typography.subhead,
      color: inkColors.primary,
      flex: 1,
      fontSize: variant === 'amount' ? 22 : 16,
      fontWeight: (variant === 'amount' ? '800' : '600') as '800' | '600',
      letterSpacing: variant === 'amount' ? -0.44 : 0,
    } as const,
    value,
    onChangeText,
    placeholder,
    placeholderTextColor: inkColors.tertiary,
    editable,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    multiline: variant === 'textarea',
    textAlignVertical: variant === 'textarea' ? 'top' as const : undefined,
  };

  return (
    <View>
      {label ? (
        <Text
          style={{
            fontSize: 13.5,
            fontWeight: '600',
            color: inkColors.secondary,
            marginBottom: space.s2,
            fontFamily: 'PlusJakartaSans-SemiBold',
          }}
        >
          {label}
        </Text>
      ) : null}

      {variant === 'phone' ? (
        <View style={containerStyle}>
          <Text
            style={{
              ...typography.subhead,
              color: inkColors.tertiary,
              fontVariant: ['tabular-nums'],
            }}
          >
            +233
          </Text>
          <TextInput {...textProps} keyboardType="phone-pad" />
        </View>
      ) : variant === 'amount' ? (
        <View style={containerStyle}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: inkColors.tertiary,
              letterSpacing: -0.44,
              fontVariant: ['tabular-nums'],
              fontFamily: 'PlusJakartaSans-ExtraBold',
            }}
          >
            GH₵
          </Text>
          <TextInput {...textProps} keyboardType="decimal-pad" />
        </View>
      ) : variant === 'textarea' ? (
        <View style={[containerStyle, { alignItems: 'flex-start', paddingTop: space.s4 }]}>
          <TextInput {...textProps} />
        </View>
      ) : (
        <View style={containerStyle}>
          <TextInput {...textProps} />
        </View>
      )}

      {helper ? (
        <Text
          style={{
            fontSize: 12.5,
            lineHeight: 18,
            color: inkColors.tertiary,
            marginTop: space.s2,
            fontFamily: 'PlusJakartaSans-Medium',
            fontWeight: '500',
          }}
        >
          {helper}
        </Text>
      ) : null}

      {error ? (
        <Text
          style={{
            fontSize: 12.5,
            lineHeight: 18,
            color: states.danger.deep,
            marginTop: space.s2,
            fontFamily: 'PlusJakartaSans-Medium',
            fontWeight: '500',
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
