import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pool module
const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));
vi.mock("../db/pool.js", () => ({
  pool: { query: mockQuery },
}));

import { SandboxCustodyProvider, SandboxPaymentRail } from "./sandbox.js";

describe("SandboxCustodyProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getBalance always returns zero for any currency (P0 sandbox)", async () => {
    const provider = new SandboxCustodyProvider();
    expect(await provider.getBalance("GHS")).toEqual({ amount: "0.00", currency: "GHS" });
    expect(await provider.getBalance("NGN")).toEqual({ amount: "0.00", currency: "NGN" });
  });

  it("reconcile matches sub-ledger to pooled journal deltas when they align", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM escrow_transactions"))
        return { rows: [{ net_amount: "200.00", currency: "GHS" }] };
      if (sql.includes("FROM transaction_ledger"))
        return { rows: [{ pooled: "200.00", currency: "GHS" }] };
      return { rows: [] };
    });

    const report = await new SandboxCustodyProvider().reconcile({
      from: "2026-01-01",
      to: "2026-01-02",
    });
    expect(report.matched).toBe(true);
    expect(report.pooled.amount).toBe("200.00");
    expect(report.subLedgerSum.amount).toBe("200.00");
    expect(report.discrepancies).toEqual([]);
  });

  it("reconcile flags a discrepancy when pooled differs from sub-ledger", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM escrow_transactions"))
        return { rows: [{ net_amount: "200.00", currency: "GHS" }] };
      if (sql.includes("FROM transaction_ledger"))
        return { rows: [{ pooled: "150.00", currency: "GHS" }] };
      return { rows: [] };
    });

    const report = await new SandboxCustodyProvider().reconcile({
      from: "2026-01-01",
      to: "2026-01-02",
    });
    expect(report.matched).toBe(false);
    expect(report.discrepancies).toHaveLength(1);
  });

  it("never emits a query referencing the nonexistent balance or metadata columns (AUD/schema)", async () => {
    const queries: string[] = [];
    mockQuery.mockImplementation(async (sql: string) => {
      queries.push(sql);
      return { rows: [] };
    });

    await new SandboxCustodyProvider().reconcile({ from: "2026-01-01", to: "2026-01-02" });
    for (const q of queries) {
      expect(q).not.toMatch(/\bbalance\b/);
      expect(q).not.toContain("metadata->");
    }
  });
});

describe("SandboxPaymentRail", () => {
  it("verifyWebhook accepts anything in sandbox", () => {
    expect(new SandboxPaymentRail().verifyWebhook(Buffer.from("x"), {})).toBe(true);
  });

  it("parses a webhook into a rail-agnostic PAID event", () => {
    const parsed = new SandboxPaymentRail().parseWebhook({ amount: "45.00" });
    expect(parsed?.kind).toBe("DEPOSIT");
    expect(parsed.outcome).toBe("PAID");
    expect(parsed.amount.amount).toBe("45.00");
    expect(parsed.amount.currency).toBe("GHS");
  });

  it("maps a sandbox FAILED status to a FAILED deposit (task.md T6.3)", () => {
    const parsed = new SandboxPaymentRail().parseWebhook({ providerRef: "r1", transactionId: "t1", status: "FAILED" });
    expect(parsed?.kind).toBe("DEPOSIT");
    expect(parsed?.outcome).toBe("FAILED");
  });
});
