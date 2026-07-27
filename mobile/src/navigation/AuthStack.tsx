import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PhoneInputScreen } from '../screens/auth/PhoneInputScreen';
import { OtpEntryScreen } from '../screens/auth/OtpEntryScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { surfaces } from '../theme/tokens';

export type AuthStackParamList = {
  PhoneInput: undefined;
  OtpEntry: { phone: string; countryCode: string };
  Onboarding: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: surfaces.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
      <Stack.Screen name="OtpEntry" component={OtpEntryScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}
