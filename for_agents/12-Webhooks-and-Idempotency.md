# Croe — Webhooks & Idempotency (`12-Webhooks-and-Idempotency.md`)

> Tables: `webhook_inbox`, `idempotency_keys` ([`05-Data-Model.md`](05-Data-Model.md)). Implements the concurrency engine from [`04-Architecture.md`](04-Architecture.md) §6. Custody phase: P1+ (real webhooks); P0 uses sandbox webhooks.

## 1. Purpose & Boundaries

Safely ingest asynchronous MoMo callbacks and guarantee that duplicate/retried requests never double-process money. Two mechanisms: **inbound webhook security** (aggregator → Croe) and **client idempotency** (RN app → Croe).

## 2. Three Pillars of Webhook Security

1. **Spoofing → HMAC-SHA256** over the **raw unparsed body buffer** (not parsed JSON), using the aggregator's shared secret.
2. **Replay → timestamp window**: reject if `|now − x-momo-timestamp| > 300s`.
3. **Timing attacks → constant-time compare** (`crypto.timingSafeEqual`), after a length check.

### Middleware (reference)
```typescript
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Capture raw body for HMAC:
// app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

const SECRET = process.env.MOMO_WEBHOOK_SECRET!; // from secrets, never hard-coded

export function verifyMoMoWebhook(req: Request, res: Response, next: NextFunction) {
  const sig = req.headers['x-momo-signature'] as string;
  const ts  = req.headers['x-momo-timestamp'] as string;
  if (!sig || !ts) return res.status(401).json({ error: 'MISSING_SIGNATURE' });

  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(ts, 10)) > 300)
    return res.status(401).json({ error: 'REPLAY_WINDOW_EXPIRED' });

  const raw = (req as any).rawBody as Buffer;
  const expected = crypto.createHmac('sha256', SECRET).update(`${ts}.${raw.toString('utf8')}`).digest('hex');
  const a = Buffer.from(sig, 'hex'), b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return res.status(401).json({ error: 'INVALID_SIGNATURE' });

  next();
}
```

## 3. Fast-Response Rule

The handler must `res.status(200)` within **< 500 ms**, *before* heavy DB/AI work, then process asynchronously — otherwise the aggregator assumes failure and retries, amplifying load.

```typescript
app.post('/v1/webhooks/momo-callback', verifyMoMoWebhook, async (req, res) => {
  res.status(200).send('OK');                 // ack immediately
  await enqueueWebhook(req.body, req.headers); // durable inbox + background worker
});
```

## 4. Durable Idempotency (cross-restart)

Redis `SETNX` is the fast first gate; `webhook_inbox` is the durable backstop (survives restarts):

1. Fast gate: `SETNX idemp:<provider_ref>` (24h TTL). If `0` → already seen, short-circuit.
2. Durable gate: `INSERT INTO webhook_inbox (provider, provider_ref, ...) ON CONFLICT (provider, provider_ref) DO NOTHING`. If no row inserted → already processed.
3. Only a genuinely new event proceeds to the money transaction.

## 5. The Money Transaction (double-spend defense)

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const { rows } = await client.query(
    'SELECT current_status FROM escrow_transactions WHERE transaction_id=$1 FOR UPDATE', [txId]);
  if (rows.length === 0) { await client.query('ROLLBACK'); return; }
  if (rows[0].current_status === 'FUNDS_SECURED') { await client.query('ROLLBACK'); return; } // already done
  await client.query(
    `INSERT INTO transaction_ledger (transaction_id, actor_id, event_type, previous_status, new_status, amount_delta, currency)
     VALUES ($1, NULL, 'FUNDS_DEPOSITED', $2, 'FUNDS_SECURED', $3, $4)`,
    [txId, rows[0].current_status, amount, currency]);          // partial unique index enforces single deposit
  await client.query(
    `UPDATE escrow_transactions SET current_status='FUNDS_SECURED', updated_at=NOW() WHERE transaction_id=$1`, [txId]);
  await client.query('COMMIT');
} catch (e: any) {
  await client.query('ROLLBACK');
  if (e.code === '23505') return;  // partial unique index caught a duplicate deposit — safe
  throw e;
} finally { client.release(); }
```

## 6. Client Idempotency (`Idempotency-Key`)

- Every mutating endpoint (`POST`/`PUT`/`DELETE`) requires a client `Idempotency-Key` (UUIDv4).
- First request: process, store `{status, body}` in `idempotency_keys` (24h TTL).
- Replay with the same key: return the stored response without re-executing. Missing key on a mutating request → `400 IDEMPOTENCY_KEY_REQUIRED`.

## 7. Error & Edge Cases

| Case | Handling |
| :--- | :--- |
| Invalid HMAC | `401 INVALID_SIGNATURE`; log as possible spoof; do not process. |
| Expired timestamp | `401 REPLAY_WINDOW_EXPIRED`. |
| Duplicate webhook | Redis + `webhook_inbox` dedup + `23505` backstop → single effect. |
| Worker crash mid-process | `webhook_inbox.processed_at` stays NULL; a sweeper re-runs unprocessed rows idempotently. |
| Same key, different body | `409 IDEMPOTENCY_KEY_CONFLICT` (client bug). |

## 8. Acceptance Criteria

- HMAC is computed over the raw buffer; no parsed-JSON HMAC anywhere.
- Webhooks ACK `200` in < 500 ms before processing.
- 50 concurrent identical deposit webhooks → exactly one `FUNDS_DEPOSITED`, zero double-funding (tested in [`43`](24-Testing-Strategy.md)).
- Idempotency survives process restarts (durable inbox).
