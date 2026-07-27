/**
 * Auth store — Zustand for tokens, user, login/logout.
 * Tokens persisted in expo-secure-store.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { MeResponse } from '../types/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: MeResponse | null;
  isAuthenticated: boolean;
  setTokens: (access: string, refresh: string) => Promise<void>;
  setUser: (user: MeResponse) => void;
  logout: () => Promise<void>;
  loadStored: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

  setTokens: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },

  setUser: (user: MeResponse) => {
    set({ user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  loadStored: async () => {
    const access = await SecureStore.getItemAsync('access_token');
    const refresh = await SecureStore.getItemAsync('refresh_token');
    if (access && refresh) {
      set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
      return true;
    }
    return false;
  },
}));
