import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Home, Link, Wallet, User, Search } from '../theme/components/icons';
import { surfaces, ink as inkColors, shape, layout, space } from '../theme/tokens';
import { useOnboardingStore } from '../stores/onboarding';
import { HomeScreen } from '../screens/HomeScreen';
import { LinksScreen } from '../screens/LinksScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

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

export function MainTabs() {
  // The onboarding answer decides the landing tab and nothing else. A buyer's
  // first need is tracking a delivery, which is Links; a seller's is the money
  // and the deals, which is Home. Skipping onboarding leaves no role, and Home
  // is the right default for that.
  const role = useOnboardingStore((s) => s.role);
  const [active, setActive] = React.useState<TabKey>(
    role === 'buyer' ? 'links' : 'home'
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
          {tabs.map(tab => {
            const isActive = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActive(tab.key)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <tab.Icon
                  size={ICON_SIZE}
                  color={isActive ? surfaces.surface : inkColors.tertiary}
                />
                {isActive && (
                  <>
                    <View style={styles.tabGap} />
                    <Text style={styles.tabLabel}>{tab.label}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.fab}>
          <Search size={23} color={inkColors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

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
    width: 48,
    height: 48,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    width: 'auto',
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 18,
    backgroundColor: inkColors.primary,
  },
  tabGap: {
    width: 0,
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
