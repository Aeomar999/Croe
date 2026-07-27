/**
 * OnboardingScreen — 3-step intro carousel
 * Design: onboarding.html, onboarding-role.html
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surfaces, ink as inkColors, line, shape, space, layout, states } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Button } from '../theme/components/Button';
import { Shield, Lock, CheckCircle } from '../theme/components/icons';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Step {
  title: string;
  body: string;
  Icon: React.FC<{ size: number; color: string }>;
  iconBg: string;
  iconColor: string;
}

const steps: Step[] = [
  {
    title: 'Sell to strangers.\nGet paid safely.',
    body: "Croe holds your buyer's money until they confirm delivery. Nobody has to go first.",
    Icon: Shield,
    iconBg: states.secure.fill,
    iconColor: states.secure.on,
  },
  {
    title: 'Your money,\nyour pace.',
    body: 'Withdraw to MoMo anytime. No minimums, no hidden fees.',
    Icon: Lock,
    iconBg: inkColors.primary,
    iconColor: surfaces.surface,
  },
  {
    title: 'Disputes handled\nfairly.',
    body: "Evidence, AI triage, and human oversight. Everyone gets heard.",
    Icon: CheckCircle,
    iconBg: states.secure.fill,
    iconColor: states.secure.on,
  },
];

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isLast = currentIndex === steps.length - 1;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const handleNext = () => {
    if (isLast) {
      navigation.replace('PhoneInput');
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleSkip = () => {
    navigation.replace('PhoneInput');
  };

  const renderStep = ({ item }: { item: Step }) => (
    <View style={[styles.step, { width: SCREEN_WIDTH }]}>
      {/* Icon art */}
      <View style={[styles.art, { backgroundColor: surfaces.sunken }]}>
        <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
          <item.Icon size={48} color={item.iconColor} />
        </View>
      </View>

      {/* Copy */}
      <View style={styles.copySection}>
        <Text style={typography.title}>{item.title}</Text>
        <Text style={[typography.body, { color: inkColors.secondary, marginTop: space.s3 }]}>
          {item.body}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brand}>
          <Text style={styles.brandText}>croe</Text>
          <Text style={styles.brandDot}>.</Text>
        </View>
        <Pressable onPress={handleSkip}>
          <Text style={[typography.label, { color: inkColors.tertiary }]}>Skip</Text>
        </Pressable>
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={renderStep}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={styles.carousel}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title={isLast ? 'Get started' : 'Next'}
          variant="ink"
          onPress={handleNext}
          fullWidth
        />
        <Button
          title="I already have an account"
          variant="quiet"
          onPress={handleSkip}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: space.s4,
  },
  brand: {
    flexDirection: 'row',
  },
  brandText: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 20,
    fontWeight: '800',
    color: inkColors.primary,
    letterSpacing: -0.4,
  },
  brandDot: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 20,
    fontWeight: '800',
    color: states.secure.fill,
  },
  carousel: {
    flex: 1,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
  },
  art: {
    width: 200,
    height: 200,
    borderRadius: shape.r4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.s8,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copySection: {
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: space.s6,
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
  footer: {
    paddingHorizontal: layout.gutter,
    gap: space.s2,
  },
});
