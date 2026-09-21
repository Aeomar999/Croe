/**
 * MainStack — wraps MainTabs + detail/modal screens pushed on top
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { CreateEscrowScreen } from '../screens/CreateEscrowScreen';
import { LinkCreatedScreen } from '../screens/LinkCreatedScreen';
import { PayDepositScreen } from '../screens/PayDepositScreen';
import { TransactionStatusScreen } from '../screens/TransactionStatusScreen';
import { DisputeOpenScreen } from '../screens/DisputeOpenScreen';
import { DisputeStatusScreen } from '../screens/DisputeStatusScreen';
import { KycScreen } from '../screens/KycScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { StatementScreen } from '../screens/StatementScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { HelpCentreScreen } from '../screens/HelpCentreScreen';
import { SecurityScreen } from '../screens/SecurityScreen';
import { surfaces } from '../theme/tokens';

export type MainStackParamList = {
  MainTabs: undefined;
  CreateEscrow: undefined;
  LinkCreated: { transactionId?: string; deepLink?: string };
  PayDeposit: { transactionId: string };
  TransactionStatus: { transactionId: string };
  DisputeOpen: { transactionId: string };
  DisputeStatus: { transactionId: string };
  KycStatus: undefined;
  Search: undefined;
  Statement: undefined;
  Notifications: undefined;
  HelpCentre: undefined;
  Security: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: surfaces.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="CreateEscrow" component={CreateEscrowScreen} />
      <Stack.Screen name="LinkCreated" component={LinkCreatedScreen} />
      <Stack.Screen name="PayDeposit" component={PayDepositScreen} />
      <Stack.Screen
        name="TransactionStatus"
        component={TransactionStatusScreen}
        initialParams={{ transactionId: '' }}
      />
      <Stack.Screen name="DisputeOpen" component={DisputeOpenScreen} />
      <Stack.Screen name="DisputeStatus" component={DisputeStatusScreen} />
      <Stack.Screen name="KycStatus" component={KycScreen} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Statement" component={StatementScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="HelpCentre" component={HelpCentreScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
    </Stack.Navigator>
  );
}
