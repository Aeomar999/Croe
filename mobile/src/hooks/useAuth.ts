import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth';
import { api } from '../api/client';

export function useAuth() {
  const queryClient = useQueryClient();
  const { accessToken, refreshToken, user, isAuthenticated, setTokens, setUser, logout, loadStored } =
    useAuthStore();

  const userQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000,
  });

  const signOut = async () => {
    await logout();
    queryClient.clear();
  };

  return {
    isAuthenticated,
    isLoading: userQuery.isLoading && isAuthenticated,
    user: userQuery.data ?? user,
    tokens: { accessToken, refreshToken },
    setTokens,
    setUser,
    signOut,
    loadStored,
  };
}
