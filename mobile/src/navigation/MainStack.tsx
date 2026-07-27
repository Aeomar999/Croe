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
import { surfaces } from '../theme/tokens';

export type MainStackParamList = {
  MainTabs: undefined;
  CreateEscrow: undefined;
  LinkCreated: undefined;
  PayDeposit: undefined;
  TransactionStatus: { transactionId: string };
  DisputeOpen: undefined;
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
    </Stack.Navigator>
  );
}
