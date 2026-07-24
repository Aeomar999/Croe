import { SandboxCustodyProvider } from "./sandbox.js";
import { SandboxPaymentRail } from "./sandbox.js";
import type { CustodyProvider } from "./custody-provider.js";
import type { PaymentRail } from "./payment-rail.js";

/**
 * P0 shared provider instances.
 * Phase P1+ will swap these for real aggregator SDKs behind the same interfaces.
 */
export const custodyProvider: CustodyProvider = new SandboxCustodyProvider();
export const paymentRail: PaymentRail = new SandboxPaymentRail();
