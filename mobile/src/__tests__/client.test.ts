/**
 * Unit tests — API client interceptor
 *
 * Verifies:
 *  - Forensic headers injected on every request (AUD-02)
 *  - Idempotency-Key (UUIDv4) injected on POST/PUT/DELETE, not GET (UI-02)
 *  - Auth token from SecureStore injected as Bearer
 *  - Error catalog → friendly copy (UI-04)
 */

// ─── Mock axios ──────────────────────────────────────────────────
const requestInterceptors: Array<(config: any) => any> = [];
const responseInterceptors: Array<{ onFulfilled: (v: any) => any; onRejected: (e: any) => any }> = [];
const mockAxiosPost = jest.fn();

jest.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: {
        use: jest.fn((fulfilled: any) => {
          requestInterceptors.push(fulfilled);
        }),
      },
      response: {
        use: jest.fn((onFulfilled: any, onRejected: any) => {
          responseInterceptors.push({ onFulfilled, onRejected });
        }),
      },
    },
    post: mockAxiosPost,
    get: jest.fn(),
    create: jest.fn(() => mockInstance),
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockInstance),
      isAxiosError: jest.fn((err: any) => err?.isAxiosError === true),
    },
  };
});

// ─── SecureStore mock provided by jest.config.js moduleNameMapper ─
import SecureStore from 'expo-secure-store';

// ─── Import client under test (after mocks) ──────────────────────
import { api, friendlyError } from '../api/client';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Request interceptor: forensic headers (AUD-02) ──────────────
describe('Request interceptor — forensic headers (AUD-02)', () => {
  it('injects X-Device-Fingerprint, X-Network-Type, X-App-Version, X-Client-Timestamp', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const config: any = { headers: {}, method: 'get' };

    const result = await requestInterceptors[0](config);

    expect(result.headers['X-Device-Fingerprint']).toBe('device-unknown');
    expect(result.headers['X-Network-Type']).toBe('UNKNOWN');
    expect(result.headers['X-App-Version']).toBe('1.0.0');
    expect(result.headers['X-Client-Timestamp']).toBeDefined();
    expect(new Date(result.headers['X-Client-Timestamp']).toISOString()).toBe(
      result.headers['X-Client-Timestamp'],
    );
  });
});

// ─── Request interceptor: idempotency key (UI-02) ────────────────
describe('Request interceptor — idempotency key (UI-02)', () => {
  it('injects Idempotency-Key on POST', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const config: any = { headers: {}, method: 'post' };

    const result = await requestInterceptors[0](config);

    expect(result.headers['Idempotency-Key']).toBeDefined();
    expect(typeof result.headers['Idempotency-Key']).toBe('string');
    expect(result.headers['Idempotency-Key'].length).toBeGreaterThan(0);
  });

  it('injects Idempotency-Key on PUT', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const config: any = { headers: {}, method: 'put' };

    const result = await requestInterceptors[0](config);

    expect(result.headers['Idempotency-Key']).toBeDefined();
  });

  it('injects Idempotency-Key on DELETE', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const config: any = { headers: {}, method: 'delete' };

    const result = await requestInterceptors[0](config);

    expect(result.headers['Idempotency-Key']).toBeDefined();
  });

  it('does NOT inject Idempotency-Key on GET', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const config: any = { headers: {}, method: 'get' };

    const result = await requestInterceptors[0](config);

    expect(result.headers['Idempotency-Key']).toBeUndefined();
  });

  it('preserves existing Idempotency-Key (retry reuse)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const existingKey = 'stable-key-for-retry-12345';
    const config: any = { headers: { 'Idempotency-Key': existingKey }, method: 'post' };

    const result = await requestInterceptors[0](config);

    expect(result.headers['Idempotency-Key']).toBe(existingKey);
  });

  it('generates unique keys for independent requests', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const config1: any = { headers: {}, method: 'post' };
    const config2: any = { headers: {}, method: 'post' };

    const result1 = await requestInterceptors[0](config1);
    const result2 = await requestInterceptors[0](config2);

    expect(result1.headers['Idempotency-Key']).not.toBe(result2.headers['Idempotency-Key']);
  });
});

// ─── Request interceptor: auth token ─────────────────────────────
describe('Request interceptor — auth token', () => {
  it('injects Bearer token when access_token exists', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'access_token') return 'test-access-token-abc';
      return null;
    });
    const config: any = { headers: {}, method: 'get' };

    const result = await requestInterceptors[0](config);

    expect(result.headers['Authorization']).toBe('Bearer test-access-token-abc');
  });

  it('omits Authorization header when no access_token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const config: any = { headers: {}, method: 'get' };

    const result = await requestInterceptors[0](config);

    expect(result.headers['Authorization']).toBeUndefined();
  });
});

// ─── Response interceptor: 401 refresh-and-retry ─────────────────
describe('Response interceptor — 401 refresh-and-retry', () => {
  it('deletes tokens from SecureStore on failed refresh', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'access_token') return 'expired-token';
      if (key === 'refresh_token') return 'expired-refresh';
      return null;
    });
    mockAxiosPost.mockRejectedValue(new Error('refresh failed'));

    expect(responseInterceptors.length).toBeGreaterThan(0);
    const errorInterceptor = responseInterceptors[0]!.onRejected;

    const error: any = {
      response: { status: 401 },
      config: { headers: {}, _retry: false },
      isAxiosError: true,
    };

    try {
      await errorInterceptor(error);
    } catch {
      // Expected to throw after failed refresh
    }

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
  });
});

// ─── Error catalog (UI-04) ──────────────────────────────────────
describe('friendlyError — error catalog mapping', () => {
  function makeAxiosError(code: string | undefined, status?: number): any {
    return {
      isAxiosError: true,
      response: {
        status: status ?? 400,
        data: { error: code },
      },
      code: undefined,
      message: '',
    };
  }

  it('maps UNAUTHENTICATED to session expired', () => {
    expect(friendlyError(makeAxiosError('UNAUTHENTICATED'))).toBe(
      'Your session expired. Please sign in again.',
    );
  });

  it('maps OTP_EXPIRED to code expired', () => {
    expect(friendlyError(makeAxiosError('OTP_EXPIRED'))).toBe(
      "That code expired. We'll send a new one.",
    );
  });

  it('maps OTP_INVALID to code mismatch', () => {
    expect(friendlyError(makeAxiosError('OTP_INVALID'))).toBe(
      "That code didn't match. Please check and try again.",
    );
  });

  it('maps OTP_LOCKED to too many attempts', () => {
    expect(friendlyError(makeAxiosError('OTP_LOCKED'))).toBe(
      'Too many attempts. Please wait a moment and try again.',
    );
  });

  it('maps KYC_LIMIT_EXCEEDED to verification prompt', () => {
    expect(friendlyError(makeAxiosError('KYC_LIMIT_EXCEEDED'))).toBe(
      'This amount exceeds your current limit. Please complete verification to continue.',
    );
  });

  it('maps EVIDENCE_RECYCLED to calm photo rejection', () => {
    expect(friendlyError(makeAxiosError('EVIDENCE_RECYCLED'))).toContain(
      'matches an image from a previous transaction',
    );
  });

  it('maps PAYOUT_FAILED to retry message', () => {
    expect(friendlyError(makeAxiosError('PAYOUT_FAILED'))).toBe(
      "The payout didn't go through. We'll try again shortly.",
    );
  });

  it('maps 500+ to server error', () => {
    expect(friendlyError(makeAxiosError(undefined, 500))).toBe(
      "Something went wrong on our end. We're looking into it.",
    );
  });

  it('maps timeout to connection message', () => {
    const err: any = {
      isAxiosError: true,
      response: undefined,
      code: 'ECONNABORTED',
      message: 'timeout of 10000ms exceeded',
    };
    expect(friendlyError(err)).toBe(
      'The request timed out. Check your connection and try again.',
    );
  });

  it('maps unknown error to generic message', () => {
    expect(friendlyError(makeAxiosError('SOME_UNKNOWN_CODE'))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('handles non-Axios errors gracefully', () => {
    expect(friendlyError(new Error('native error'))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('handles null/undefined input gracefully', () => {
    expect(friendlyError(null)).toBe('Something went wrong. Please try again.');
    expect(friendlyError(undefined)).toBe('Something went wrong. Please try again.');
  });
});
