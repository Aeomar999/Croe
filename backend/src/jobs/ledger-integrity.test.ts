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
  alertLedgerIntegrityFailure: vi.fn(),
}));

import { runLedgerIntegrityCheck } from "./ledger-integrity.js";
import { alertLedgerIntegrityFailure } from "../services/alerting.js";

describe("runLedgerIntegrityCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: clean check
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("information_schema.columns"))
        return { rows: [{ has_checksum: true }] };
      if (sql.includes("COUNT(*)") && sql.includes("FROM transaction_ledger") && !sql.includes("checksum") && !sql.includes("NOT EXISTS") && !sql.includes("HAVING"))
        return { rows: [{ cnt: "100" }] };
      if (sql.includes("checksum IS NULL"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("ORDER BY created_at DESC"))
        return { rows: [] };
      if (sql.includes("NOW() + INTERVAL"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("NOT EXISTS") && sql.includes("escrow_transactions"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("HAVING COUNT(*) > 1"))
        return { rows: [] };
      return {};
    });
  });

  it("returns clean result with no anomalies", async () => {
    const result = await runLedgerIntegrityCheck();
    expect(result.anomalies).toEqual([]);
    expect(result.totalEntries).toBe(100);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("detects missing checksums", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("information_schema.columns"))
        return { rows: [{ has_checksum: true }] };
      if (sql.includes("COUNT(*)") && sql.includes("FROM transaction_ledger") && !sql.includes("checksum IS NULL") && !sql.includes("NOT EXISTS") && !sql.includes("HAVING"))
        return { rows: [{ cnt: "50" }] };
      if (sql.includes("checksum IS NULL"))
        return { rows: [{ cnt: "3" }] };
      if (sql.includes("ORDER BY created_at DESC"))
        return { rows: [] };
      if (sql.includes("NOW() + INTERVAL"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("NOT EXISTS") && sql.includes("escrow_transactions"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("HAVING COUNT(*) > 1"))
        return { rows: [] };
      return {};
    });

    const result = await runLedgerIntegrityCheck();
    expect(result.anomalies.some((a) => a.includes("missing checksum"))).toBe(true);
  });

  it("detects orphaned ledger entries", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("information_schema.columns"))
        return { rows: [{ has_checksum: true }] };
      if (sql.includes("COUNT(*)") && sql.includes("FROM transaction_ledger") && !sql.includes("checksum IS NULL") && !sql.includes("NOT EXISTS") && !sql.includes("HAVING"))
        return { rows: [{ cnt: "100" }] };
      if (sql.includes("checksum IS NULL"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("ORDER BY created_at DESC"))
        return { rows: [] };
      if (sql.includes("NOW() + INTERVAL"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("NOT EXISTS") && sql.includes("escrow_transactions"))
        return { rows: [{ cnt: "5" }] };
      if (sql.includes("HAVING COUNT(*) > 1"))
        return { rows: [] };
      return {};
    });

    const result = await runLedgerIntegrityCheck();
    expect(result.anomalies.some((a) => a.includes("non-existent transactions"))).toBe(true);
  });

  it("detects double-spend attempts", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("information_schema.columns"))
        return { rows: [{ has_checksum: true }] };
      if (sql.includes("COUNT(*)") && sql.includes("FROM transaction_ledger") && !sql.includes("checksum IS NULL") && !sql.includes("NOT EXISTS") && !sql.includes("HAVING"))
        return { rows: [{ cnt: "100" }] };
      if (sql.includes("checksum IS NULL"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("ORDER BY created_at DESC"))
        return { rows: [] };
      if (sql.includes("NOW() + INTERVAL"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("NOT EXISTS") && sql.includes("escrow_transactions"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("HAVING COUNT(*) > 1"))
        return { rows: [{ transaction_id: "tx-abc", cnt: "2" }] };
      return {};
    });

    const result = await runLedgerIntegrityCheck();
    expect(result.anomalies.some((a) => a.includes("double-spend"))).toBe(true);
    expect(result.anomalies.some((a) => a.includes("tx-abc"))).toBe(true);
  });

  it("fires alert when anomalies found", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("information_schema.columns"))
        return { rows: [{ has_checksum: true }] };
      if (sql.includes("COUNT(*)") && sql.includes("FROM transaction_ledger") && !sql.includes("checksum IS NULL") && !sql.includes("NOT EXISTS") && !sql.includes("HAVING"))
        return { rows: [{ cnt: "100" }] };
      if (sql.includes("checksum IS NULL"))
        return { rows: [{ cnt: "1" }] };
      if (sql.includes("ORDER BY created_at DESC"))
        return { rows: [] };
      if (sql.includes("NOW() + INTERVAL"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("NOT EXISTS") && sql.includes("escrow_transactions"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("HAVING COUNT(*) > 1"))
        return { rows: [] };
      return {};
    });

    await runLedgerIntegrityCheck();
    expect(alertLedgerIntegrityFailure).toHaveBeenCalledOnce();
  });

  it("skips checksum verification when the checksum column is absent", async () => {
    const queries: string[] = [];
    mockQuery.mockImplementation(async (sql: string) => {
      queries.push(sql);
      if (sql === "BEGIN" || sql === "COMMIT") return {};
      if (sql.includes("information_schema.columns"))
        return { rows: [{ has_checksum: false }] };
      if (sql.includes("COUNT(*)") && sql.includes("FROM transaction_ledger") && !sql.includes("NOW() + INTERVAL") && !sql.includes("NOT EXISTS") && !sql.includes("HAVING"))
        return { rows: [{ cnt: "100" }] };
      if (sql.includes("NOW() + INTERVAL"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("NOT EXISTS") && sql.includes("escrow_transactions"))
        return { rows: [{ cnt: "0" }] };
      if (sql.includes("HAVING COUNT(*) > 1"))
        return { rows: [] };
      return {};
    });

    const result = await runLedgerIntegrityCheck();
    expect(result.anomalies).toEqual([]);
    expect(result.checksumVerified).toBe(0);
    expect(queries.some((q) => q.includes("checksum IS") || q.includes(", checksum"))).toBe(false);
    expect(queries.some((q) => q.includes("information_schema.columns"))).toBe(true);
  });

  it("rolls back on error", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN") return {};
      if (sql === "ROLLBACK") return {};
      throw new Error("DB error");
    });

    await expect(runLedgerIntegrityCheck()).rejects.toThrow("DB error");
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("always releases the client", async () => {
    await runLedgerIntegrityCheck();
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("never UPDATEs or DELETEs transaction_ledger (AUD-01)", async () => {
    const queries: string[] = [];
    mockQuery.mockImplementation(async (sql: string) => {
      queries.push(sql);
      if (sql === "BEGIN" || sql === "COMMIT") return {};
      if (sql.includes("COUNT(*)")) return { rows: [{ cnt: "0" }] };
      if (sql.includes("ORDER BY")) return { rows: [] };
      return {};
    });

    await runLedgerIntegrityCheck();
    for (const q of queries) {
      const upper = q.toUpperCase();
      expect(upper).not.toMatch(/\bUPDATE\b.*\bTRANSACTION_LEDGER\b/);
      expect(upper).not.toMatch(/\bDELETE\b.*\bTRANSACTION_LEDGER\b/);
    }
  });
});
