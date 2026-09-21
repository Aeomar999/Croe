import React from 'react';
import { Image, View, StyleSheet, type ViewStyle } from 'react-native';
import { surfaces, space, layout } from '../tokens';

type StateType =
  | 'awaiting-deposit'
  | 'confirmation-link-created'
  | 'confirmation-shipped'
  | 'empty-no-disputes'
  | 'empty-no-evidence'
  | 'empty-no-notifications'
  | 'empty-no-transactions'
  | 'empty-no-wallet-history'
  | 'error-network'
  | 'error-payment-failed'
  | 'error-session-expired'
  | 'fraud-lockout'
  | 'kyc-verify-identity'
  | 'loading-ai-review'
  | 'loading-processing-payment'
  | 'success-delivery-confirmed'
  | 'success-funds-released'
  | 'success-funds-secured'
  | 'terminal-cancelled'
  | 'terminal-expired-link'
  | 'terminal-funds-refunded'
  | 'warning-dispute-opened'
  | 'warning-under-human-review';

const STATE_IMAGES: Record<StateType, number> = {
  'awaiting-deposit': require('../../../assets/images/states/awaiting-deposit.png'),
  'confirmation-link-created': require('../../../assets/images/states/confirmation-state---link-created.png'),
  'confirmation-shipped': require('../../../assets/images/states/confirmation-state---shipped.png'),
  'empty-no-disputes': require('../../../assets/images/states/empty-state---no-disputes.png'),
  'empty-no-evidence': require('../../../assets/images/states/empty-state---no-evidence.png'),
  'empty-no-notifications': require('../../../assets/images/states/empty-state---no-notifications.png'),
  'empty-no-transactions': require('../../../assets/images/states/empty-state---no-transactions.png'),
  'empty-no-wallet-history': require('../../../assets/images/states/empty-state---no-wallet-history.png'),
  'error-network': require('../../../assets/images/states/error-state---networkorconnection-error.png'),
  'error-payment-failed': require('../../../assets/images/states/error-state---payment-failed.png'),
  'error-session-expired': require('../../../assets/images/states/error-state---session-expiredorauth-required.png'),
  'fraud-lockout': require('../../../assets/images/states/fraud-lockout.png'),
  'kyc-verify-identity': require('../../../assets/images/states/kyc-state---verify-identity.png'),
  'loading-ai-review': require('../../../assets/images/states/loading-state---ai-review-processing.png'),
  'loading-processing-payment': require('../../../assets/images/states/loading-state---processing-payment.png'),
  'success-delivery-confirmed': require('../../../assets/images/states/success-state---delivery-confirmed.png'),
  'success-funds-released': require('../../../assets/images/states/success-state---funds-released-payout.png'),
  'success-funds-secured': require('../../../assets/images/states/success-state---funds-secured.png'),
  'terminal-cancelled': require('../../../assets/images/states/terminal-state---cancelled.png'),
  'terminal-expired-link': require('../../../assets/images/states/terminal-state---expired-link.png'),
  'terminal-funds-refunded': require('../../../assets/images/states/terminal-state---funds-refunded.png'),
  'warning-dispute-opened': require('../../../assets/images/states/warning-state---dispute-opened.png'),
  'warning-under-human-review': require('../../../assets/images/states/warning-state---under-human-review.png'),
};

interface StateIllustrationProps {
  type: StateType;
  style?: ViewStyle;
}

export function StateIllustration({ type, style }: StateIllustrationProps) {
  const source = STATE_IMAGES[type];
  if (!source) return null;

  return (
    <View style={[styles.container, style]}>
      <Image source={source} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 300,
    backgroundColor: surfaces.canvas,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});