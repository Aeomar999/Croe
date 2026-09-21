'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, getAccessToken, getStoredUser, setAuthTokens, clearAuthTokens, type AdminUser, type LoginRequest, type LoginResponse } from '@/lib/api';

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: AdminUser['role'][]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      const storedUser = getStoredUser();
      if (token && storedUser) {
        setUser(storedUser);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    const { accessToken, refreshToken, user: userData } = response.data;
    setAuthTokens(accessToken, refreshToken, userData);
    setUser(userData);
    router.push('/dashboard');
    router.refresh();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuthTokens();
      setUser(null);
      router.push('/login');
      router.refresh();
    }
  };

  const hasRole = (roles: AdminUser['role'][]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected route wrapper
export function useRequireAuth(allowedRoles?: AdminUser['role'][]) {
  const { user, isLoading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && !hasRole(allowedRoles)) {
        router.push('/dashboard'); // or 403 page
      }
    }
  }, [user, isLoading, allowedRoles, router, hasRole]);

  return { user, isLoading };
}