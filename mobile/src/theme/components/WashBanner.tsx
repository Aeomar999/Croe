/**
 * WashBanner — reassurance/caution at full width
 * secure: "Funds safely locked..."
 * caution: "We've safely paused..."
 * danger: failure
 * neutral: pending
 */
import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { states, shape, layout, space, ink as inkColors } from '../tokens';
import { typography } from '../typography';
import { Shield } from './icons';

type WashVariant = 'secure' | 'caution' | 'danger' | 'neutral';

interface WashBannerProps {
  variant: WashVariant;
  title: string;
  body: string;
  icon?: React.ReactNode;
}

const washConfig = {
  secure: { bg: states.secure.wash, color: states.secure.deep },
  caution: { bg: states.caution.wash, color: states.caution.deep },
  danger: { bg: states.danger.wash, color: states.danger.deep },
  neutral: { bg: states.pending.wash, color: inkColors.secondary },
};

export function WashBanner({ variant, title, body, icon }: WashBannerProps) {
  const config = washConfig[variant];

  return (
    <View
      style={{
        borderRadius: shape.r4,
        padding: space.s4,
        paddingLeft: space.s5,
        backgroundColor: config.bg,
        flexDirection: 'row',
        gap: space.s3,
        alignItems: 'flex-start',
      } as ViewStyle}
    >
      {icon ?? (
        <View style={{ marginTop: 1 }}>
          <Shield size={19} color={config.color} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...typography.label,
            color: config.color,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 13.5,
            lineHeight: 20,
            color: config.color,
            marginTop: 3,
            fontFamily: 'PlusJakartaSans-Medium',
            fontWeight: '500',
          }}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}
