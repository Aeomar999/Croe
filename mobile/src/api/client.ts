/**
 * Croe HTTP Client
 * Axios instance with forensic header injection + idempotency key (UI-02).
 * Response interceptor maps error catalog to friendly copy (UI-04).
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import uuid from 'react-native-uuid';

// ─── Base instance ──────────────────────────────────────────────
export const api = axios.create({
  baseURL: 'https://api.croe.app/v1', // P0: will be env-configured
  timeout: 10000, // short for flaky cellular
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor: forensic headers + idempotency ────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    // Forensic headers (AUD-02)
    config.headers['X-Device-Fingerprint'] = 'device-unknown'; // replaced by react-native-device-info when available
    config.headers['X-Network-Type'] = 'UNKNOWN';
    config.headers['X-App-Version'] = '1.0.0';
    config.headers['X-Client-Timestamp'] = new Date().toISOString();
  } catch {
    config.headers['X-Forensic-Error'] = 'capture failed';
  }

  // Inject Idempotency-Key on mutations (UI-02)
  const method = (config.method ?? 'get').toUpperCase();
  if (['POST', 'PUT', 'DELETE'].includes(method) && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = uuid.v4() as string;
  }

  // Inject auth token
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// ─── Response interceptor: 401 refresh-and-retry ────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error || !token) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 — refresh token and retry once
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(
          'https://api.croe.app/v1/auth/refresh',
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        await SecureStore.setItemAsync('access_token', data.access_token);
        await SecureStore.setItemAsync('refresh_token', data.refresh_token);

        processQueue(null, data.access_token);

        originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Error catalog → friendly copy (UI-04) ──────────────────────
// Never show backend enums, stack traces, or error codes to users.
// Empathetic, calm copy per 20-Design-System.md §5
export const friendlyError = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Something went wrong. Please try again.';
  }

  const code = (error.response?.data as { error?: string })?.error;

  switch (code) {
    case 'UNAUTHENTICATED':
      return 'Your session expired. Please sign in again.';
    case 'OTP_EXPIRED':
      return 'That code expired. We\'ll send a new one.';
    case 'OTP_INVALID':
      return 'That code didn\'t match. Please check and try again.';
    case 'OTP_LOCKED':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please wait a moment.';
    case 'KYC_LIMIT_EXCEEDED':
      return 'This amount exceeds your current limit. Please complete verification to continue.';
    case 'INVALID_STATE_TRANSITION':
      return 'This action isn\'t available right now.';
    case 'CURRENCY_MISMATCH':
      return 'Currency mismatch. Please check and try again.';
    case 'EVIDENCE_RECYCLED':
      return 'We couldn\'t verify this photo — it matches an image from a previous transaction. Please upload an original taken today.';
    case 'FILE_TOO_LARGE':
      return 'That file is too large. Please try a smaller one.';
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 'That file type isn\'t supported. Please try a photo or document.';
    case 'PAYOUT_FAILED':
      return 'The payout didn\'t go through. We\'ll try again shortly.';
    case 'NETWORK_ERROR':
      return 'You\'re offline. Check your connection and try again.';
    default:
      if (error.response?.status && error.response.status >= 500) {
        return 'Something went wrong on our end. We\'re looking into it.';
      }
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return 'The request timed out. Check your connection and try again.';
      }
      return 'Something went wrong. Please try again.';
  }
};
