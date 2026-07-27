import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pool module
const { mockQuery, mockRelease } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRelease: vi.fn(),
}));
vi.mock("../db/pool.js", () => ({
  pool: {
    connect: vi.fn().mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    }),
  },
}));

// Mock alerting
vi.mock("../services/alerting.js", () => ({
  alertReconciliationAnomaly: vi.fn(),
}));

import { runReconciliation } from "./reconciliation.js";
import { alertReconciliationAnomaly } from "../services/alerting.js";

describe("runReconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: clean reconciliation (no anomalies)
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("event_type") && sql.includes("SUM"))
        return { rows: [] };
      if (sql.includes("custody_accounts"))
        return { rows: [] };
      if (sql.includes("GROUP BY current_status"))
        return { rows: [] };
      if (sql.includes("dispute_cases dc"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("FUNDS_DEPOSITED") && sql.includes("NOT EXISTS"))
        return { rows: [{ cnt: "0" }] };
      return {};
    });
  });

  it("returns a result with timestamp and empty anomalies when clean", async () => {
    const result = await runReconciliation();
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.anomalies).toEqual([]);
  });

  it("calculates ledger summary correctly", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("event_type") && sql.includes("SUM"))
        return {
          rows: [
            { event_type: "FUNDS_DEPOSITED", total: "1000.00" },
            { event_type: "FUNDS_RELEASED", total: "400.00" },
            { event_type: "REFUND_ISSUED", total: "100.00" },
          ],
        };
      if (sql.includes("custody_accounts"))
        return { rows: [{ provider: "sandbox", currency: "GHS", balance: "500.00" }] };
      if (sql.includes("GROUP BY current_status"))
        return { rows: [{ current_status: "FUNDS_SECURED", cnt: "3" }] };
      if (sql.includes("dispute_cases dc"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("FUNDS_DEPOSITED") && sql.includes("NOT EXISTS"))
        return { rows: [{ cnt: "0" }] };
      return {};
    });

    const result = await runReconciliation();
    expect(result.ledgerSummary.totalDeposited).toBe("1000.00");
    expect(result.ledgerSummary.totalReleased).toBe("400.00");
    expect(result.ledgerSummary.totalRefunded).toBe("100.00");
    expect(result.ledgerSummary.netHeld).toBe("500.00");
  });

  it("detects ledger vs custody discrepancy", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("event_type") && sql.includes("SUM"))
        return { rows: [{ event_type: "FUNDS_DEPOSITED", total: "1000.00" }] };
      if (sql.includes("custody_accounts"))
        return { rows: [{ provider: "sandbox", currency: "GHS", balance: "800.00" }] };
      if (sql.includes("GROUP BY current_status"))
        return { rows: [] };
      if (sql.includes("dispute_cases dc"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("FUNDS_DEPOSITED") && sql.includes("NOT EXISTS"))
        return { rows: [{ cnt: "0" }] };
      return {};
    });

    const result = await runReconciliation();
    expect(result.anomalies.length).toBeGreaterThan(0);
    expect(result.anomalies[0]).toContain("differs from custody balance");
    expect(alertReconciliationAnomaly).toHaveBeenCalledOnce();
  });

  it("detects orphaned dispute cases", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("event_type") && sql.includes("SUM"))
        return { rows: [] };
      if (sql.includes("custody_accounts"))
        return { rows: [] };
      if (sql.includes("GROUP BY current_status"))
        return { rows: [] };
      if (sql.includes("dispute_cases dc"))
        return { rows: [{ cnt: "2" }] };
      if (sql.includes("FUNDS_DEPOSITED") && sql.includes("NOT EXISTS"))
        return { rows: [{ cnt: "0" }] };
      return {};
    });

    const result = await runReconciliation();
    expect(result.anomalies.some((a) => a.includes("dispute cases reference non-existent"))).toBe(true);
  });

  it("rolls back on error", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN") return {};
      if (sql === "ROLLBACK") return {};
      throw new Error("DB error");
    });

    await expect(runReconciliation()).rejects.toThrow("DB error");
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("always releases the client", async () => {
    await runReconciliation();
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("never UPDATEs or DELETEs from transaction_ledger (AUD-01)", async () => {
    const queries: string[] = [];
    mockQuery.mockImplementation(async (sql: string) => {
      queries.push(sql);
      if (sql === "BEGIN" || sql === "COMMIT") return {};
      if (sql.includes("SUM")) return { rows: [] };
      if (sql.includes("custody")) return { rows: [] };
      if (sql.includes("GROUP BY")) return { rows: [] };
      if (sql.includes("COUNT")) return { rows: [{ cnt: "0" }] };
      return {};
    });

    await runReconciliation();
    for (const q of queries) {
      const upper = q.toUpperCase();
      expect(upper).not.toMatch(/\bUPDATE\b.*\bTRANSACTION_LEDGER\b/);
      expect(upper).not.toMatch(/\bDELETE\b.*\bTRANSACTION_LEDGER\b/);
    }
  });

  it("includes state summary in result", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("event_type") && sql.includes("SUM"))
        return { rows: [] };
      if (sql.includes("custody_accounts"))
        return { rows: [] };
      if (sql.includes("GROUP BY current_status"))
        return {
          rows: [
            { current_status: "FUNDS_SECURED", cnt: "5" },
            { current_status: "SHIPPED", cnt: "2" },
          ],
        };
      if (sql.includes("dispute_cases dc"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("FUNDS_DEPOSITED") && sql.includes("NOT EXISTS"))
        return { rows: [{ cnt: "0" }] };
      return {};
    });

    const result = await runReconciliation();
    expect(result.stateSummary).toEqual({
      FUNDS_SECURED: 5,
      SHIPPED: 2,
    });
  });
});
