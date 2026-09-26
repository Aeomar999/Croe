import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { 
  APIError, 
  LoginRequest, 
  LoginResponse, 
  RefreshResponse,
  AdminUser,
  DisputeQueueItem,
  DisputeCaseDetail,
  EvidenceArtifact,
  LedgerEvent,
  PartyInfo,
  UserListItem,
  KYCQueueItem,
  ReconciliationReport,
  CustodyAccountBalance,
  SchedulerStatus,
  JobStatus,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Token storage keys
const ACCESS_TOKEN_KEY = 'croe_admin_access_token';
const REFRESH_TOKEN_KEY = 'croe_admin_refresh_token';
const USER_KEY = 'croe_admin_user';

// Token management
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days = 30): void {
  if (typeof window === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

export function setAuthTokens(accessToken: string, refreshToken: string, user: AdminUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  setCookie(ACCESS_TOKEN_KEY, accessToken);
  setCookie(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
}

// Request interceptor - inject auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 with token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: Error | null, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<APIError>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // A 401 from the login or refresh endpoints is a real answer, not an
    // expired session: surface it to the caller instead of redirecting.
    const isAuthEndpoint = /^\/auth\/(login|refresh)\b/.test(originalRequest?.url ?? '');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshTokenValue = getRefreshToken();
      if (!refreshTokenValue) {
        isRefreshing = false;
        clearAuthTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response: AxiosResponse<RefreshResponse> = await axios.post(
          `${API_URL}/v1/auth/refresh`,
          { refresh_token: refreshTokenValue },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { access_token: accessToken, refresh_token: refreshToken } = response.data;
        const user = getStoredUser();
        if (!accessToken || !refreshToken || !user) {
          throw new Error('Session refresh returned an incomplete response');
        }
        setAuthTokens(accessToken, refreshToken, user);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        clearAuthTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    clearAuthTokens();
  },
};

// Disputes API
export const disputesApi = {
  getQueue: async (limit = 50) => {
    const response = await api.get<{ items: DisputeQueueItem[] }>('/admin/disputes/queue', {
      params: { limit },
    });
    return response.data.items;
  },

  getCase: async (disputeId: string) => {
    const response = await api.get<DisputeCaseDetail>(`/admin/disputes/${disputeId}`);
    return response.data;
  },

  resolve: async (disputeId: string, data: { action: 'REFUND_BUYER' | 'RELEASE_VENDOR'; reason: string }) => {
    const response = await api.post<{ status: string }>(`/admin/disputes/${disputeId}/resolve`, data);
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async () => {
    const response = await api.get<{ items: UserListItem[] }>('/admin/users');
    return response.data.items;
  },

  freeze: async (userId: string, data: { frozen: boolean; reason: string }) => {
    const response = await api.post<{ is_frozen: boolean }>(`/admin/users/${userId}/freeze`, data);
    return response.data;
  },

  adjustTrustScore: async (userId: string, data: { trust_score: number; reason: string }) => {
    const response = await api.post<{ trust_score: string }>(`/admin/users/${userId}/trust-score`, data);
    return response.data;
  },
};

// KYC API
export const kycApi = {
  getQueue: async () => {
    const response = await api.get<{ items: KYCQueueItem[] }>('/admin/kyc/queue');
    return response.data.items;
  },

  review: async (kycId: string, data: { approved: boolean; reason?: string }) => {
    const response = await api.post<{ status: 'APPROVED' | 'REJECTED' }>(`/admin/kyc/${kycId}/review`, data);
    return response.data;
  },
};

// Reconciliation API
export const reconciliationApi = {
  getReport: async (from: string, to: string) => {
    const response = await api.get<ReconciliationReport>('/admin/reconciliation', {
      params: { from, to },
    });
    return response.data;
  },
};

// Scheduler API
export const schedulerApi = {
  getStatus: async () => {
    const response = await api.get<SchedulerStatus>('/admin/scheduler-status');
    return response.data;
  },
};

// Metrics API
export const metricsApi = {
  getMetrics: async () => {
    const response = await api.get('/admin/metrics', {
      headers: { Accept: 'text/plain' },
    });
    return response.data;
  },
};

// Re-export types for convenience
export type {
  DisputeQueueItem,
  DisputeCaseDetail,
  EvidenceArtifact,
  LedgerEvent,
  PartyInfo,
  UserListItem,
  KYCQueueItem,
  ReconciliationReport,
  CustodyAccountBalance,
  SchedulerStatus,
  JobStatus,
  AdminUser,
  APIError,
  LoginRequest,
  LoginResponse,
};