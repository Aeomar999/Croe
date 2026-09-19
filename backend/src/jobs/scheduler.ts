/**
 * Job scheduler — lightweight interval-based runner for Phase 8 background jobs.
 * No external dependencies (cron library) per COST-01.
 *
 * Jobs:
 *   - reconciliation: every 15 minutes
 *   - ledger-integrity: every hour
 *   - retention: daily at 03:00 UTC
 */
import { logger } from "../config/logger.js";
import { runReconciliation } from "./reconciliation.js";
import { runLedgerIntegrityCheck } from "./ledger-integrity.js";
import { runRetentionPurge } from "./retention.js";

interface ScheduledJob {
  name: string;
  fn: () => Promise<unknown>;
  intervalMs: number;
  lastRun?: Date;
  timer?: ReturnType<typeof setInterval>;
}

const jobs: ScheduledJob[] = [
  {
    name: "reconciliation",
    fn: runReconciliation,
    intervalMs: 15 * 60 * 1000, // 15 minutes
  },
  {
    name: "ledger-integrity",
    fn: runLedgerIntegrityCheck,
    intervalMs: 60 * 60 * 1000, // 1 hour
  },
  {
    name: "retention",
    fn: runRetentionPurge,
    intervalMs: 24 * 60 * 60 * 1000, // 24 hours
  },
];

function runJob(job: ScheduledJob): void {
  const start = Date.now();
  job.fn()
    .then((result) => {
      job.lastRun = new Date();
      const durationMs = Date.now() - start;
      logger.info({ job: job.name, durationMs, result }, "Scheduled job completed");
    })
    .catch((err) => {
      logger.error({ job: job.name, err }, "Scheduled job failed");
    });
}

/**
 * Start all scheduled jobs.
 */
export function startScheduler(): void {
  for (const job of jobs) {
    // Run immediately on startup, then on interval
    runJob(job);
    job.timer = setInterval(() => runJob(job), job.intervalMs);
    logger.info({ job: job.name, intervalMs: job.intervalMs }, "Scheduler: job registered");
  }
}

/**
 * Stop all scheduled jobs (for graceful shutdown).
 */
export function stopScheduler(): void {
  for (const job of jobs) {
    if (job.timer) {
      clearInterval(job.timer);
      job.timer = undefined;
      logger.info({ job: job.name }, "Scheduler: job stopped");
    }
  }
}

/**
 * Get status of all scheduled jobs (for admin endpoint).
 */
export function getSchedulerStatus(): Array<{
  name: string;
  intervalMs: number;
  lastRun?: string;
}> {
  return jobs.map((job) => ({
    name: job.name,
    intervalMs: job.intervalMs,
    lastRun: job.lastRun?.toISOString(),
  }));
}
