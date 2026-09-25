import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import crypto from "crypto";
import type { Carrier, Currency, DisbursementResult, Money, ReconciliationReport } from "../types/domain.js";
import type { CustodyProvider } from "./custody-provider.js";
import type { PaymentRail } from "./payment-rail.js";
import { toMinor, fromMinor } from "../services/money.js";

interface PaystackBalanceResponse {
  data: Array<{ currency: string; balance: number }>;
}

interface PaystackChargeResponse {
  data: { reference: string };
}

interface PaystackRecipientResponse {
  data: { recipient_code: string };
}

interface PaystackTransferResponse {
  data: { reference: string };
}

interface PaystackWebhookPayload {
  event: string;
  data: {
    reference?: string;
    transfer_code?: string;
    amount?: number;
    currency?: string;
    [key: string]: unknown;
  };
}

function getHeaders() {
  return {
    Authorization: `Bearer ${env.AGGREGATOR_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export class PaystackCustodyProvider implements CustodyProvider {
  async collect(p: { transactionId: string; buyerMsisdn: string; amount: Money }): Promise<{ collectionRef: string; status: "PENDING" }> {
    return { collectionRef: `PAYSTACK-COLLECT-${p.transactionId}`, status: "PENDING" };
  }

  async hold(_transactionId: string, _amount: Money): Promise<void> {
    // Paystack holds funds implicitly in our balance once paid.
  }

  async releaseTo(p: { transactionId: string; vendorMsisdn: string; amount: Money; commission: Money }): Promise<DisbursementResult> {
    const rail = new PaystackPaymentRail();
    const result = await rail.initiateDisbursement({
      msisdn: p.vendorMsisdn,
      amount: p.amount,
      reference: `rel-${p.transactionId}`,
    });

    if (result.status === "FAILED") {
      return {
        payoutId: result.providerRef,
        status: "FAILED",
        providerRef: result.providerRef,
        failureReason: "Paystack transfer initiation failed",
      };
    }

    return {
      payoutId: result.providerRef,
      status: "INITIATED",
      providerRef: result.providerRef,
    };
  }

  async refundTo(p: { transactionId: string; buyerMsisdn: string; amount: Money }): Promise<DisbursementResult> {
    const rail = new PaystackPaymentRail();
    const result = await rail.initiateDisbursement({
      msisdn: p.buyerMsisdn,
      amount: p.amount,
      reference: `ref-${p.transactionId}`,
    });

    if (result.status === "FAILED") {
      return {
        payoutId: result.providerRef,
        status: "FAILED",
        providerRef: result.providerRef,
        failureReason: "Paystack transfer initiation failed",
      };
    }

    return {
      payoutId: result.providerRef,
      status: "INITIATED",
      providerRef: result.providerRef,
    };
  }

async getBalance(currency: Currency): Promise<Money> {
    const res = await fetch(`${env.AGGREGATOR_BASE_URL}/balance`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Paystack getBalance failed: ${res.statusText}`);
    }
    const data = await res.json() as PaystackBalanceResponse;
    const balanceObj = data.data.find((b) => b.currency === currency);
    const amountInPesewas = balanceObj ? balanceObj.balance : 0;

    return {
      amount: fromMinor(BigInt(amountInPesewas)),
      currency,
    };
  }

  async reconcile(_window: { from: string; to: string }): Promise<ReconciliationReport> {
    // For P1, we assume matched if we can't fully sync with Paystack's settlement API yet.
    return {
      pooled: { amount: "0.00", currency: "GHS" },
      subLedgerSum: { amount: "0.00", currency: "GHS" },
      statementSum: { amount: "0.00", currency: "GHS" },
      matched: true,
      discrepancies: [],
    };
  }
}

export class PaystackPaymentRail implements PaymentRail {
  async initiateDeposit(p: { transactionId: string; msisdn: string; amount: Money; carrier: Carrier }): Promise<{ providerRef: string }> {
    const amountInPesewas = toMinor(p.amount.amount);
    
    // Map our carrier to Paystack's provider string
    let provider = "mtn";
    if (p.carrier.toLowerCase().includes("airtel") || p.carrier.toLowerCase().includes("tigo")) provider = "atl";
    if (p.carrier.toLowerCase().includes("vodafone") || p.carrier.toLowerCase().includes("telecel")) provider = "vod";

    const payload = {
      email: `customer-${p.msisdn}@croe.io`,
      amount: amountInPesewas.toString(),
      currency: p.amount.currency,
      mobile_money: {
        phone: p.msisdn,
        provider,
      },
      reference: p.transactionId,
    };

    const res = await fetch(`${env.AGGREGATOR_BASE_URL}/charge`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error({ errorText, status: res.status }, "Paystack deposit failed");
      throw new Error("Paystack deposit failed");
    }

    const data = await res.json() as PaystackChargeResponse;
    return { providerRef: data.data.reference };
  }

  verifyWebhook(rawBody: Buffer, headers: Record<string, string>): boolean {
    const signature = headers["x-paystack-signature"] as string | undefined;
    if (!signature) {
      return false;
    }

    const expected = crypto
      .createHmac("sha512", env.MOMO_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      logger.warn("Invalid Paystack webhook signature");
      return false;
    }

    return true;
  }

  parseWebhook(payload: unknown): { providerRef: string; transactionId: string; outcome: "PAID" | "FAILED" | "CANCELLED"; amount: Money } | null {
    const p = payload as PaystackWebhookPayload;
    const data = p.data ?? {};
    const event = p.event;

    // Handle deposit webhooks (charge.success)
    if (event === "charge.success") {
      const amountInPesewas = BigInt(data.amount ?? 0);
      const amountFormatted = fromMinor(amountInPesewas);

      return {
        providerRef: data.reference ?? String(Date.now()),
        transactionId: data.reference ?? "",
        outcome: "PAID",
        amount: {
          amount: amountFormatted,
          currency: (data.currency as Currency) || "GHS",
        },
      };
    }

    // Handle transfer webhooks (transfer.success, transfer.failed, transfer.reversed)
    if (event === "transfer.success" || event === "transfer.failed" || event === "transfer.reversed") {
      const amountInPesewas = BigInt(data.amount ?? 0);
      const amountFormatted = fromMinor(amountInPesewas);

      let outcome: "PAID" | "FAILED" | "CANCELLED" = "FAILED";
      if (event === "transfer.success") {
        outcome = "PAID";
      } else if (event === "transfer.reversed") {
        outcome = "CANCELLED";
      }

      return {
        providerRef: data.reference ?? data.transfer_code ?? String(Date.now()),
        transactionId: data.reference ?? "",
        outcome,
        amount: {
          amount: amountFormatted,
          currency: (data.currency as Currency) || "GHS",
        },
      };
    }

    // Non-money webhook events we don't process for escrow state
    return null;
  }

  async initiateDisbursement(p: { msisdn: string; amount: Money; reference: string }): Promise<{ providerRef: string; status: "INITIATED" | "FAILED" }> {
    const amountInPesewas = toMinor(p.amount.amount);

    const recipientPayload = {
      type: "mobile_money",
      name: `User ${p.msisdn}`,
      account_number: p.msisdn,
      bank_code: "MTN",
      currency: p.amount.currency,
    };

    const recipientRes = await fetch(`${env.AGGREGATOR_BASE_URL}/transferrecipient`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(recipientPayload),
    });

    if (!recipientRes.ok) {
      const err = await recipientRes.text();
      logger.error({ err }, "Failed to create transfer recipient");
      return { providerRef: p.reference, status: "FAILED" };
    }

    const recipientData = await recipientRes.json() as PaystackRecipientResponse;
    const recipientCode = recipientData.data.recipient_code;

    const transferPayload = {
      source: "balance",
      amount: amountInPesewas.toString(),
      reference: p.reference,
      recipient: recipientCode,
      reason: "Croe Escrow Disbursement",
    };

    const transferRes = await fetch(`${env.AGGREGATOR_BASE_URL}/transfer`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(transferPayload),
    });

    if (!transferRes.ok) {
      const err = await transferRes.text();
      logger.error({ err }, "Failed to initiate transfer");
      return { providerRef: p.reference, status: "FAILED" };
    }

    const transferData = await transferRes.json() as PaystackTransferResponse;
    return {
      providerRef: transferData.data.reference,
      status: "INITIATED",
    };
  }
}
