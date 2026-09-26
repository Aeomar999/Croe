import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock all job modules
vi.mock("./reconciliation.js", () => ({
  runReconciliation: vi.fn().mockResolvedValue({ anomalies: [] }),
}));
vi.mock("./ledger-integrity.js", () => ({
  runLedgerIntegrityCheck: vi.fn().mockResolvedValue({ totalEntries: 0, anomalies: [] }),
}));
vi.mock("./retention.js", () => ({
  runRetentionPurge: vi.fn().mockResolvedValue({ deleted: { notifications: 0, sessions: 0 }, skipped: 0 }),
}));
vi.mock("./webhook-sweeper.js", () => ({
  runWebhookSweeper: vi.fn().mockResolvedValue({ skipped: false, processed: 0, failed: 0, stale: 0 }),
}));

import { startScheduler, stopScheduler, getSchedulerStatus } from "./scheduler.js";
import { runReconciliation } from "./reconciliation.js";
import { runLedgerIntegrityCheck } from "./ledger-integrity.js";
import { runRetentionPurge } from "./retention.js";
import { runWebhookSweeper } from "./webhook-sweeper.js";

describe("scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopScheduler();
    vi.useRealTimers();
  });

  describe("startScheduler", () => {
    it("runs all jobs immediately on start", async () => {
      startScheduler();
      // Wait for the initial async job calls to resolve
      await vi.advanceTimersByTimeAsync(0);
      expect(runReconciliation).toHaveBeenCalledOnce();
      expect(runLedgerIntegrityCheck).toHaveBeenCalledOnce();
      expect(runRetentionPurge).toHaveBeenCalledOnce();
      expect(runWebhookSweeper).toHaveBeenCalledOnce();
    });

    it("runs the webhook sweeper every minute (task.md T6.2)", async () => {
      startScheduler();
      await vi.advanceTimersByTimeAsync(0);
      vi.clearAllMocks();
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
      expect(runWebhookSweeper).toHaveBeenCalledTimes(3);
    });

    it("runs jobs on interval", async () => {
      startScheduler();
      await vi.advanceTimersByTimeAsync(0);
      vi.clearAllMocks();

      // Advance 15 minutes (reconciliation interval)
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(runReconciliation).toHaveBeenCalledOnce();
      // ledger-integrity (1 hour) and retention (24 hours) should not have run
      expect(runLedgerIntegrityCheck).not.toHaveBeenCalled();
      expect(runRetentionPurge).not.toHaveBeenCalled();
    });
  });

  describe("stopScheduler", () => {
    it("stops all intervals", async () => {
      startScheduler();
      await vi.advanceTimersByTimeAsync(0);
      vi.clearAllMocks();

      stopScheduler();

      // Advance past all intervals
      await vi.advanceTimersByTimeAsync(25 * 60 * 60 * 1000);
      expect(runReconciliation).not.toHaveBeenCalled();
      expect(runLedgerIntegrityCheck).not.toHaveBeenCalled();
      expect(runRetentionPurge).not.toHaveBeenCalled();
    });

    it("is safe to call multiple times", () => {
      startScheduler();
      stopScheduler();
      stopScheduler(); // should not throw
    });
  });

  describe("getSchedulerStatus", () => {
    it("returns status for all 4 jobs", () => {
      const status = getSchedulerStatus();
      expect(status).toHaveLength(4);
      expect(status.map((j) => j.name)).toEqual([
        "reconciliation",
        "ledger-integrity",
        "retention",
        "webhook-sweeper",
      ]);
    });

    it("includes intervalMs for each job", () => {
      const status = getSchedulerStatus();
      expect(status[0].intervalMs).toBe(15 * 60 * 1000);
      expect(status[1].intervalMs).toBe(60 * 60 * 1000);
      expect(status[2].intervalMs).toBe(24 * 60 * 60 * 1000);
      expect(status[3].intervalMs).toBe(60 * 1000);
    });

    it("updates lastRun after job execution", async () => {
      startScheduler();
      await vi.advanceTimersByTimeAsync(0);
      const status = getSchedulerStatus();
      expect(status[0].lastRun).toBeDefined();
      expect(status[0].lastRun).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
