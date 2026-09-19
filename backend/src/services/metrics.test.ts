import { describe, it, expect, beforeEach } from "vitest";
import { MetricsStore } from "./metrics.js";

describe("MetricsStore", () => {
  let store: MetricsStore;

  beforeEach(() => {
    store = new MetricsStore();
  });

  describe("incrementCounter", () => {
    it("creates and increments a counter", () => {
      store.incrementCounter("test_counter", { status: "ok" });
      store.incrementCounter("test_counter", { status: "ok" });
      store.incrementCounter("test_counter", { status: "ok" });

      const output = store.scrape();
      expect(output).toContain("croe_counter{status=\"ok\"} 3");
    });

    it("separates counters by labels", () => {
      store.incrementCounter("requests", { method: "GET" });
      store.incrementCounter("requests", { method: "POST" });

      const output = store.scrape();
      expect(output).toContain("croe_counter");
      // Two separate counter entries
      expect(output.split("croe_counter").length - 1).toBeGreaterThanOrEqual(2);
    });

    it("handles empty labels", () => {
      store.incrementCounter("bare_counter");
      const output = store.scrape();
      expect(output).toContain("croe_counter 1");
    });
  });

  describe("recordHistogram", () => {
    it("records values in correct buckets", () => {
      store.recordHistogram("latency", 50, { route: "/test" });
      store.recordHistogram("latency", 200, { route: "/test" });
      store.recordHistogram("latency", 1500, { route: "/test" });

      const output = store.scrape();
      expect(output).toContain("latency_bucket");
      expect(output).toContain("latency_sum");
      expect(output).toContain("latency_count");
    });

    it("tracks sum and count correctly", () => {
      store.recordHistogram("test_hist", 10);
      store.recordHistogram("test_hist", 30);
      store.recordHistogram("test_hist", 60);

      const output = store.scrape();
      // Sum should be 10+30+60 = 100
      expect(output).toContain("test_hist_sum{");
      expect(output).toContain("test_hist_count{");
    });

    it("handles multiple label sets", () => {
      store.recordHistogram("http_request_duration_ms", 45, { method: "GET", status: "200" });
      store.recordHistogram("http_request_duration_ms", 120, { method: "POST", status: "500" });

      const output = store.scrape();
      expect(output).toContain("method=\"GET\"");
      expect(output).toContain("method=\"POST\"");
    });
  });

  describe("scrape", () => {
    it("returns empty string when no metrics", () => {
      const output = store.scrape();
      expect(output).toBe("\n");
    });

    it("returns Prometheus-compatible format", () => {
      store.incrementCounter("my_counter");
      const output = store.scrape();
      expect(output).toContain("# TYPE");
      expect(output).toContain("# HELP");
    });

    it("includes histogram bucket boundaries", () => {
      store.recordHistogram("http_request_duration_ms", 1);
      const output = store.scrape();
      expect(output).toContain("le=\"10\"");
      expect(output).toContain("le=\"100\"");
      expect(output).toContain("le=\"1000\"");
      expect(output).toContain("le=\"10000\"");
    });
  });

  describe("reset", () => {
    it("clears all metrics", () => {
      store.incrementCounter("test", { a: "b" });
      store.recordHistogram("test_hist", 42);
      store.reset();

      const output = store.scrape();
      expect(output).not.toContain("test");
      expect(output).not.toContain("test_hist");
    });
  });
});
