/**
 * RoleSelectScreen — "What brings you here?"
 * Design: design/cards/screens/onboarding-role.html
 *
 * No Skip and no dots: the card omits both, and the question has a safe
 * default, so there is nothing to escape from.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  surfaces,
  ink as inkColors,
  line,
  states,
  shape,
  layout,
  space,
} from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { Button } from '../../theme/components/Button';
import { ArtFrame } from '../../theme/components/ArtFrame';
import { WashBanner } from '../../theme/components/WashBanner';
import { ShoppingBag, Shield, Info } from '../../theme/components/icons';
import { useOnboardingStore, type OnboardingRole } from '../../stores/onboarding';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { roleArt, roleCopy } from './content';
import { Wordmark } from './chrome';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;

interface RoleOption {
  role: OnboardingRole;
  title: string;
  body: string;
  Icon: React.FC<{ size: number; color: string }>;
}

const options: RoleOption[] = [
  {
    role: 'seller',
    title: roleCopy.seller.title,
    body: roleCopy.seller.body,
    Icon: ShoppingBag,
  },
  {
    role: 'buyer',
    title: roleCopy.buyer.title,
    body: roleCopy.buyer.body,
    Icon: Shield,
  },
];

export function RoleSelectScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const complete = useOnboardingStore((s) => s.complete);

  // The card shows selling pre-selected, so Continue is never a dead end.
  const [selected, setSelected] = useState<OnboardingRole>('seller');

  const handleContinue = useCallback(async () => {
    await complete(selected);
    navigation.replace('PhoneInput');
  }, [complete, selected, navigation]);

  return (
    <View style={styles.root}>
      <View style={[styles.topbar, { paddingTop: insets.top + space.s1 }]}>
        <Wordmark />
      </View>

      <View style={[styles.body, { paddingBottom: space.s6 + insets.bottom }]}>
        <ArtFrame source={roleArt} aspect={3} testID="role-art" />

        <View>
          <Text style={typography.title}>{roleCopy.title}</Text>
          <Text style={styles.lede}>{roleCopy.lede}</Text>
        </View>

        <View style={styles.roles}>
          {options.map((option) => {
            const isSelected = option.role === selected;
            return (
              <Pressable
                key={option.role}
                testID={`role-option-${option.role}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={option.title}
                onPress={() => setSelected(option.role)}
                style={({ pressed }: { pressed: boolean }) =>
                  [
                    styles.role,
                    isSelected && styles.roleSelected,
                    { opacity: pressed ? 0.9 : 1 },
                  ] as ViewStyle[]
                }
              >
                <View style={[styles.roleIcon, isSelected && styles.roleIconSelected]}>
                  <option.Icon
                    size={23}
                    color={isSelected ? states.secure.on : inkColors.primary}
                  />
                </View>

                <View style={styles.roleWho}>
                  <Text style={styles.roleTitle}>{option.title}</Text>
                  <Text style={styles.roleBody}>{option.body}</Text>
                </View>

                <View style={[styles.marker, isSelected && styles.markerSelected]}>
                  {isSelected && <View style={styles.markerDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <WashBanner
          variant="secure"
          title={roleCopy.notice.title}
          body={roleCopy.notice.body}
          icon={<Info size={19} color={states.secure.deep} />}
        />

        <View style={styles.spacer} />

        <View>
          <Button
            testID="role-continue"
            title="Continue"
            variant="ink"
            fullWidth
            onPress={handleContinue}
          />
          <Text style={styles.footnote}>{roleCopy.footnote}</Text>
        </View>
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
    paddingHorizontal: layout.gutter,
    paddingBottom: space.s2,
  },
  body: {
    flex: 1,
    paddingTop: space.s2,
    paddingHorizontal: layout.gutter,
    gap: layout.gapSection,
  },
  lede: {
    ...typography.body,
    color: inkColors.secondary,
    marginTop: space.s2,
  },
  roles: {
    gap: space.s3,
  },
  role: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s4,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: line.primary,
    borderRadius: shape.r3,
    padding: space.s4,
  },
  roleSelected: {
    borderColor: inkColors.primary,
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: shape.r2,
    backgroundColor: surfaces.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconSelected: {
    backgroundColor: states.secure.fill,
  },
  roleWho: {
    flex: 1,
    minWidth: 0,
  },
  roleTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.16,
    color: inkColors.primary,
  },
  roleBody: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: inkColors.secondary,
    marginTop: space.s1,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: shape.full,
    borderWidth: 1.5,
    borderColor: line.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  markerSelected: {
    borderColor: inkColors.primary,
    backgroundColor: inkColors.primary,
  },
  markerDot: {
    width: 7,
    height: 7,
    borderRadius: shape.full,
    backgroundColor: inkColors.onInk,
  },
  spacer: {
    flex: 1,
  },
  footnote: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: inkColors.tertiary,
    textAlign: 'center',
    marginTop: space.s3,
  },
});
