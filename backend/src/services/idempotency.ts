import { createHash } from "node:crypto";
import { pool } from "../db/pool.js";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface StoredResponse {
  status: number;
  body: unknown;
}

interface StoredRow {
  response_status: number;
  response_body: {
    _requestHash: string;
    _responseBody: unknown;
  };
  method: string;
  path: string;
  user_id: string | null;
  expires_at: string;
}

export function hashRequestBody(body: unknown): string {
  const raw = body === undefined ? "" : JSON.stringify(body);
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Check if an idempotency key already exists for this method+path.
 * - Returns null → first request, proceed normally.
 * - Returns StoredResponse → replay, return immediately.
 * - Throws {status:409} → same key, different body → conflict.
 */
export async function checkIdempotencyKey(
  key: string,
  method: string,
  path: string,
  userId: string | null,
  bodyHash: string,
): Promise<StoredResponse | null> {
  const { rows } = await pool.query<StoredRow>(
    `SELECT response_status, response_body, method, path, user_id, expires_at
     FROM idempotency_keys
     WHERE idempotency_key = $1`,
    [key],
  );

  if (rows.length === 0) return null;

  const row = rows[0];

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await pool.query("DELETE FROM idempotency_keys WHERE idempotency_key = $1", [key]);
    return null;
  }

  if (row.method !== method || row.path !== path) {
    throw { status: 409, code: "IDEMPOTENCY_KEY_CONFLICT" };
  }

  if (row.user_id !== userId) {
    throw { status: 409, code: "IDEMPOTENCY_KEY_CONFLICT" };
  }

  const storedHash = row.response_body?._requestHash as string | undefined;
  if (storedHash && storedHash !== bodyHash) {
    throw { status: 409, code: "IDEMPOTENCY_KEY_CONFLICT" };
  }

  return {
    status: row.response_status,
    body: row.response_body?._responseBody,
  };
}

/**
 * Store a response for future replay.
 * ON CONFLICT does nothing — safe duplicate under concurrent identical requests.
 */
export async function storeIdempotencyResponse(
  key: string,
  method: string,
  path: string,
  userId: string | null,
  bodyHash: string,
  statusCode: number,
  responseBody: unknown,
): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  await pool.query(
    `INSERT INTO idempotency_keys (idempotency_key, user_id, method, path, response_status, response_body, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [key, userId, method, path, statusCode, { _requestHash: bodyHash, _responseBody: responseBody }, expiresAt.toISOString()],
  );
}

/**
 * Purge expired idempotency keys. Run periodically.
 */
export async function purgeExpiredIdempotencyKeys(): Promise<number> {
  const { rowCount } = await pool.query(
    "DELETE FROM idempotency_keys WHERE expires_at < NOW()",
  );
  return rowCount ?? 0;
}
