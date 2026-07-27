/**
 * Scheduled reconciliation job — 3-way compare:
 *   ledger sub-sums vs custody provider balances vs transaction state.
 *
 * 23-Observability-and-Reconciliation.md §1.
 * Rule: never UPDATE/DELETE transaction_ledger — only read (AUD-01).
 */
import { pool } from "../db/pool.js";
import { logger } from "../config/logger.js";
import { recordReconciliationLatency, incrementReconciliationAnomaly } from "../services/metrics.js";
import { alertReconciliationAnomaly } from "../services/alerting.js";
import type { EscrowState } from "../types/domain.js";

export interface ReconciliationResult {
  timestamp: string;
  ledgerSummary: {
    totalDeposited: string;
    totalReleased: string;
    totalRefunded: string;
    netHeld: string;
  };
  stateSummary: Record<string, number>;
  anomalies: string[];
}

export async function runReconciliation(): Promise<ReconciliationResult> {
  const start = Date.now();
  const anomalies: string[] = [];
  let deposited = 0;
  let released = 0;
  let refunded = 0;
  let netHeld = 0;
  const stateSummary: Record<string, number> = {};

  logger.info("Starting reconciliation job");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Ledger sub-sums (read-only, no UPDATE/DELETE per AUD-01) ──
    const { rows: ledgerRows } = await client.query<{
      event_type: string;
      total: string;
    }>(
      `SELECT event_type, COALESCE(SUM(ABS(amount_delta)), 0)::text AS total
       FROM transaction_ledger
       WHERE event_type IN ('FUNDS_DEPOSITED', 'FUNDS_RELEASED', 'REFUND_ISSUED')
       GROUP BY event_type`,
    );

    const totals: Record<string, string> = {};
    for (const row of ledgerRows) {
      totals[row.event_type] = row.total;
    }

    deposited = parseFloat(totals["FUNDS_DEPOSITED"] ?? "0");
    released = parseFloat(totals["FUNDS_RELEASED"] ?? "0");
    refunded = parseFloat(totals["REFUND_ISSUED"] ?? "0");
    netHeld = deposited - released - refunded;

    // ── 2. Custody account balances ──
    const { rows: custodyRows } = await client.query<{
      provider: string;
      currency: string;
      balance: string;
    }>(`SELECT provider, currency, balance::text AS balance FROM custody_accounts`);

    let totalCustodyBalance = 0;
    for (const row of custodyRows) {
      totalCustodyBalance += parseFloat(row.balance);
    }

    // ── 3. Escrow state counts ──
    const { rows: stateRows } = await client.query<{
      current_status: EscrowState;
      cnt: string;
    }>(
      `SELECT current_status, COUNT(*)::text AS cnt
       FROM escrow_transactions
       GROUP BY current_status`,
    );

    for (const row of stateRows) {
      stateSummary[row.current_status] = parseInt(row.cnt, 10);
    }

    // ── 4. Cross-check: ledger vs custody ──
    if (Math.abs(netHeld - totalCustodyBalance) > 0.01) {
      const gap = netHeld - totalCustodyBalance;
      anomalies.push(
        `Ledger net held (${netHeld.toFixed(2)}) differs from custody balance (${totalCustodyBalance.toFixed(2)}) by ${gap.toFixed(2)}`,
      );
      incrementReconciliationAnomaly();
      alertReconciliationAnomaly(gap, "GHS");
    }

    // ── 5. Check for orphaned dispute cases ──
    const { rows: orphans } = await client.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM dispute_cases dc
       LEFT JOIN escrow_transactions et ON dc.transaction_id = et.transaction_id
       WHERE et.transaction_id IS NULL`,
    );

    if (parseInt(orphans[0]?.cnt ?? "0", 10) > 0) {
      anomalies.push(`${orphans[0].cnt} dispute cases reference non-existent transactions`);
      incrementReconciliationAnomaly();
    }

    // ── 6. Check for ledger entries without matching state transitions ──
    const { rows: staleEntries } = await client.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM transaction_ledger tl
       WHERE tl.event_type = 'FUNDS_DEPOSITED'
         AND NOT EXISTS (
           SELECT 1 FROM escrow_transactions et
           WHERE et.transaction_id = tl.transaction_id
             AND et.current_status IN ('FUNDS_SECURED', 'SHIPPED', 'DELIVERED_CONFIRMED', 'FUNDS_RELEASED', 'DISPUTE_OPENED', 'AI_PROCESSING', 'UNDER_HUMAN_REVIEW', 'RESOLVED_AUTO', 'FUNDS_REFUNDED', 'FRAUD_LOCKOUT')
         )`,
    );

    if (parseInt(staleEntries[0]?.cnt ?? "0", 10) > 0) {
      anomalies.push(`${staleEntries[0].cnt} deposited ledger entries with no matching active escrow`);
      incrementReconciliationAnomaly();
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Reconciliation job failed");
    throw err;
  } finally {
    client.release();
  }

  const durationMs = Date.now() - start;
  recordReconciliationLatency(durationMs);

  const result: ReconciliationResult = {
    timestamp: new Date().toISOString(),
    ledgerSummary: {
      totalDeposited: (deposited ?? 0).toFixed(2),
      totalReleased: (released ?? 0).toFixed(2),
      totalRefunded: (refunded ?? 0).toFixed(2),
      netHeld: (netHeld ?? 0).toFixed(2),
    },
    stateSummary: stateSummary ?? {},
    anomalies,
  };

  if (anomalies.length > 0) {
    logger.warn({ anomalies, durationMs }, "Reconciliation completed with anomalies");
  } else {
    logger.info({ durationMs }, "Reconciliation completed cleanly");
  }

  return result;
}
