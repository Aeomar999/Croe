/**
 * Render tests — the role picker.
 */
import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { RoleSelectScreen } from './RoleSelectScreen';
import { roleCopy } from './content';
import { useOnboardingStore } from '../../stores/onboarding';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const replace = jest.fn();
const navigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useNavigation as jest.Mock).mockReturnValue({ replace, navigate });
  useOnboardingStore.setState({ seen: false, role: null, hydrated: true });
});

describe('RoleSelectScreen — content', () => {
  it('asks the question and describes both roles', async () => {
    await render(<RoleSelectScreen />);

    expect(screen.getByText(roleCopy.title)).toBeTruthy();
    expect(screen.getByText(roleCopy.lede)).toBeTruthy();
    expect(screen.getByText(roleCopy.seller.title)).toBeTruthy();
    expect(screen.getByText(roleCopy.seller.body)).toBeTruthy();
    expect(screen.getByText(roleCopy.buyer.title)).toBeTruthy();
    expect(screen.getByText(roleCopy.buyer.body)).toBeTruthy();
  });

  it('tells buyers they may not need an account at all', async () => {
    await render(<RoleSelectScreen />);

    expect(screen.getByText(roleCopy.notice.title)).toBeTruthy();
    expect(screen.getByText(roleCopy.notice.body)).toBeTruthy();
  });

  it('says what happens next', async () => {
    await render(<RoleSelectScreen />);

    expect(screen.getByText(roleCopy.footnote)).toBeTruthy();
  });

  it('offers no way to skip — the question already has a safe default', async () => {
    await render(<RoleSelectScreen />);

    expect(screen.queryByText('Skip')).toBeNull();
  });
});

describe('RoleSelectScreen — selection', () => {
  it('pre-selects selling so Continue is never a dead end', async () => {
    await render(<RoleSelectScreen />);

    expect(screen.getByTestId('role-option-seller')).toBeSelected();
    expect(screen.getByTestId('role-option-buyer')).not.toBeSelected();
  });

  it('moves the selection to buying when tapped', async () => {
    await render(<RoleSelectScreen />);

    await userEvent.press(screen.getByTestId('role-option-buyer'));

    expect(screen.getByTestId('role-option-buyer')).toBeSelected();
    expect(screen.getByTestId('role-option-seller')).not.toBeSelected();
  });
});

describe('RoleSelectScreen — continue', () => {
  it('persists the default role and goes to sign-in', async () => {
    await render(<RoleSelectScreen />);

    await userEvent.press(screen.getByTestId('role-continue'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('PhoneInput'));
    expect(useOnboardingStore.getState().role).toBe('seller');
    expect(useOnboardingStore.getState().seen).toBe(true);
  });

  it('persists a changed role', async () => {
    await render(<RoleSelectScreen />);

    await userEvent.press(screen.getByTestId('role-option-buyer'));
    await userEvent.press(screen.getByTestId('role-continue'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('PhoneInput'));
    expect(useOnboardingStore.getState().role).toBe('buyer');
  });
});
