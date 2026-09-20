/**
 * OnboardingScreen — the three value panels.
 * Design: design/cards/screens/onboarding{,-hold,-payout}.html
 *
 * Each panel carries its own footer rather than sharing a fixed one below the
 * carousel: panel 1's footer is two buttons deep and panels 2-3 are one, so a
 * shared footer would change height mid-swipe. The cards draw it this way.
 */
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Animated,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  surfaces,
  ink as inkColors,
  layout,
  space,
} from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { Button } from '../../theme/components/Button';
import { ArtFrame } from '../../theme/components/ArtFrame';
import { useOnboardingStore } from '../../stores/onboarding';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { panels, carrierMarks, type OnboardingPanel } from './content';
import { Wordmark, Dots } from './chrome';
import { Squiggles } from './Squiggles';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const complete = useOnboardingStore((s) => s.complete);

  const [index, setIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Measured rather than inferred: a horizontal list sizes its children from
  // the content container, and we need an exact height for the art region to
  // absorb slack against.
  const [carouselHeight, setCarouselHeight] = useState(0);
  const listRef = useRef<FlatList<OnboardingPanel>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setIndex(first.index);
    }
  ).current;

  const exitToSignIn = useCallback(async () => {
    await complete(null);
    navigation.replace('PhoneInput');
  }, [complete, navigation]);

  const handleAdvance = useCallback(
    (from: number) => {
      if (from === panels.length - 1) {
        navigation.navigate('RoleSelect');
      } else {
        listRef.current?.scrollToIndex({ index: from + 1, animated: true });
      }
    },
    [navigation]
  );

  const renderPanel = useCallback(
    ({ item, index: i }: { item: OnboardingPanel; index: number }) => {
      const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
      
      const contentTranslateY = scrollX.interpolate({
        inputRange,
        outputRange: [40, 0, 40],
        extrapolate: 'clamp',
      });

      const contentOpacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
      });
      
      return (
        <View
          testID={`onboarding-panel-${item.key}`}
          style={[
            styles.panel,
            { width, height: carouselHeight || undefined },
          ]}
        >
          <View style={styles.artRegion}>
            <ArtFrame source={item.art} aspect={1} fit="contain" />
          </View>

          <Animated.View 
            style={[
              styles.copy,
              { transform: [{ translateY: contentTranslateY }], opacity: contentOpacity }
            ]}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.lede}>{item.lede}</Text>

            {item.key === 'payout' && (
              <View style={styles.carriers}>
                {carrierMarks.map((c) => (
                  <View key={c.key} style={styles.carrier}>
                    <View style={[styles.carrierDot, { backgroundColor: c.color }]} />
                    <Text style={styles.carrierLabel}>{c.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      );
    },
    [width, carouselHeight, scrollX]
  );

  return (
    <View style={styles.root}>
      <Squiggles />
      <View style={[styles.topbar, { paddingTop: insets.top + space.s1 }]}>
        <Wordmark />
        <Pressable
          testID="onboarding-skip"
          accessibilityRole="button"
          accessibilityLabel="Skip"
          hitSlop={space.s3}
          onPress={exitToSignIn}
        >
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <Animated.FlatList
        testID="onboarding-carousel"
        ref={listRef}
        data={panels}
        renderItem={renderPanel}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onLayout={(e) => setCarouselHeight(e.nativeEvent.layout.height)}
        style={styles.carousel}
      />

      <View style={[styles.fixedBottomContainer, { paddingBottom: insets.bottom + space.s4 }]}>
        <View style={styles.dotsWrapper}>
          <Dots count={panels.length} activeIndex={index} />
        </View>

        <View style={styles.footer}>
          <Button
            testID={`onboarding-primary-${panels[index]?.key}`}
            title={index === 0 ? 'Get started' : 'Continue'}
            variant="ink"
            fullWidth
            onPress={() => handleAdvance(index)}
          />
          <View style={{ height: layout.buttonHeight }}>
            {index === 0 && (
              <Button
                testID="onboarding-secondary"
                title="I already have an account"
                variant="quiet"
                fullWidth
                onPress={exitToSignIn}
              />
            )}
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: space.s2,
  },
  skip: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13.5,
    fontWeight: '600',
    color: inkColors.tertiary,
  },
  carousel: {
    flex: 1,
  },
  panel: {
    paddingTop: space.s2,
    paddingBottom: space.s6,
    paddingHorizontal: layout.gutter,
    gap: layout.gapSection,
  },
  artRegion: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  lede: {
    ...typography.body,
    color: inkColors.secondary,
    textAlign: 'center',
    marginTop: space.s3,
  },
  carriers: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.s4,
    marginTop: space.s4,
  },
  carrier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  carrierDot: {
    width: layout.dotSize,
    height: layout.dotSize,
    borderRadius: 999,
  },
  carrierLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    fontWeight: '600',
    color: inkColors.secondary,
  },
  fixedBottomContainer: {
    paddingHorizontal: layout.gutter,
  },
  dotsWrapper: {
    alignItems: 'center',
    paddingTop: space.s4,
    marginBottom: space.s6,
  },
  footer: {
    gap: space.s2,
  },
});
