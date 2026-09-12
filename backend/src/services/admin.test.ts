import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/pool.js", () => ({
  getTransactionClient: vi.fn(),
}));
vi.mock("../providers/index.js", () => ({
  custodyProvider: { getBalance: vi.fn() },
}));

import { getTransactionClient } from "../db/pool.js";
import { custodyProvider } from "../providers/index.js";
import { getReconciliationReport } from "./admin.js";

const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockGetTransactionClient = vi.mocked(getTransactionClient);
const mockGetBalance = vi.mocked(custodyProvider.getBalance);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTransactionClient.mockResolvedValue({ query: mockQuery, release: mockRelease } as never);
  mockGetBalance.mockResolvedValue({ amount: "0.00", currency: "GHS" });
});

describe("getReconciliationReport", () => {
  it("never emits a query referencing the nonexistent balance column on custody_accounts", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await getReconciliationReport("2026-09-01", "2026-09-12");

    for (const call of mockQuery.mock.calls) {
      const sql = String(call[0]);
      expect(sql.includes("balance")).toBe(false);
      expect(sql.includes("FROM custody_accounts")).toBe(
        sql.includes("SELECT DISTINCT provider, currency"),
      );
    }
  });

  it("returns zeroed summary and empty custody accounts when nothing exists", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const report = await getReconciliationReport("2026-09-01", "2026-09-12");

    expect(report.summary).toEqual({
      totalDeposited: "0.00",
      totalReleased: "0.00",
      totalRefunded: "0.00",
      netHeld: "0.00",
    });
    expect(report.custodyAccounts).toEqual([]);
    expect(mockGetBalance).not.toHaveBeenCalled();
  });

  it("computes net held from ledger and attaches custody provider balances per account", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { event_type: "FUNDS_DEPOSITED", total: "500.00" },
          { event_type: "FUNDS_RELEASED", total: "200.00" },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { provider: "sandbox", currency: "GHS" },
          { provider: "sandbox", currency: "NGN" },
        ],
      });
    mockGetBalance
      .mockResolvedValueOnce({ amount: "150.00", currency: "GHS" })
      .mockResolvedValueOnce({ amount: "0.00", currency: "NGN" });

    const report = await getReconciliationReport("2026-09-01", "2026-09-12");

    expect(report.summary.totalDeposited).toBe("500.00");
    expect(report.summary.totalReleased).toBe("200.00");
    expect(report.summary.totalRefunded).toBe("0.00");
    expect(report.summary.netHeld).toBe("300.00");
    expect(report.custodyAccounts).toEqual([
      { provider: "sandbox", currency: "GHS", balance: "150.00" },
      { provider: "sandbox", currency: "NGN", balance: "0.00" },
    ]);
    expect(mockGetBalance).toHaveBeenCalledTimes(2);
    expect(mockGetBalance).toHaveBeenCalledWith("GHS");
    expect(mockGetBalance).toHaveBeenCalledWith("NGN");
    expect(mockRelease).toHaveBeenCalled();
  });
});