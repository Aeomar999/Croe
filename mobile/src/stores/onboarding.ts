/**
 * Onboarding store — first-run flag and the role answer.
 *
 * Both live in SecureStore alongside the auth tokens. The role is a local
 * presentation preference, not identity: it decides which tab the app opens on
 * and nothing else, so it never leaves the device.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const SEEN_KEY = 'croe.onboarding.seen';
const ROLE_KEY = 'croe.onboarding.role';

export type OnboardingRole = 'seller' | 'buyer';

interface OnboardingState {
  seen: boolean;
  role: OnboardingRole | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  complete: (role: OnboardingRole | null) => Promise<void>;
}

function parseRole(value: string | null): OnboardingRole | null {
  return value === 'seller' || value === 'buyer' ? value : null;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  seen: false,
  role: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const [seen, role] = await Promise.all([
        SecureStore.getItemAsync(SEEN_KEY),
        SecureStore.getItemAsync(ROLE_KEY),
      ]);
      set({ seen: seen === 'true', role: parseRole(role), hydrated: true });
    } catch {
      // A read failure must not strand the user on a blank screen. Showing
      // onboarding again is the harmless direction to fail in.
      set({ seen: false, role: null, hydrated: true });
    }
  },

  // role is null on the Skip path — onboarding is done, but no answer was given.
  complete: async (role: OnboardingRole | null) => {
    set({ seen: true, role });
    await SecureStore.setItemAsync(SEEN_KEY, 'true');
    if (role) {
      await SecureStore.setItemAsync(ROLE_KEY, role);
    }
  },
}));
