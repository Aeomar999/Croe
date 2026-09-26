/**
 * Croe Admin Dashboard - Type Definitions
 * Matches backend API contracts from 18-API-Reference.md
 */

// User Roles
export type AdminRole = 'reviewer' | 'ops' | 'admin';

// Auth
export interface AdminUser {
  userId: string;
  role: AdminRole;
  email?: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

/** POST /v1/auth/refresh response (18-API-Reference.md §1). */
export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

// Dispute Types
export type DisputeReasonCode =
  | 'ITEM_NOT_RECEIVED'
  | 'ITEM_DAMAGED'
  | 'WRONG_ITEM'
  | 'ITEM_NOT_AS_DESCRIBED';

export type DisputeStatus =
  | 'AI_PROCESSING'
  | 'UNDER_HUMAN_REVIEW'
  | 'RESOLVED_AUTO'
  | 'FRAUD_LOCKOUT';

export type AIAction = 'REFUND_BUYER' | 'RELEASE_VENDOR' | 'ESCALATE_HUMAN';

export interface DisputeQueueItem {
  disputeId: string;
  transactionId: string;
  amount: string;
  currency: string;
  reasonCode: DisputeReasonCode;
  status: DisputeStatus;
  createdAt: string;
  priority: number;
}

export interface DisputeCaseDetail {
  disputeId: string;
  transactionId: string;
  amount: string;
  currency: string;
  reasonCode: DisputeReasonCode;
  claimDescription: string;
  status: DisputeStatus;
  createdAt: string;
  aiRecommendedAction?: AIAction;
  aiConfidence?: number;
  aiReasoningPayload?: Record<string, unknown>;
  evidence: EvidenceArtifact[];
  timeline: LedgerEvent[];
  buyer: PartyInfo;
  vendor: PartyInfo;
}

export interface EvidenceArtifact {
  artifactId: string;
  transactionId: string;
  artifactType: 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'SCREENSHOT';
  sha256Hash: string;
  storageUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  isVerified: boolean;
  isRecycled: boolean;
}

export interface LedgerEvent {
  ledgerId: string;
  transactionId: string;
  actorId: string;
  eventType: string;
  previousStatus?: string;
  newStatus?: string;
  amountDelta?: string;
  currency?: string;
  deviceMetadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PartyInfo {
  userId: string;
  phoneNumber: string;
  trustScore: number;
  kycTier: number;
  accountAgeDays: number;
  isFrozen: boolean;
}

export interface ResolveDisputeRequest {
  action: 'REFUND_BUYER' | 'RELEASE_VENDOR';
  reason: string;
}

export interface ResolveDisputeResponse {
  status: string;
}

// User Management
export interface UserListItem {
  userId: string;
  phoneNumber: string;
  trustScore: number;
  kycTier: number;
  isFrozen: boolean;
  role: string;
  createdAt: string;
}

export interface FreezeUserRequest {
  frozen: boolean;
  reason: string;
}

export interface FreezeUserResponse {
  isFrozen: boolean;
}

export interface AdjustTrustScoreRequest {
  trustScore: number;
  reason: string;
}

export interface AdjustTrustScoreResponse {
  trustScore: string;
}

// KYC
export interface KYCQueueItem {
  kycId: string;
  userId: string;
  phoneNumber: string;
  tier: number;
  idType: 'NATIONAL_ID' | 'PASSPORT' | 'VOTER_ID';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface ReviewKYCRequest {
  approved: boolean;
  reason?: string;
}

export interface ReviewKYCResponse {
  status: 'APPROVED' | 'REJECTED';
}

// Reconciliation
export interface ReconciliationReport {
  summary: {
    totalDeposited: string;
    totalReleased: string;
    totalRefunded: string;
    netHeld: string;
  };
  custodyAccounts: CustodyAccountBalance[];
}

export interface CustodyAccountBalance {
  provider: string;
  currency: string;
  balance: string;
}

// Scheduler
export interface SchedulerStatus {
  jobs: JobStatus[];
  isRunning: boolean;
}

export interface JobStatus {
  name: string;
  lastRun: string | null;
  nextRun: string | null;
  status: 'idle' | 'running' | 'error';
  lastError?: string;
}

// Metrics
export interface MetricsSnapshot {
  prometheusText: string;
}

// API Error
export interface APIError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  cursor?: string;
  hasMore: boolean;
}
