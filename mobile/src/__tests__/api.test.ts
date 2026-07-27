/**
 * Unit tests — API layer (auth, escrow, disputes)
 *
 * Verifies each API function calls the correct endpoint with correct method.
 */
// ─── Mock axios module ───────────────────────────────────────────
const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      get: mockGet,
      post: mockPost,
    })),
    isAxiosError: jest.fn(),
  },
}));

// SecureStore mock provided by jest.config.js moduleNameMapper
import SecureStore from 'expo-secure-store';

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReset();
  mockPost.mockReset();
});

// ─── Auth API ────────────────────────────────────────────────────
describe('Auth API', () => {
  it('requestOTP calls POST /auth/otp/request with phone number', async () => {
    mockPost.mockResolvedValue({ data: { message: 'OTP sent' } });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { requestOTP } = require('../api/auth');
    const result = await requestOTP('+233501234567');

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/otp/request',
      { phone_number: '+233501234567' },
    );
    expect(result).toEqual({ message: 'OTP sent' });
  });

  it('verifyOTP calls POST /auth/otp/verify with phone and code', async () => {
    mockPost.mockResolvedValue({
      data: { access_token: 'at', refresh_token: 'rt' },
    });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { verifyOTP } = require('../api/auth');
    const result = await verifyOTP('+233501234567', '123456');

    expect(mockPost).toHaveBeenCalledWith('/auth/otp/verify', {
      phone_number: '+233501234567',
      code: '123456',
    });
    expect(result).toEqual({ access_token: 'at', refresh_token: 'rt' });
  });

  it('getMe calls GET /auth/me', async () => {
    mockGet.mockResolvedValue({
      data: { user_id: 'u1', kyc_tier: 1 },
    });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { getMe } = require('../api/auth');
    const result = await getMe();

    expect(mockGet).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual({ user_id: 'u1', kyc_tier: 1 });
  });
});

// ─── Escrow API ──────────────────────────────────────────────────
describe('Escrow API', () => {
  it('createEscrow calls POST /escrow', async () => {
    mockPost.mockResolvedValue({
      data: { transaction_id: 'tx1', pay_url: 'https://pay.croe.app/tx1', current_status: 'LINK_CREATED' },
    });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { createEscrow } = require('../api/escrow');
    const body = {
      item_description: 'Phone case',
      amount: '450.00',
      currency: 'GHS' as const,
      delivery_terms: 'Within 3 days',
    };
    const result = await createEscrow(body);

    expect(mockPost).toHaveBeenCalledWith('/escrow', body);
    expect(result.transaction_id).toBe('tx1');
  });

  it('listEscrows calls GET /escrow', async () => {
    mockGet.mockResolvedValue({ data: [] });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { listEscrows } = require('../api/escrow');
    await listEscrows();

    expect(mockGet).toHaveBeenCalledWith('/escrow');
  });

  it('getEscrow calls GET /escrow/:id', async () => {
    mockGet.mockResolvedValue({ data: { transaction_id: 'tx1' } });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { getEscrow } = require('../api/escrow');
    await getEscrow('tx1');

    expect(mockGet).toHaveBeenCalledWith('/escrow/tx1');
  });

  it('deposit calls POST /escrow/:id/deposit', async () => {
    mockPost.mockResolvedValue({ data: { collectionRef: 'c1', status: 'INITIATED' } });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { deposit } = require('../api/escrow');
    await deposit('tx1', { msisdn: '+233501234567', carrier: 'MTN' });

    expect(mockPost).toHaveBeenCalledWith('/escrow/tx1/deposit', {
      msisdn: '+233501234567',
      carrier: 'MTN',
    });
  });

  it('shipEscrow calls POST /escrow/:id/ship', async () => {
    mockPost.mockResolvedValue({ data: { current_status: 'SHIPPED' } });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { shipEscrow } = require('../api/escrow');
    await shipEscrow('tx1');

    expect(mockPost).toHaveBeenCalledWith('/escrow/tx1/ship');
  });

  it('confirmDelivery calls POST /escrow/:id/confirm-delivery', async () => {
    mockPost.mockResolvedValue({ data: { current_status: 'DELIVERED_CONFIRMED' } });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { confirmDelivery } = require('../api/escrow');
    await confirmDelivery('tx1');

    expect(mockPost).toHaveBeenCalledWith('/escrow/tx1/confirm-delivery');
  });

  it('cancelEscrow calls POST /escrow/:id/cancel', async () => {
    mockPost.mockResolvedValue({ data: { current_status: 'CANCELLED' } });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { cancelEscrow } = require('../api/escrow');
    await cancelEscrow('tx1');

    expect(mockPost).toHaveBeenCalledWith('/escrow/tx1/cancel');
  });
});

// ─── Disputes API ────────────────────────────────────────────────
describe('Disputes API', () => {
  it('openDispute calls POST /disputes', async () => {
    mockPost.mockResolvedValue({ data: { dispute_id: 'd1', status: 'OPEN' } });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { openDispute } = require('../api/disputes');
    const body = {
      transaction_id: 'tx1',
      reason_code: 'NOT_RECEIVED' as const,
      claim_description: 'Did not receive item',
      evidence_artifact_ids: [],
    };
    await openDispute(body);

    expect(mockPost).toHaveBeenCalledWith('/disputes', body);
  });

  it('getDisputeStatus calls GET /disputes/:id/status', async () => {
    mockGet.mockResolvedValue({ data: { status: 'AI_PROCESSING' } });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { getDisputeStatus } = require('../api/disputes');
    await getDisputeStatus('d1');

    expect(mockGet).toHaveBeenCalledWith('/disputes/d1/status');
  });
});
