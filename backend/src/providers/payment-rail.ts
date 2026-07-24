import type { Carrier, Money } from "../types/domain.js";

export interface PaymentRail {
  initiateDeposit(p: {
    transactionId: string;
    msisdn: string;
    amount: Money;
    carrier: Carrier;
  }): Promise<{ providerRef: string }>;

  verifyWebhook(rawBody: Buffer, headers: Record<string, string>): boolean;

  parseWebhook(payload: unknown): {
    providerRef: string;
    transactionId: string;
    outcome: "PAID" | "FAILED" | "CANCELLED";
    amount: Money;
  };

  initiateDisbursement(p: {
    msisdn: string;
    amount: Money;
    reference: string;
  }): Promise<{ providerRef: string; status: "INITIATED" | "FAILED" }>;
}
