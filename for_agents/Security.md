# Social Commerce Escrow Platform — Comprehensive Security Architecture & Threat Model (Security.md)

## 1. Threat Matrix (STRIDE Analysis)

| Threat Category | Specific Attack Vector in Social Escrow | Architectural Mitigation & Defense Layer |
| :--- | :--- | :--- |
| **Spoofing** | Attacker forged MoMo callback payload claiming a fake 10,000 GHS deposit. | **HMAC-SHA256 verification** over unparsed `req.rawBody` buffer + constant-time buffer comparison (`crypto.timingSafeEqual`). |
| **Tampering** | User reuses an old photo of a broken phone screen across multiple disputes. | **SHA-256 On-The-Fly Hash Check** (`idx_evidence_sha256`) rejects any file previously hashed in a different transaction ID. |
| **Repudiation** | User claims their account was hacked to authorize a delivery release or dispute. | **Immutable Forensic Ledger** captures hardware ID (`X-Device-Fingerprint`), network type, and IP address (`INET`) per state change. |
| **Information Disclosure** | Leakage of customer chat logs or financial records via external AI APIs. | **Self-Hosted Open-Weights LLM** (Gemma 4 locally deployed) ensures sensitive data never traverses third-party cloud APIs. |
| **Denial of Service** | Webhook flooding / Sybil attacks creating hundreds of burner disputes. | **Sub-Second SQL Sybil Velocity Check** counting distinct accounts/disputes per IP/Device in 24 hours + Redis rate limits. |
| **Elevation of Privilege** | Prompt injection inside buyer claims attempting to override AI instructions. | **Deterministic Pre-Filtering**: SQL heuristics run first; system prompt enforces schema lock and isolates input fields. |

---

## 2. Webhook Cryptographic Verification Middleware (`verifyMoMoWebhook.ts`)

```typescript
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const MOMO_SECRET_KEY = process.env.MOMO_WEBHOOK_SECRET || 'fallback_secret_key';

export function verifyMoMoWebhook(req: Request, res: Response, next: NextFunction) {
  const signatureHeader = req.headers['x-momo-signature'] as string;
  const timestampHeader = req.headers['x-momo-timestamp'] as string;

  if (!signatureHeader || !timestampHeader) {
    return res.status(401).json({ error: 'Missing security headers' });
  }

  // 1. Prevent Replay Attacks (Max 300 seconds / 5 minutes window)
  const webhookTime = parseInt(timestampHeader, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - webhookTime) > 300) {
    return res.status(401).json({ error: 'Webhook timestamp expired (Replay attack defended)' });
  }

  // 2. Compute HMAC over raw unparsed buffer to prevent whitespace modification drift
  const rawBody = (req as any).rawBody;
  const stringToSign = `${timestampHeader}.${rawBody.toString('utf8')}`;

  const computedHash = crypto
    .createHmac('sha256', MOMO_SECRET_KEY)
    .update(stringToSign)
    .digest('hex');

  // 3. Prevent Timing Attacks using constant-time buffer comparison
  const expectedBuffer = Buffer.from(signatureHeader, 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');

  if (
    expectedBuffer.length !== computedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, computedBuffer)
  ) {
    console.error('CRITICAL SECURITY: Webhook HMAC signature mismatch detected.');
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  next();
}
```

---

## 3. Double-Spend & Concurrency Defense Service (`processDepositWebhook.ts`)

```typescript
import { Pool, PoolClient } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });

export async function processDepositWebhook(
  transactionId: string,
  actorId: string | null
): Promise<{ success: boolean; message: string }> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Pessimistic Row Lock via Primary Key Index Scan
    const lockQuery = `
      SELECT current_status 
      FROM escrow_transactions 
      WHERE transaction_id = $1 
      FOR UPDATE;
    `;
    const lockResult = await client.query(lockQuery, [transactionId]);

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Transaction record not found.' };
    }

    const currentStatus = lockResult.rows[0].current_status;
    if (currentStatus === 'FUNDS_SECURED') {
      await client.query('ROLLBACK');
      return { success: true, message: 'Deposit already processed by concurrent thread. Skipping safely.' };
    }

    // 2. Append event to transaction_ledger (Enforced by Partial Unique Index)
    const ledgerQuery = `
      INSERT INTO transaction_ledger (transaction_id, actor_id, event_type, previous_status, new_status)
      VALUES ($1, $2, 'FUNDS_DEPOSITED', $3, 'FUNDS_SECURED');
    `;
    await client.query(ledgerQuery, [transactionId, actorId, currentStatus]);

    // 3. Update cached parent status
    await client.query(
      `UPDATE escrow_transactions SET current_status = 'FUNDS_SECURED', updated_at = NOW() WHERE transaction_id = $1`,
      [transactionId]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Escrow funds secured successfully.' };
  } catch (error: any) {
    await client.query('ROLLBACK');
    // Trap PostgreSQL Error 23505 thrown by idx_single_deposit_per_transaction
    if (error.code === '23505') {
      return { success: true, message: 'Unique index constraint defended against duplicate deposit event.' };
    }
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 4. Deterministic SQL Heuristic Security Checks

```sql
-- Query A: SHA-256 Zero-Day Recycled Evidence Detector
-- Parameters: $1 = Uploaded SHA-256 Hash, $2 = Current Transaction ID
SELECT EXISTS (
    SELECT 1 
    FROM evidence_artifacts 
    WHERE sha256_hash = $1 
      AND transaction_id != $2
);

-- Query B: Sybil Device/IP Velocity Trap (24-Hour Window)
-- Parameters: $1 = Actor IP Address, $2 = Actor Device Fingerprint
SELECT 
    COUNT(DISTINCT actor_id) AS distinct_accounts_used,
    COUNT(DISTINCT transaction_id) AS disputes_initiated
FROM transaction_ledger
WHERE (ip_address = $1 OR device_id = $2)
  AND event_type = 'DISPUTE_OPENED'
  AND created_at >= NOW() - INTERVAL '24 hours';

-- Query C: Account Standing & Burner Profiler
-- Parameters: $1 = Actor User ID
SELECT 
    trust_score,
    is_frozen,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS account_age_hours
FROM users
WHERE user_id = $1;
```

---

## 5. AI Prompt Injection Hardening
1. **Never Concatenate Raw User Claims into Prompt Instructions**: Place buyer claims inside strict JSON input envelopes (`"buyer_claim": "..."`).
2. **Deterministic Pre-Screening**: Any dispute failing SQL Heuristics A, B, or C is rejected or locked before AI evaluation.
3. **Structured Schema Output Enforcement**: Require valid JSON with numeric `confidence_score` float bounds (`0.000` to `1.000`). Discard any response failing schema validation.
