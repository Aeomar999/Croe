import { pool } from "../db/pool.js";
import { logger } from "../config/logger.js";

// ── Threshold constants (13-Disputes-and-AI-Triage.md §3) ──
const SYBIL_ACCOUNT_THRESHOLD = 2;
const SYBIL_DISPUTE_THRESHOLD = 3;
const BURNER_ACCOUNT_AGE_HOURS = 48;
const BURNER_TRUST_THRESHOLD = 50;
const TRUST_PENALTY_RECYCLED = 50;

export type HeuristicResult = {
  ruleTriggered: "RECYCLED_MEDIA" | "SYBIL_VELOCITY" | "BURNER_ACCOUNT" | null;
  details: Record<string, unknown>;
};

// ── Query A: Recycled evidence ──
export async function queryRecycledEvidence(
  sha256Hash: string,
  transactionId: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM evidence_artifacts WHERE sha256_hash = $1 AND transaction_id != $2)`,
    [sha256Hash, transactionId],
  );
  return rows[0]?.exists ?? false;
}

// ── Query B: Sybil velocity ──
export async function querySybilVelocity(
  ipAddress: string,
  deviceId: string,
): Promise<{ accounts: number; disputes: number }> {
  const { rows } = await pool.query<{ accts: string; disputes: string }>(
    `SELECT COUNT(DISTINCT actor_id) AS accts, COUNT(DISTINCT transaction_id) AS disputes
     FROM transaction_ledger
     WHERE (ip_address = $1 OR device_id = $2)
       AND event_type = 'DISPUTE_OPENED'
       AND created_at >= NOW() - INTERVAL '24 hours'`,
    [ipAddress, deviceId],
  );
  return {
    accounts: parseInt(rows[0]?.accts ?? "0", 10),
    disputes: parseInt(rows[0]?.disputes ?? "0", 10),
  };
}

// ── Query C: Trust / account age ──
export async function queryTrustAndAge(
  userId: string,
): Promise<{ trustScore: number; isFrozen: boolean; ageHours: number }> {
  const { rows } = await pool.query<{
    trust_score: string;
    is_frozen: boolean;
    age_hours: string;
  }>(
    `SELECT trust_score, is_frozen,
            EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS age_hours
     FROM users WHERE user_id = $1`,
    [userId],
  );

  const row = rows[0];
  if (!row) {
    return { trustScore: 50, isFrozen: false, ageHours: 999 };
  }

  return {
    trustScore: parseFloat(row.trust_score ?? "50"),
    isFrozen: row.is_frozen ?? false,
    ageHours: parseFloat(row.age_hours ?? "999"),
  };
}

/**
 * Run the cascading rule engine (13-Disputes-and-AI-Triage.md §3).
 *
 * Rules are evaluated in order. The FIRST matching rule wins.
 * Rules 1 and 2 bypass AI entirely (FRAUD_LOCKOUT).
 * Rule 3 routes to UNDER_HUMAN_REVIEW.
 * Rule 4 passes to AI (Step 2 — Phase 5).
 */
export async function runHeuristics(p: {
  transactionId: string;
  userId: string;
  sha256Hash: string;
  ipAddress: string;
  deviceId: string;
}): Promise<HeuristicResult> {
  // Rule 1: Recycled media
  const isRecycled = await queryRecycledEvidence(p.sha256Hash, p.transactionId);
  if (isRecycled) {
    logger.warn(
      { transactionId: p.transactionId, sha256: p.sha256Hash },
      "Heuristic Rule 1 triggered: recycled evidence",
    );
    return {
      ruleTriggered: "RECYCLED_MEDIA",
      details: { recycled: true, trustPenalty: TRUST_PENALTY_RECYCLED },
    };
  }

  // Rule 2: Sybil velocity
  const sybil = await querySybilVelocity(p.ipAddress, p.deviceId);
  if (sybil.accounts > SYBIL_ACCOUNT_THRESHOLD || sybil.disputes > SYBIL_DISPUTE_THRESHOLD) {
    logger.warn(
      { transactionId: p.transactionId, accounts: sybil.accounts, disputes: sybil.disputes },
      "Heuristic Rule 2 triggered: Sybil velocity",
    );
    return {
      ruleTriggered: "SYBIL_VELOCITY",
      details: { accounts: sybil.accounts, disputes: sybil.disputes },
    };
  }

  // Rule 3: Burner account
  const trust = await queryTrustAndAge(p.userId);
  if (trust.ageHours < BURNER_ACCOUNT_AGE_HOURS && trust.trustScore < BURNER_TRUST_THRESHOLD) {
    logger.warn(
      { transactionId: p.transactionId, ageHours: trust.ageHours, trustScore: trust.trustScore },
      "Heuristic Rule 3 triggered: burner account",
    );
    return {
      ruleTriggered: "BURNER_ACCOUNT",
      details: { ageHours: trust.ageHours, trustScore: trust.trustScore },
    };
  }

  // Rule 4: Pass — proceed to AI
  return { ruleTriggered: null, details: { passed: true } };
}

/**
 * Apply trust score penalty (Rule 1).
 * trust_score is stored as NUMERIC in DB; update atomically.
 */
export async function applyTrustPenalty(
  userId: string,
  penalty: number,
): Promise<void> {
  await pool.query(
    `UPDATE users SET trust_score = GREATEST(0, trust_score - $1) WHERE user_id = $2`,
    [penalty, userId],
  );
}

/**
 * Freeze a device (set all users with that device as frozen).
 */
export async function freezeDevice(deviceId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET is_frozen = true WHERE user_id IN
       (SELECT DISTINCT actor_id FROM transaction_ledger WHERE device_id = $1)`,
    [deviceId],
  );
}
