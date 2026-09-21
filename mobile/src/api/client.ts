/**
 * Croe HTTP Client
 * Axios instance with forensic header injection + idempotency key (UI-02).
 * Response interceptor maps error catalog to friendly copy (UI-04).
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import uuid from 'react-native-uuid';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { Platform } from 'react-native';

// ─── Base URL resolution ────────────────────────────────────────
// In development, derive the backend URL from Expo's debugger host
// so the phone can reach the local backend on the same network.
// In production, use the real API domain.
function getBaseURL(): string {
  if (__DEV__) {
    // expo-constants exposes the dev server host (e.g. "172.20.10.2:8081")
    // We strip the metro port and replace with the backend port.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require('expo-constants').default;
      const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
      if (debuggerHost) {
        const host = debuggerHost.split(':')[0];
        return `http://${host}:8080/v1`;
      }
    } catch {
      // fall through to default
    }
    return 'http://localhost:8080/v1';
  }
  return 'https://api.croe.app/v1';
}

// ─── Base instance ──────────────────────────────────────────────
const BASE_URL = getBaseURL();
if (__DEV__) console.log('[Croe API] baseURL:', BASE_URL);

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // short for flaky cellular
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let cachedDeviceId: string | null = null;

async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  
  if (Platform.OS === 'android') {
    cachedDeviceId = Application.getAndroidId();
  } else if (Platform.OS === 'ios') {
    cachedDeviceId = await Application.getIosIdForVendorAsync();
  }
  
  if (!cachedDeviceId) {
    // Fallback: generate a random UUID and store it securely
    const stored = await SecureStore.getItemAsync('fallback_device_id');
    if (stored) {
      cachedDeviceId = stored;
    } else {
      const newId = uuid.v4() as string;
      await SecureStore.setItemAsync('fallback_device_id', newId);
      cachedDeviceId = newId;
    }
  }
  return cachedDeviceId;
}

// ─── Request interceptor: forensic headers + idempotency ────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    // Forensic headers (AUD-02)
    const deviceId = await getDeviceId();
    const networkState = await Network.getNetworkStateAsync();
    
    config.headers['X-Device-Fingerprint'] = deviceId;
    config.headers['X-Network-Type'] = networkState.type || 'UNKNOWN';
    config.headers['X-App-Version'] = Application.nativeApplicationVersion || '1.0.0';
    config.headers['X-Client-Timestamp'] = new Date().toISOString();
  } catch (e) {
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
          `${getBaseURL()}/auth/refresh`,
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
