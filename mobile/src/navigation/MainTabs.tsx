import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  UIManager,
} from 'react-native';
import { Home, Link, Wallet, User, Search } from '../theme/components/icons';
import { surfaces, ink as inkColors, shape, layout, space } from '../theme/tokens';
import { useOnboardingStore } from '../stores/onboarding';
import { HomeScreen } from '../screens/HomeScreen';
import { LinksScreen } from '../screens/LinksScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MainStack';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabKey = 'home' | 'links' | 'wallet' | 'profile';

interface Tab {
  key: TabKey;
  label: string;
  Icon: React.FC<{ size: number; color: string }>;
}

const tabs: Tab[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'links', label: 'Links', Icon: Link },
  { key: 'wallet', label: 'Wallet', Icon: Wallet },
  { key: 'profile', label: 'Profile', Icon: User },
];

const ICON_SIZE = 21;

/**
 * Single spring config used by every tab — guarantees identical motion.
 * Tension/friction chosen for a snappy but cushioned feel.
 */
const SPRING = {
  tension: 170,
  friction: 14,
  useNativeDriver: false, // width interpolation needs JS driver
};

const SPRING_NATIVE = {
  tension: 170,
  friction: 14,
  useNativeDriver: true,
};

// ─── Animated Tab ───────────────────────────────────────────────
interface AnimatedTabProps {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
}

/**
 * Each tab owns one `progress` Animated.Value (0 → 1) that drives
 * every visual property in lockstep. Because all four tabs share the
 * exact same spring config, the expansion and collapse are mirror
 * images of each other.
 */
function AnimatedTab({ tab, isActive, onPress }: AnimatedTabProps) {
  /** 0 = collapsed (icon only), 1 = expanded (icon + label + pill bg) */
  const progress = React.useRef(new Animated.Value(isActive ? 1 : 0)).current;
  /** Icon bounce on tap */
  const iconScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(progress, { toValue: isActive ? 1 : 0, ...SPRING }).start();
  }, [isActive, progress]);

  const handlePress = React.useCallback(() => {
    // Bounce the icon identically regardless of which tab is tapped
    iconScale.setValue(0.75);
    Animated.spring(iconScale, { toValue: 1, ...SPRING_NATIVE }).start();
    onPress();
  }, [onPress, iconScale]);

  // ── Derived interpolations (same ranges for every tab) ──
  const pillBgOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const labelMaxWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80], // plenty for any 7-char label
  });

  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1], // label fades in during second half
  });

  const paddingRight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });

  const paddingLeft = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });

  const gapWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.tab,
          {
            paddingLeft,
            paddingRight,
          },
        ]}
      >
        {/* Pill background — absolutely positioned behind content */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.pillBg,
            { opacity: pillBgOpacity },
          ]}
        />

        {/* Icon */}
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <tab.Icon
            size={ICON_SIZE}
            color={isActive ? surfaces.surface : inkColors.tertiary}
          />
        </Animated.View>

        {/* Spacer + label — always mounted, width driven by progress */}
        <Animated.View style={{ width: gapWidth }} />
        <Animated.View
          style={{
            maxWidth: labelMaxWidth,
            overflow: 'hidden',
          }}
        >
          <Animated.Text
            numberOfLines={1}
            style={[styles.tabLabel, { opacity: labelOpacity }]}
          >
            {tab.label}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Animated FAB ───────────────────────────────────────────────
interface AnimatedFabProps {
  onPress: () => void;
}

function AnimatedFab({ onPress }: AnimatedFabProps) {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = React.useCallback(() => {
    Animated.spring(scaleValue, { toValue: 0.88, ...SPRING_NATIVE }).start();
  }, [scaleValue]);

  const handlePressOut = React.useCallback(() => {
    Animated.spring(scaleValue, { toValue: 1, ...SPRING_NATIVE }).start();
  }, [scaleValue]);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.fab, { transform: [{ scale: scaleValue }] }]}>
        <Search size={23} color={inkColors.primary} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Main Tabs ──────────────────────────────────────────────────
export function MainTabs() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const role = useOnboardingStore((s) => s.role);
  const [active, setActive] = React.useState<TabKey>(
    role === 'buyer' ? 'links' : 'home',
  );

  const handleTabPress = React.useCallback(
    (key: TabKey) => {
      if (key === active) return;
      setActive(key);
    },
    [active],
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {active === 'home' && <HomeScreen />}
        {active === 'links' && <LinksScreen />}
        {active === 'wallet' && <WalletScreen />}
        {active === 'profile' && <ProfileScreen />}
      </View>

      <View style={styles.dock}>
        <View style={styles.tabbar}>
          {tabs.map((tab) => (
            <AnimatedTab
              key={tab.key}
              tab={tab}
              isActive={tab.key === active}
              onPress={() => handleTabPress(tab.key)}
            />
          ))}
        </View>

        <AnimatedFab onPress={() => navigation.navigate('Search' as never)} />
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.canvas,
  },
  content: {
    flex: 1,
  },
  dock: {
    position: 'absolute',
    left: space.s4,
    right: space.s4,
    bottom: layout.tabBarOffset,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabbar: {
    flex: 1,
    height: layout.tabBarHeight,
    backgroundColor: surfaces.surface,
    borderRadius: shape.full,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tab: {
    height: 48,
    minWidth: 48,
    borderRadius: shape.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillBg: {
    borderRadius: shape.full,
    backgroundColor: inkColors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: surfaces.surface,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: shape.full,
    backgroundColor: surfaces.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
