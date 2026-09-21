/**
 * API TypeScript types matching backend responses.
 * See for_agents/18-API-Reference.md for full contract.
 */

// ─── Auth ───────────────────────────────────────────────────────
export interface OTPRequestResponse {
  message: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface MeResponse {
  user_id: string;
  kyc_tier: number;
}

// ─── Escrow ─────────────────────────────────────────────────────
export type EscrowCurrency = 'GHS' | 'NGN' | 'KES';

export type EscrowState =
  | 'LINK_CREATED'
  | 'AWAITING_DEPOSIT'
  | 'FUNDS_SECURED'
  | 'SHIPPED'
  | 'DELIVERED_CONFIRMED'
  | 'FUNDS_RELEASED'
  | 'DISPUTE_OPENED'
  | 'AI_PROCESSING'
  | 'UNDER_HUMAN_REVIEW'
  | 'RESOLVED_AUTO'
  | 'FUNDS_REFUNDED'
  | 'FRAUD_LOCKOUT'
  | 'EXPIRED'
  | 'CANCELLED';

export type Carrier = 'MTN' | 'TELECEL' | 'AIRTELTIGO';

export interface EscrowTransaction {
  transaction_id: string;
  item_description: string;
  amount: string; // decimal string, e.g. "450.00"
  currency: EscrowCurrency;
  current_status: EscrowState;
  vendor_id: string;
  buyer_id: string | null;
  commission: string;
  deposit_expires_at: string | null;
  dispute_closes_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEscrowRequest {
  item_description: string;
  amount: string; // NUMERIC(15,2) wire format, e.g. "450.00"
  currency: EscrowCurrency;
  delivery_terms: string;
}

export interface CreateEscrowResponse {
  transaction_id: string;
  current_status: EscrowState;
  amount: string;
  currency: EscrowCurrency;
  created_at: string;
}

export interface DepositRequest {
  msisdn: string; // E.164
  carrier: Carrier;
}

export interface DepositResponse {
  collectionRef: string;
  status: string;
}

export interface ShipResponse {
  current_status: EscrowState;
}

// ─── Evidence ───────────────────────────────────────────────────
export type ArtifactType = 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'SCREENSHOT';

export interface UploadEvidenceResponse {
  artifact_id: string;
  sha256: string;
}

// ─── Disputes ───────────────────────────────────────────────────
export type DisputeReason =
  | 'NOT_RECEIVED'
  | 'WRONG_ITEM'
  | 'DAMAGED'
  | 'NOT_AS_DESCRIBED'
  | 'OTHER';

export interface OpenDisputeRequest {
  transaction_id: string;
  reason_code: DisputeReason;
  claim_description: string;
  evidence_artifact_ids: string[];
}

export interface OpenDisputeResponse {
  dispute_id: string;
  status: string;
}

export interface DisputeStatusResponse {
  status: string;
  ai_recommended_action?: string;
  summary_for_users?: string;
}

// ─── KYC ────────────────────────────────────────────────────────
export type KycIdType = 'NATIONAL_ID' | 'PASSPORT' | 'VOTER_ID';

export interface SubmitKycResponse {
  kyc_id: string;
  status: string;
}

export interface KycStatusResponse {
  tier: number;
  status: string;
}

// ─── Admin ──────────────────────────────────────────────────────
export type AdminAction = 'REFUND_BUYER' | 'RELEASE_VENDOR';

// ─── Error ──────────────────────────────────────────────────────
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}
