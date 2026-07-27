/**
 * Unit tests — Auth Zustand store
 *
 * Verifies:
 *  - setTokens persists to SecureStore and sets state
 *  - logout clears SecureStore and resets state
 *  - loadStored restores state from SecureStore
 *  - loadStored returns false when no tokens stored
 */
// SecureStore mock provided by jest.config.js moduleNameMapper
import SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/auth';

beforeEach(() => {
  jest.clearAllMocks();
  (SecureStore as any)._reset();
  // Reset Zustand store to initial state
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  });
});

describe('Auth store — setTokens', () => {
  it('stores access_token and refresh_token in SecureStore', async () => {
    await useAuthStore.getState().setTokens('access-abc', 'refresh-xyz');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'access-abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'refresh-xyz');
  });

  it('sets isAuthenticated to true and stores tokens in state', async () => {
    await useAuthStore.getState().setTokens('access-abc', 'refresh-xyz');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-abc');
    expect(state.refreshToken).toBe('refresh-xyz');
    expect(state.isAuthenticated).toBe(true);
  });
});

describe('Auth store — logout', () => {
  it('deletes tokens from SecureStore', async () => {
    // Set tokens first
    await useAuthStore.getState().setTokens('access-abc', 'refresh-xyz');
    jest.clearAllMocks();

    await useAuthStore.getState().logout();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
  });

  it('clears all state', async () => {
    await useAuthStore.getState().setTokens('access-abc', 'refresh-xyz');
    useAuthStore.getState().setUser({ user_id: 'u1', kyc_tier: 1 });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('Auth store — loadStored', () => {
  it('restores state from SecureStore when tokens exist', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'access_token') return 'stored-access';
      if (key === 'refresh_token') return 'stored-refresh';
      return null;
    });

    const result = await useAuthStore.getState().loadStored();

    expect(result).toBe(true);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('stored-access');
    expect(state.refreshToken).toBe('stored-refresh');
    expect(state.isAuthenticated).toBe(true);
  });

  it('returns false and keeps state empty when no tokens', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const result = await useAuthStore.getState().loadStored();

    expect(result).toBe(false);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('returns false when only access_token exists (missing refresh)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'access_token') return 'stored-access';
      return null;
    });

    const result = await useAuthStore.getState().loadStored();

    expect(result).toBe(false);
  });
});

describe('Auth store — setUser', () => {
  it('stores user info in state', () => {
    useAuthStore.getState().setUser({ user_id: 'u-123', kyc_tier: 2 });

    expect(useAuthStore.getState().user).toEqual({ user_id: 'u-123', kyc_tier: 2 });
  });
});
