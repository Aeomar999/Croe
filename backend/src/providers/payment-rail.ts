import type { Carrier, Money } from "../types/domain.js";

/**
 * Rail-agnostic webhook event (12-Webhooks-and-Idempotency.md). Routes switch
 * on `kind`, never on a provider's raw event name (MONEY-03, task.md T6.3).
 */
export interface ParsedWebhook {
  /** DEPOSIT = buyer collection; PAYOUT = disbursement (release or refund). */
  kind: "DEPOSIT" | "PAYOUT";
  providerRef: string;
  transactionId: string;
  outcome: "PAID" | "FAILED" | "CANCELLED";
  amount: Money;
}

export interface PaymentRail {
  initiateDeposit(p: {
    transactionId: string;
    msisdn: string;
    amount: Money;
    carrier: Carrier;
  }): Promise<{ providerRef: string }>;

  verifyWebhook(rawBody: Buffer, headers: Record<string, string>): boolean;

  parseWebhook(payload: unknown): ParsedWebhook | null;

  initiateDisbursement(p: {
    msisdn: string;
    amount: Money;
    reference: string;
  }): Promise<{ providerRef: string; status: "INITIATED" | "FAILED" }>;
}
