import type {
  Currency,
  DisbursementResult,
  Money,
  ReconciliationReport,
} from "../types/domain.js";

export interface CustodyProvider {
  collect(p: {
    transactionId: string;
    buyerMsisdn: string;
    amount: Money;
  }): Promise<{ collectionRef: string; status: "PENDING" }>;

  hold(transactionId: string, amount: Money): Promise<void>;

  releaseTo(p: {
    transactionId: string;
    vendorMsisdn: string;
    amount: Money;
    commission: Money;
  }): Promise<DisbursementResult>;

  refundTo(p: {
    transactionId: string;
    buyerMsisdn: string;
    amount: Money;
  }): Promise<DisbursementResult>;

  getBalance(currency: Currency): Promise<Money>;

  reconcile(window: {
    from: string;
    to: string;
  }): Promise<ReconciliationReport>;
}
