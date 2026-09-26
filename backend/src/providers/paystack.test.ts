import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Money } from "../types/domain.js";
import crypto from "crypto";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock env
vi.mock("../config/env.js", () => ({
  env: {
    AGGREGATOR_API_KEY: "test-secret-key",
    AGGREGATOR_BASE_URL: "https://api.paystack.co",
    MOMO_WEBHOOK_SECRET: "test-momo-secret",
    PAYSTACK_WEBHOOK_SECRET: "test-webhook-secret",
    CUSTODY_PHASE: "P1",
    FEE_SCHEDULE: "ghana",
  },
}));

// Mock logger
vi.mock("../config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { PaystackCustodyProvider, PaystackPaymentRail } from "./paystack.js";
import { toMinor, fromMinor } from "../services/money.js";

describe("PaystackCustodyProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("releaseTo", () => {
    it("returns FAILED when recipient creation fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Invalid recipient"),
        });

      const provider = new PaystackCustodyProvider();
      const result = await provider.releaseTo({
        transactionId: "tx-123",
        vendorMsisdn: "+233240000001",
        amount: { amount: "100.00", currency: "GHS" },
        commission: { amount: "5.00", currency: "GHS" },
      });

      expect(result.status).toBe("FAILED");
      expect(result.failureReason).toBe("Paystack transfer initiation failed");
      expect(result.providerRef).toBe("rel-tx-123");
    });

    it("returns INITIATED when transfer is initiated successfully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { recipient_code: "RCP_123" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { reference: "TRF_456" } }),
        });

      const provider = new PaystackCustodyProvider();
      const result = await provider.releaseTo({
        transactionId: "tx-123",
        vendorMsisdn: "+233240000001",
        amount: { amount: "100.00", currency: "GHS" },
        commission: { amount: "5.00", currency: "GHS" },
      });

      expect(result.status).toBe("INITIATED");
      expect(result.providerRef).toBe("TRF_456");
      expect(result.payoutId).toBe("TRF_456");
    });

    it("returns FAILED when transfer initiation fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { recipient_code: "RCP_123" } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Insufficient balance"),
        });

      const provider = new PaystackCustodyProvider();
      const result = await provider.releaseTo({
        transactionId: "tx-123",
        vendorMsisdn: "+233240000001",
        amount: { amount: "100.00", currency: "GHS" },
        commission: { amount: "5.00", currency: "GHS" },
      });

      expect(result.status).toBe("FAILED");
      expect(result.failureReason).toBe("Paystack transfer initiation failed");
      expect(result.providerRef).toBe("rel-tx-123");
    });
  });

  describe("refundTo", () => {
    it("returns FAILED when recipient creation fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Invalid recipient"),
        });

      const provider = new PaystackCustodyProvider();
      const result = await provider.refundTo({
        transactionId: "tx-123",
        buyerMsisdn: "+233240000002",
        amount: { amount: "100.00", currency: "GHS" },
      });

      expect(result.status).toBe("FAILED");
      expect(result.failureReason).toBe("Paystack transfer initiation failed");
      expect(result.providerRef).toBe("ref-tx-123");
    });

    it("returns INITIATED when transfer is initiated successfully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { recipient_code: "RCP_123" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { reference: "TRF_789" } }),
        });

      const provider = new PaystackCustodyProvider();
      const result = await provider.refundTo({
        transactionId: "tx-123",
        buyerMsisdn: "+233240000002",
        amount: { amount: "100.00", currency: "GHS" },
      });

      expect(result.status).toBe("INITIATED");
      expect(result.providerRef).toBe("TRF_789");
      expect(result.payoutId).toBe("TRF_789");
    });
  });
});

describe("PaystackPaymentRail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initiateDeposit", () => {
    it("creates a charge and returns providerRef", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { reference: "CHG_123" } }),
      });

      const rail = new PaystackPaymentRail();
      const result = await rail.initiateDeposit({
        transactionId: "tx-123",
        msisdn: "+233240000001",
        amount: { amount: "100.00", currency: "GHS" },
        carrier: "MTN",
      });

      expect(result.providerRef).toBe("CHG_123");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe("https://api.paystack.co/charge");
      expect(call[1]?.method).toBe("POST");
    });

    it("throws on charge failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Invalid amount"),
      });

      const rail = new PaystackPaymentRail();
      await expect(
        rail.initiateDeposit({
          transactionId: "tx-123",
          msisdn: "+233240000001",
          amount: { amount: "100.00", currency: "GHS" },
          carrier: "MTN",
        }),
      ).rejects.toThrow("Paystack deposit failed");
    });

    it("maps carriers correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { reference: "CHG_123" } }),
      });

      const rail = new PaystackPaymentRail();
      await rail.initiateDeposit({
        transactionId: "tx-123",
        msisdn: "+233240000001",
        amount: { amount: "100.00", currency: "GHS" },
        carrier: "AIRTELTIGO",
      });

      const payload = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(payload.mobile_money.provider).toBe("atl");
    });
  });

  describe("verifyWebhook", () => {
    it("returns true for valid Paystack signature", () => {
      const rail = new PaystackPaymentRail();
      const rawBody = Buffer.from('{"event":"charge.success"}');
      const secret = "test-webhook-secret";
      const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");

      const result = rail.verifyWebhook(rawBody, { "x-paystack-signature": expected });

      expect(result).toBe(true);
    });

    it("rejects a signature made with the MoMo/sandbox secret (T1.5)", () => {
      const rail = new PaystackPaymentRail();
      const rawBody = Buffer.from('{"event":"charge.success"}');
      const momoSigned = crypto.createHmac("sha512", "test-momo-secret").update(rawBody).digest("hex");

      expect(rail.verifyWebhook(rawBody, { "x-paystack-signature": momoSigned })).toBe(false);
    });

    it("returns false for invalid signature", () => {
      const rail = new PaystackPaymentRail();
      const rawBody = Buffer.from('{"event":"charge.success"}');

      const result = rail.verifyWebhook(rawBody, { "x-paystack-signature": "invalid-signature" });

      expect(result).toBe(false);
    });

    it("returns false for missing signature", () => {
      const rail = new PaystackPaymentRail();
      const rawBody = Buffer.from('{"event":"charge.success"}');

      const result = rail.verifyWebhook(rawBody, {});

      expect(result).toBe(false);
    });
  });

  describe("parseWebhook", () => {
    it("parses charge.success deposit webhook", () => {
      const rail = new PaystackPaymentRail();
      const payload = {
        event: "charge.success",
        data: {
          reference: "tx-123",
          amount: 10000, // 100.00 GHS in pesewas
          currency: "GHS",
        },
      };

      const result = rail.parseWebhook(payload);

      expect(result).not.toBeNull();
      expect(result?.providerRef).toBe("tx-123");
      expect(result?.transactionId).toBe("tx-123");
      expect(result?.outcome).toBe("PAID");
      expect(result?.amount.amount).toBe("100.00");
      expect(result?.amount.currency).toBe("GHS");
    });

    it("parses transfer.success webhook", () => {
      const rail = new PaystackPaymentRail();
      const payload = {
        event: "transfer.success",
        data: {
          reference: "rel-tx-123",
          transfer_code: "TRF_123",
          amount: 9500, // 95.00 GHS in pesewas
          currency: "GHS",
        },
      };

      const result = rail.parseWebhook(payload);

      expect(result).not.toBeNull();
      expect(result?.providerRef).toBe("rel-tx-123");
      expect(result?.transactionId).toBe("rel-tx-123");
      expect(result?.outcome).toBe("PAID");
      expect(result?.amount.amount).toBe("95.00");
    });

    it("parses transfer.failed webhook", () => {
      const rail = new PaystackPaymentRail();
      const payload = {
        event: "transfer.failed",
        data: {
          reference: "ref-tx-123",
          transfer_code: "TRF_456",
          amount: 10000,
          currency: "GHS",
        },
      };

      const result = rail.parseWebhook(payload);

      expect(result).not.toBeNull();
      expect(result?.outcome).toBe("FAILED");
      expect(result?.amount.amount).toBe("100.00");
    });

    it("parses transfer.reversed webhook", () => {
      const rail = new PaystackPaymentRail();
      const payload = {
        event: "transfer.reversed",
        data: {
          reference: "rel-tx-123",
          transfer_code: "TRF_789",
          amount: 9500,
          currency: "GHS",
        },
      };

      const result = rail.parseWebhook(payload);

      expect(result).not.toBeNull();
      expect(result?.outcome).toBe("CANCELLED");
    });

    it("returns null for non-money events", () => {
      const rail = new PaystackPaymentRail();
      const payload = {
        event: "invoice.create",
        data: {},
      };

      const result = rail.parseWebhook(payload);

      expect(result).toBeNull();
    });

    it("handles missing amount gracefully", () => {
      const rail = new PaystackPaymentRail();
      const payload = {
        event: "charge.success",
        data: {
          reference: "tx-123",
          currency: "GHS",
        },
      };

      const result = rail.parseWebhook(payload);

      expect(result?.amount.amount).toBe("0.00");
    });
  });

  describe("initiateDisbursement", () => {
    it("returns INITIATED on successful recipient and transfer", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { recipient_code: "RCP_123" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { reference: "TRF_123" } }),
        });

      const rail = new PaystackPaymentRail();
      const result = await rail.initiateDisbursement({
        msisdn: "+233240000001",
        amount: { amount: "100.00", currency: "GHS" },
        reference: "rel-tx-123",
      });

      expect(result.status).toBe("INITIATED");
      expect(result.providerRef).toBe("TRF_123");
    });

    it("returns FAILED when recipient creation fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Invalid account"),
      });

      const rail = new PaystackPaymentRail();
      const result = await rail.initiateDisbursement({
        msisdn: "+233240000001",
        amount: { amount: "100.00", currency: "GHS" },
        reference: "rel-tx-123",
      });

      expect(result.status).toBe("FAILED");
      expect(result.providerRef).toBe("rel-tx-123");
    });

    it("returns FAILED when transfer initiation fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { recipient_code: "RCP_123" } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Insufficient funds"),
        });

      const rail = new PaystackPaymentRail();
      const result = await rail.initiateDisbursement({
        msisdn: "+233240000001",
        amount: { amount: "100.00", currency: "GHS" },
        reference: "rel-tx-123",
      });

      expect(result.status).toBe("FAILED");
      expect(result.providerRef).toBe("rel-tx-123");
    });
  });
});