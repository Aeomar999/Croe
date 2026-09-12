import type { Carrier, Currency, DisbursementResult, Money, ReconciliationReport } from "../types/domain.js";
import type { CustodyProvider } from "./custody-provider.js";
import type { PaymentRail } from "./payment-rail.js";
import { pool } from "../db/pool.js";

/**
 * P0 Sandbox CustodyProvider.
 * No real money movement. Ledger entries are written but no external calls made.
 */
export class SandboxCustodyProvider implements CustodyProvider {
  async collect(_p: {
    transactionId: string;
    buyerMsisdn: string;
    amount: Money;
  }): Promise<{ collectionRef: string; status: "PENDING" }> {
    const collectionRef = `SANDBOX-COLLECT-${Date.now()}`;
    return { collectionRef, status: "PENDING" };
  }

  async hold(_transactionId: string, _amount: Money): Promise<void> {
    // Sandbox: funds are immediately "held"
  }

  async releaseTo(p: {
    transactionId: string;
    vendorMsisdn: string;
    amount: Money;
    commission: Money;
  }): Promise<DisbursementResult> {
    return {
      payoutId: `SANDBOX-PAYOUT-${Date.now()}`,
      status: "SUCCESS",
      providerRef: `sandbox-ref-${p.transactionId}`,
    };
  }

  async refundTo(p: {
    transactionId: string;
    buyerMsisdn: string;
    amount: Money;
  }): Promise<DisbursementResult> {
    return {
      payoutId: `SANDBOX-REFUND-${Date.now()}`,
      status: "SUCCESS",
      providerRef: `sandbox-refund-${p.transactionId}`,
    };
  }

  async getBalance(currency: Currency): Promise<Money> {
    return { amount: "0.00", currency };
  }

  async reconcile(window: {
    from: string;
    to: string;
  }): Promise<ReconciliationReport> {
    // Sub-ledger sum: net of all escrow_transactions in the window
    // In P0 sandbox we compute inflows (DEPOSITED) minus outflows (RELEASED/REFUNDED)
    const { rows: subLedgerRows } = await pool.query<{
      net_amount: string;
      currency: string;
    }>(
      `SELECT
         COALESCE(SUM(
           CASE
             WHEN current_status IN ('FUNDS_SECURED', 'SHIPPED', 'DELIVERED_CONFIRMED')
               THEN amount
             WHEN current_status IN ('FUNDS_RELEASED', 'FUNDS_REFUNDED')
               THEN -amount
             ELSE 0
           END
         ), '0') AS net_amount,
         currency
       FROM escrow_transactions
       WHERE updated_at >= $1 AND updated_at < $2
       GROUP BY currency`,
      [window.from, window.to],
    );

    // Pooled balance: sum of all signed ledger deltas (deposits +, payouts -)
    const { rows: pooledRows } = await pool.query<{ pooled: string; currency: string }>(
      `SELECT
         COALESCE(SUM(
           CASE
             WHEN event_type IN ('FUNDS_DEPOSITED', 'FUNDS_RELEASED', 'REFUND_ISSUED')
               THEN amount_delta
             ELSE 0
           END
         ), '0') AS pooled,
         currency
       FROM transaction_ledger
       WHERE created_at >= $1 AND created_at < $2
       GROUP BY currency`,
      [window.from, window.to],
    );

    // In sandbox, statement = sub-ledger (no external aggregator statement yet)
    const netAmount = subLedgerRows[0]?.net_amount ?? "0";
    const pooledAmount = pooledRows[0]?.pooled ?? "0";
    const currency = (subLedgerRows[0]?.currency ?? pooledRows[0]?.currency ?? "GHS") as Currency;
    const discrepancies: Array<{ transactionId?: string; note: string; delta: Money }> = [];

    if (netAmount !== pooledAmount) {
      discrepancies.push(
        { note: `Sub-ledger net (${netAmount}) differs from pooled balance (${pooledAmount})`, delta: { amount: String(Math.abs(parseFloat(netAmount) - parseFloat(pooledAmount))), currency } },
      );
    }

    return {
      pooled: { amount: pooledAmount, currency },
      subLedgerSum: { amount: netAmount, currency },
      statementSum: { amount: netAmount, currency }, // sandbox: statement = sub-ledger
      matched: discrepancies.length === 0,
      discrepancies,
    };
  }
}

/**
 * P0 Sandbox PaymentRail.
 * Simulates MoMo USSD push and webhook callbacks.
 */
export class SandboxPaymentRail implements PaymentRail {
  async initiateDeposit(_p: {
    transactionId: string;
    msisdn: string;
    amount: Money;
    carrier: Carrier;
  }): Promise<{ providerRef: string }> {
    return { providerRef: `SANDBOX-DEPOSIT-${Date.now()}` };
  }

  verifyWebhook(_rawBody: Buffer, _headers: Record<string, string>): boolean {
    // Sandbox: always accept
    return true;
  }

  parseWebhook(payload: unknown): {
    providerRef: string;
    transactionId: string;
    outcome: "PAID" | "FAILED" | "CANCELLED";
    amount: Money;
  } {
    const p = payload as Record<string, unknown>;
    return {
      providerRef: String(p.providerRef ?? `SANDBOX-WEBHOOK-${Date.now()}`),
      transactionId: String(p.transactionId ?? ""),
      outcome: "PAID",
      amount: {
        amount: String(p.amount ?? "0.00"),
        currency: "GHS",
      },
    };
  }

  async initiateDisbursement(_p: {
    msisdn: string;
    amount: Money;
    reference: string;
  }): Promise<{ providerRef: string; status: "INITIATED" | "FAILED" }> {
    return {
      providerRef: `SANDBOX-DISBURSE-${Date.now()}`,
      status: "INITIATED",
    };
  }
}
