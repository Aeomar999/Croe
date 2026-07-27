/**
 * Render tests — the role picker.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RoleSelectScreen } from './RoleSelectScreen';
import { roleCopy } from './content';
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

describe('RoleSelectScreen — content', () => {
  it('asks the question and describes both roles', () => {
    render(<RoleSelectScreen />);

    expect(screen.getByText(roleCopy.title)).toBeTruthy();
    expect(screen.getByText(roleCopy.lede)).toBeTruthy();
    expect(screen.getByText(roleCopy.seller.title)).toBeTruthy();
    expect(screen.getByText(roleCopy.seller.body)).toBeTruthy();
    expect(screen.getByText(roleCopy.buyer.title)).toBeTruthy();
    expect(screen.getByText(roleCopy.buyer.body)).toBeTruthy();
  });

  it('tells buyers they may not need an account at all', () => {
    render(<RoleSelectScreen />);

    expect(screen.getByText(roleCopy.notice.title)).toBeTruthy();
    expect(screen.getByText(roleCopy.notice.body)).toBeTruthy();
  });

  it('says what happens next', () => {
    render(<RoleSelectScreen />);

    expect(screen.getByText(roleCopy.footnote)).toBeTruthy();
  });

  it('offers no way to skip — the question already has a safe default', () => {
    render(<RoleSelectScreen />);

    expect(screen.queryByText('Skip')).toBeNull();
  });
});

describe('RoleSelectScreen — selection', () => {
  it('pre-selects selling so Continue is never a dead end', () => {
    render(<RoleSelectScreen />);

    expect(screen.getByTestId('role-option-seller')).toHaveAccessibilityState({
      selected: true,
    });
    expect(screen.getByTestId('role-option-buyer')).toHaveAccessibilityState({
      selected: false,
    });
  });

  it('moves the selection to buying when tapped', () => {
    render(<RoleSelectScreen />);

    fireEvent.press(screen.getByTestId('role-option-buyer'));

    expect(screen.getByTestId('role-option-buyer')).toHaveAccessibilityState({
      selected: true,
    });
    expect(screen.getByTestId('role-option-seller')).toHaveAccessibilityState({
      selected: false,
    });
  });
});

describe('RoleSelectScreen — continue', () => {
  it('persists the default role and goes to sign-in', async () => {
    render(<RoleSelectScreen />);

    fireEvent.press(screen.getByTestId('role-continue'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('PhoneInput'));
    expect(useOnboardingStore.getState().role).toBe('seller');
    expect(useOnboardingStore.getState().seen).toBe(true);
  });

  it('persists a changed role', async () => {
    render(<RoleSelectScreen />);

    fireEvent.press(screen.getByTestId('role-option-buyer'));
    fireEvent.press(screen.getByTestId('role-continue'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('PhoneInput'));
    expect(useOnboardingStore.getState().role).toBe('buyer');
  });
});
