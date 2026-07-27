import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PhoneInputScreen } from '../screens/auth/PhoneInputScreen';
import { OtpEntryScreen } from '../screens/auth/OtpEntryScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { RoleSelectScreen } from '../screens/onboarding/RoleSelectScreen';
import { useOnboardingStore } from '../stores/onboarding';
import { surfaces } from '../theme/tokens';

export type AuthStackParamList = {
  PhoneInput: undefined;
  OtpEntry: { phone: string; countryCode: string };
  Onboarding: undefined;
  RoleSelect: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  // First launch opens on the carousel; every launch after opens on sign-in.
  // RootNavigator holds the loading state until the flag is hydrated, so this
  // is never read before it is known.
  const seen = useOnboardingStore((s) => s.seen);

  return (
    <Stack.Navigator
      initialRouteName={seen ? 'PhoneInput' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: surfaces.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
      <Stack.Screen name="OtpEntry" component={OtpEntryScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
    </Stack.Navigator>
  );
}
