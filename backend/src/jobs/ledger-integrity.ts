/**
 * Ledger integrity job — read-only scan of transaction_ledger
 * for missing checksums, out-of-order timestamps, and orphaned entries.
 *
 * 23-Observability-and-Reconciliation.md §1.
 * Rule: NEVER UPDATE/DELETE transaction_ledger (AUD-01) — report anomalies only.
 */
import { pool } from "../db/pool.js";
import { logger } from "../config/logger.js";
import { incrementLedgerIntegrityAnomaly } from "../services/metrics.js";
import { alertLedgerIntegrityFailure } from "../services/alerting.js";
import { createHash } from "node:crypto";

export interface IntegrityResult {
  timestamp: string;
  totalEntries: number;
  anomalies: string[];
  checksumVerified: number;
}

function computeEntryHash(entry: {
  transaction_id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  amount_delta: string | null;
  created_at: string;
}): string {
  const payload = [
    entry.transaction_id,
    entry.event_type,
    entry.previous_status ?? "",
    entry.new_status ?? "",
    entry.amount_delta ?? "",
    entry.created_at,
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export async function runLedgerIntegrityCheck(): Promise<IntegrityResult> {
  const anomalies: string[] = [];
  let checksumVerified = 0;
  let totalEntries = 0;

  logger.info("Starting ledger integrity check");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Count total entries ──
    const { rows: countRows } = await client.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM transaction_ledger`,
    );
    totalEntries = parseInt(countRows[0].cnt, 10);

    // ── 1b. Detect the optional checksum column (hash-chain is optional hardening) ──
    const { rows: colRows } = await client.query<{ has_checksum: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'transaction_ledger'
           AND column_name = 'checksum'
       ) AS has_checksum`,
    );
    const hasChecksum = colRows?.[0]?.has_checksum === true;

    if (!hasChecksum) {
      logger.info(
        "checksum column not present — skipping optional checksum verification (23-Observability-and-Reconciliation.md §6)",
      );
    }

    // ── 2. Check for missing checksums ──
    if (hasChecksum) {
      const { rows: missingChecksum } = await client.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM transaction_ledger WHERE checksum IS NULL`,
      );
      if (parseInt(missingChecksum[0].cnt, 10) > 0) {
        anomalies.push(`${missingChecksum[0].cnt} ledger entries missing checksum`);
      }
    }

    // ── 3. Verify checksums on a sample (last 1000 entries) ──
    if (hasChecksum) {
      const { rows: sampleEntries } = await client.query<{
        ledger_id: string;
        transaction_id: string;
        event_type: string;
        previous_status: string | null;
        new_status: string | null;
        amount_delta: string | null;
        created_at: string;
        checksum: string | null;
      }>(
        `SELECT ledger_id, transaction_id, event_type, previous_status,
                new_status, amount_delta, created_at::text, checksum
         FROM transaction_ledger
         ORDER BY created_at DESC
         LIMIT 1000`,
      );

      for (const entry of sampleEntries) {
        if (!entry.checksum) continue;

        const expected = computeEntryHash(entry);
        if (entry.checksum !== expected) {
          anomalies.push(
            `Checksum mismatch on ledger_id ${entry.ledger_id}: expected ${expected}, got ${entry.checksum}`,
          );
        } else {
          checksumVerified++;
        }
      }
    }

    // ── 4. Check for out-of-order timestamps (created_at > updated_at pattern) ──
    const checksumClause = hasChecksum ? "checksum IS NOT NULL AND " : "";
    const { rows: outOfOrder } = await client.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM transaction_ledger
       WHERE ${checksumClause}created_at > NOW() + INTERVAL '1 minute'`,
    );
    if (parseInt(outOfOrder[0].cnt, 10) > 0) {
      anomalies.push(`${outOfOrder[0].cnt} ledger entries with future timestamps`);
    }

    // ── 5. Orphaned entries (no matching transaction) ──
    const { rows: orphaned } = await client.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM transaction_ledger tl
       WHERE tl.transaction_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM escrow_transactions et
           WHERE et.transaction_id = tl.transaction_id
         )`,
    );
    if (parseInt(orphaned[0].cnt, 10) > 0) {
      anomalies.push(`${orphaned[0].cnt} ledger entries reference non-existent transactions`);
    }

    // ── 6. Double-spend check: same deposit amount on same transaction ──
    const { rows: doubleSpend } = await client.query<{ transaction_id: string; cnt: string }>(
      `SELECT transaction_id, COUNT(*)::text AS cnt
       FROM transaction_ledger
       WHERE event_type = 'FUNDS_DEPOSITED'
       GROUP BY transaction_id
       HAVING COUNT(*) > 1`,
    );
    for (const row of doubleSpend) {
      anomalies.push(
        `Possible double-spend: transaction ${row.transaction_id} has ${row.cnt} FUNDS_DEPOSITED entries`,
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Ledger integrity check failed");
    throw err;
  } finally {
    client.release();
  }

  if (anomalies.length > 0) {
    incrementLedgerIntegrityAnomaly();
    alertLedgerIntegrityFailure(anomalies.length);
    logger.warn({ anomalies }, "Ledger integrity check completed with anomalies");
  } else {
    logger.info("Ledger integrity check completed cleanly");
  }

  return {
    timestamp: new Date().toISOString(),
    totalEntries,
    anomalies,
    checksumVerified,
  };
}
