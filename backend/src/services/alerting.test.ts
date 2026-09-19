import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fireAlert,
  clearAlert,
  getActiveAlerts,
  alertReconciliationAnomaly,
  alertLedgerIntegrityFailure,
  alertHighErrorRate,
  alertDiskRetentionFailure,
} from "./alerting.js";

vi.mock("../config/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("./metrics.js", () => ({
  incrementAlertCounter: vi.fn(),
}));

describe("alerting service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    for (const alert of getActiveAlerts()) {
      clearAlert(alert.source);
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("fireAlert", () => {
    it("creates and stores an alert", () => {
      fireAlert("critical", "test-source", "Something broke");
      const alerts = getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].source).toBe("test-source");
      expect(alerts[0].severity).toBe("critical");
      expect(alerts[0].message).toBe("Something broke");
    });

    it("includes context when provided", () => {
      fireAlert("warning", "ctx-test", "msg", { foo: "bar" });
      const alerts = getActiveAlerts();
      expect(alerts[0].context).toEqual({ foo: "bar" });
    });

    it("includes ISO timestamp", () => {
      fireAlert("info", "ts-test", "msg");
      const alerts = getActiveAlerts();
      expect(alerts[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("deduplicates by source key", () => {
      fireAlert("warning", "dedup", "first");
      fireAlert("critical", "dedup", "second");
      const alerts = getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toBe("first");
    });

    it("auto-clears after 5 minutes", () => {
      fireAlert("info", "auto-clear", "ephemeral");
      expect(getActiveAlerts()).toHaveLength(1);

      vi.advanceTimersByTime(5 * 60 * 1000 - 1);
      expect(getActiveAlerts()).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(getActiveAlerts()).toHaveLength(0);
    });
  });

  describe("clearAlert", () => {
    it("removes an active alert", () => {
      fireAlert("warning", "to-clear", "msg");
      expect(getActiveAlerts()).toHaveLength(1);
      clearAlert("to-clear");
      expect(getActiveAlerts()).toHaveLength(0);
    });

    it("no-op for non-existent alert", () => {
      clearAlert("nonexistent");
      expect(getActiveAlerts()).toHaveLength(0);
    });
  });

  describe("convenience alerters", () => {
    it("alertReconciliationAnomaly fires critical alert with gap details", () => {
      alertReconciliationAnomaly(50.25, "GHS");
      const alerts = getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe("critical");
      expect(alerts[0].source).toBe("reconciliation_gap");
      expect(alerts[0].message).toContain("50.25");
      expect(alerts[0].message).toContain("GHS");
    });

    it("alertLedgerIntegrityFailure fires critical alert with count", () => {
      alertLedgerIntegrityFailure(3);
      const alerts = getActiveAlerts();
      expect(alerts[0].severity).toBe("critical");
      expect(alerts[0].source).toBe("ledger_integrity");
      expect(alerts[0].context).toEqual({ failureCount: 3 });
    });

    it("alertHighErrorRate fires warning alert with percentage", () => {
      alertHighErrorRate("/api/test", 0.15);
      const alerts = getActiveAlerts();
      expect(alerts[0].severity).toBe("warning");
      expect(alerts[0].source).toBe("error_rate:/api/test");
      expect(alerts[0].message).toContain("15.0%");
    });

    it("alertDiskRetentionFailure fires warning with count", () => {
      alertDiskRetentionFailure(10);
      const alerts = getActiveAlerts();
      expect(alerts[0].severity).toBe("warning");
      expect(alerts[0].source).toBe("retention_cleanup");
      expect(alerts[0].context).toEqual({ messageCount: 10 });
    });
  });
});
