import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useOnboardingStore } from '../stores/onboarding';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { View, ActivityIndicator } from 'react-native';
import { surfaces } from '../theme/tokens';

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const hydrate = useOnboardingStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Both stacks depend on the onboarding flags — AuthStack for its initial
  // route, MainStack for which tab it opens on — so neither renders until the
  // flags are read. Without this the first frame would pick a route from the
  // default `seen: false` and then be unable to change it.
  if (isLoading || !hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: surfaces.canvas }}>
        <ActivityIndicator size="large" color="#17181B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
