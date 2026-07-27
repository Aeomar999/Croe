/**
 * Render tests — the onboarding carousel.
 *
 * The copy assertions read from content.ts rather than repeating the strings,
 * so this file verifies that the screen renders what the content module says.
 * That the content module matches the design cards is asserted in
 * content.test.tsx, which is the one place the literal wording lives.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { OnboardingScreen } from './OnboardingScreen';
import { panels, carrierMarks } from './content';
import { useOnboardingStore } from '../../stores/onboarding';

const replace = jest.fn();
const navigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace, navigate }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useOnboardingStore.setState({ seen: false, role: null, hydrated: true });
});

describe('OnboardingScreen — content', () => {
  it('renders every panel from the content module', () => {
    render(<OnboardingScreen />);

    for (const panel of panels) {
      const page = screen.getByTestId(`onboarding-panel-${panel.key}`);
      expect(within(page).getByText(panel.title)).toBeTruthy();
      expect(within(page).getByText(panel.lede)).toBeTruthy();
    }
  });

  it('opens on "Get started" and offers the sign-in escape only on the first panel', () => {
    render(<OnboardingScreen />);

    const welcome = screen.getByTestId('onboarding-panel-welcome');
    expect(within(welcome).getByText('Get started')).toBeTruthy();
    expect(within(welcome).getByText('I already have an account')).toBeTruthy();

    const hold = screen.getByTestId('onboarding-panel-hold');
    expect(within(hold).getByText('Continue')).toBeTruthy();
    expect(within(hold).queryByText('I already have an account')).toBeNull();
  });

  it('names the three carriers on the payout panel only', () => {
    render(<OnboardingScreen />);

    const payout = screen.getByTestId('onboarding-panel-payout');
    for (const carrier of carrierMarks) {
      expect(within(payout).getByText(carrier.label)).toBeTruthy();
    }

    const welcome = screen.getByTestId('onboarding-panel-welcome');
    expect(within(welcome).queryByText('MTN MoMo')).toBeNull();
  });

  it('marks the first dot active on open', () => {
    render(<OnboardingScreen />);

    expect(screen.getAllByTestId('onboarding-dot-0-active')).toHaveLength(panels.length);
    expect(screen.queryByTestId('onboarding-dot-1-active')).toBeNull();
  });
});

describe('OnboardingScreen — exits', () => {
  it('Skip marks onboarding seen with no role and goes to sign-in', async () => {
    render(<OnboardingScreen />);

    fireEvent.press(screen.getByTestId('onboarding-skip'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('PhoneInput'));
    const state = useOnboardingStore.getState();
    expect(state.seen).toBe(true);
    expect(state.role).toBeNull();
  });

  it('"I already have an account" takes the same exit as Skip', async () => {
    render(<OnboardingScreen />);

    fireEvent.press(screen.getByTestId('onboarding-secondary'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('PhoneInput'));
    expect(useOnboardingStore.getState().seen).toBe(true);
    expect(useOnboardingStore.getState().role).toBeNull();
  });

  it('does not leave the carousel from a middle panel', () => {
    render(<OnboardingScreen />);

    fireEvent.press(screen.getByTestId('onboarding-primary-welcome'));
    fireEvent.press(screen.getByTestId('onboarding-primary-hold'));

    expect(navigate).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('goes to the role picker from the last panel', () => {
    render(<OnboardingScreen />);

    fireEvent.press(screen.getByTestId('onboarding-primary-payout'));

    expect(navigate).toHaveBeenCalledWith('RoleSelect');
    // The role answer is recorded on the role screen, not here.
    expect(useOnboardingStore.getState().seen).toBe(false);
  });
});
