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

// Mock logger to avoid pino internal errors
vi.mock("../config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { runRetentionPurge } from "./retention.js";

describe("runRetentionPurge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: successful queries
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("DELETE FROM notifications")) return { rowCount: 5 };
      if (sql.includes("DELETE FROM messages")) return { rowCount: 3 };
      if (sql.includes("DELETE FROM sessions")) return { rowCount: 2 };
      if (sql.includes("COUNT")) return { rows: [{ cnt: "0" }] };
      return {};
    });
  });

  it("returns correct deletion counts", async () => {
    const result = await runRetentionPurge();
    expect(result.deleted.notifications).toBe(5);
    expect(result.deleted.messages).toBe(3);
    expect(result.deleted.sessions).toBe(2);
  });

  it("returns correct skipped count", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return {};
      if (sql.includes("DELETE FROM notifications")) return { rowCount: 0 };
      if (sql.includes("DELETE FROM messages")) return { rowCount: 0 };
      if (sql.includes("DELETE FROM sessions")) return { rowCount: 0 };
      if (sql.includes("COUNT")) return { rows: [{ cnt: "7" }] };
      return {};
    });

    const result = await runRetentionPurge();
    expect(result.skipped).toBe(7);
  });

  it("rolls back on error", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN") return {};
      if (sql === "ROLLBACK") return {};
      throw new Error("DB error");
    });

    await expect(runRetentionPurge()).rejects.toThrow("DB error");
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("always releases the client", async () => {
    await runRetentionPurge();
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("never touches transaction_ledger (AUD-01)", async () => {
    const queries: string[] = [];
    mockQuery.mockImplementation(async (sql: string) => {
      queries.push(sql);
      if (sql === "BEGIN" || sql === "COMMIT") return {};
      if (sql.includes("DELETE")) return { rowCount: 0 };
      if (sql.includes("COUNT")) return { rows: [{ cnt: "0" }] };
      return {};
    });

    await runRetentionPurge();
    for (const q of queries) {
      expect(q.toLowerCase()).not.toContain("transaction_ledger");
    }
  });

  it("skips records tied to active disputes", async () => {
    const deleteQueries: string[] = [];
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT") return {};
      if (sql.includes("DELETE FROM")) {
        deleteQueries.push(sql);
        return { rowCount: 0 };
      }
      if (sql.includes("COUNT")) return { rows: [{ cnt: "0" }] };
      return {};
    });

    await runRetentionPurge();
    // DELETE queries for records that can be tied to disputes should include dispute exclusion logic
    // (sessions are not linked to transactions, so they don't need dispute exclusion)
    for (const q of deleteQueries) {
      if (q.includes("notifications") || q.includes("messages")) {
        expect(q).toContain("dispute_cases");
        expect(q).toContain("DISPUTE_OPENED");
      }
    }
  });

  it("has ISO timestamp in result", async () => {
    const result = await runRetentionPurge();
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
