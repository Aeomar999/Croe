import { SandboxCustodyProvider, SandboxPaymentRail } from "./sandbox.js";
import { PaystackCustodyProvider, PaystackPaymentRail } from "./paystack.js";
import type { CustodyProvider } from "./custody-provider.js";
import type { PaymentRail } from "./payment-rail.js";
import { env } from "../config/env.js";

/**
 * Switch providers based on CUSTODY_PHASE.
 * P0 = Sandbox (local dev)
 * P1 = Pilot (Paystack)
 */
export const custodyProvider: CustodyProvider =
  env.CUSTODY_PHASE === "P0" ? new SandboxCustodyProvider() : new PaystackCustodyProvider();

export const paymentRail: PaymentRail =
  env.CUSTODY_PHASE === "P0" ? new SandboxPaymentRail() : new PaystackPaymentRail();
