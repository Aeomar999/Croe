/**
 * Onboarding copy and art.
 *
 * Source of truth: design/cards/screens/onboarding{,-hold,-payout,-role}.html.
 * Kept out of the components so the copy can be verified without mounting a
 * screen, and so a wording change is a one-line diff in one file.
 */
import { carriers } from '../../theme/tokens';

export interface OnboardingPanel {
  key: string;
  art: number;
  title: string;
  lede: string;
}

export const panels: OnboardingPanel[] = [
  {
    key: 'welcome',
    art: require('../../../assets/images/onboarding-01-locked-chat.webp'),
    title: 'Sell to strangers.\nGet paid safely.',
    lede:
      "Croe holds your buyer's money until they confirm delivery. Nobody has " +
      'to go first.',
  },
  {
    key: 'hold',
    art: require('../../../assets/images/onboarding-02-escrow-vault.webp'),
    title: 'The money is held,\nnot sent.',
    lede:
      'Your buyer pays into escrow, not into your inbox. You ship knowing the ' +
      "cash is already there — and it's released the moment they confirm.",
  },
  {
    key: 'payout',
    art: require('../../../assets/images/onboarding-03-momo-payout.png'),
    title: 'Paid out\nin minutes.',
    lede:
      'When the buyer confirms, your money moves straight to your mobile ' +
      'wallet. No waiting on a bank, no chasing anyone.',
  },
];

/**
 * Carrier marks on the payout panel. The 8px dot form, not the 40px monogram
 * tile — here the network is a detail, not the decision being asked for.
 */
export const carrierMarks = [
  { key: 'mtn', label: 'MTN MoMo', color: carriers.mtn },
  { key: 'telecel', label: 'Telecel', color: carriers.telecel },
  { key: 'at', label: 'AT Money', color: carriers.at },
] as const;

export const roleArt = require('../../../assets/images/onboarding-04-two-roles.webp');

export const roleCopy = {
  title: 'What brings you here?',
  lede: 'You can do both later — this just decides what we show you first.',
  seller: {
    title: "I'm selling",
    body: 'Create payment links, get paid before you ship, withdraw to MoMo.',
  },
  buyer: {
    title: "I'm buying",
    body:
      'Pay into escrow, track delivery, get your money back if it never ' +
      'arrives.',
  },
  notice: {
    title: 'Buying? You may not need this',
    body:
      'If a seller sent you a Croe link, just tap it — you can pay without an ' +
      'account.',
  },
  footnote: 'Next: verify your number. It takes about a minute.',
} as const;
