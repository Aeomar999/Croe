/**
 * Unit tests — Onboarding Zustand store
 *
 * Verifies:
 *  - an empty SecureStore hydrates to "not seen", so a fresh install onboards
 *  - a stored flag and role are read back
 *  - a garbage role value is discarded rather than trusted
 *  - complete() persists and flips state
 *  - complete(null) — the Skip path — records seen without a role
 *  - a SecureStore read failure still resolves hydration
 */
// SecureStore mock provided by jest.config.js moduleNameMapper
import SecureStore from 'expo-secure-store';
import { useOnboardingStore } from '../stores/onboarding';

const initial = { seen: false, role: null, hydrated: false } as const;

beforeEach(() => {
  jest.clearAllMocks();
  (SecureStore as any)._reset();
  useOnboardingStore.setState({ ...initial });
});

describe('Onboarding store — hydrate', () => {
  it('reports "not seen" when nothing is stored', async () => {
    await useOnboardingStore.getState().hydrate();

    const state = useOnboardingStore.getState();
    expect(state.seen).toBe(false);
    expect(state.role).toBeNull();
    expect(state.hydrated).toBe(true);
  });

  it('restores a stored flag and role', async () => {
    await SecureStore.setItemAsync('croe.onboarding.seen', 'true');
    await SecureStore.setItemAsync('croe.onboarding.role', 'buyer');

    await useOnboardingStore.getState().hydrate();

    const state = useOnboardingStore.getState();
    expect(state.seen).toBe(true);
    expect(state.role).toBe('buyer');
  });

  it('discards a role value that is not one of the two roles', async () => {
    await SecureStore.setItemAsync('croe.onboarding.seen', 'true');
    await SecureStore.setItemAsync('croe.onboarding.role', 'administrator');

    await useOnboardingStore.getState().hydrate();

    expect(useOnboardingStore.getState().role).toBeNull();
  });

  it('treats any value other than "true" as not seen', async () => {
    await SecureStore.setItemAsync('croe.onboarding.seen', 'yes');

    await useOnboardingStore.getState().hydrate();

    expect(useOnboardingStore.getState().seen).toBe(false);
  });

  it('still finishes hydrating when SecureStore throws', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('keychain unavailable')
    );

    await useOnboardingStore.getState().hydrate();

    const state = useOnboardingStore.getState();
    // Failing towards "show onboarding" is the harmless direction: the
    // alternative is a permanently blank screen behind a loading gate.
    expect(state.hydrated).toBe(true);
    expect(state.seen).toBe(false);
  });
});

describe('Onboarding store — complete', () => {
  it('persists the chosen role and marks onboarding seen', async () => {
    await useOnboardingStore.getState().complete('seller');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('croe.onboarding.seen', 'true');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('croe.onboarding.role', 'seller');

    const state = useOnboardingStore.getState();
    expect(state.seen).toBe(true);
    expect(state.role).toBe('seller');
  });

  it('records seen without a role on the skip path', async () => {
    await useOnboardingStore.getState().complete(null);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('croe.onboarding.seen', 'true');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(
      'croe.onboarding.role',
      expect.anything()
    );

    const state = useOnboardingStore.getState();
    expect(state.seen).toBe(true);
    expect(state.role).toBeNull();
  });

  it('survives a round trip through hydrate', async () => {
    await useOnboardingStore.getState().complete('buyer');
    useOnboardingStore.setState({ ...initial });

    await useOnboardingStore.getState().hydrate();

    expect(useOnboardingStore.getState().seen).toBe(true);
    expect(useOnboardingStore.getState().role).toBe('buyer');
  });
});
