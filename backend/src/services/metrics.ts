/**
 * Metrics service — in-memory counters and histograms.
 * Exposed as /metrics endpoint for Prometheus scraping.
 * 23-Observability-and-Reconciliation.md §1.
 */

interface Counter {
  value: number;
  labels: Record<string, string>;
}

interface HistogramBucket {
  le: number;
  count: number;
}

interface Histogram {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
  labels: Record<string, string>;
}

export class MetricsStore {
  private counters = new Map<string, Counter>();
  private histograms = new Map<string, Histogram>();

  incrementCounter(name: string, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    const existing = this.counters.get(key);
    if (existing) {
      existing.value++;
    } else {
      this.counters.set(key, { value: 1, labels });
    }
  }

  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    const BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

    let histogram = this.histograms.get(key);
    if (!histogram) {
      histogram = {
        buckets: BUCKETS.map((le) => ({ le, count: 0 })),
        sum: 0,
        count: 0,
        labels,
      };
      this.histograms.set(key, histogram);
    }

    histogram.sum += value;
    histogram.count++;
    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  /**
   * Format all metrics as Prometheus-compatible text exposition.
   */
  scrape(): string {
    const lines: string[] = [];

    // Counters
    for (const [, counter] of this.counters) {
      const labelStr = Object.entries(counter.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      const hasLabels = labelStr.length > 0;
      const suffix = hasLabels ? `{${labelStr}}` : "";
      lines.push(`# HELP croe_counter Generic counter`);
      lines.push(`# TYPE croe_counter counter`);
      lines.push(`croe_counter${suffix} ${counter.value}`);
    }

    // Histograms
    for (const [key, histogram] of this.histograms) {
      const name = key.split(":")[0];
      const labelStr = Object.entries(histogram.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");

      lines.push(`# HELP ${name} ${name}`);
      lines.push(`# TYPE ${name} histogram`);

      for (const bucket of histogram.buckets) {
        lines.push(`${name}_bucket{le="${bucket.le}",${labelStr}} ${bucket.count}`);
      }
      lines.push(`${name}_sum{${labelStr}} ${histogram.sum}`);
      lines.push(`${name}_count{${labelStr}} ${histogram.count}`);
    }

    return lines.join("\n") + "\n";
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}

export const metrics = new MetricsStore();

/**
 * Named counter/histogram helpers for convenience.
 */
export function incrementEscrowCounter(status: string): void {
  metrics.incrementCounter("escrow_transactions_total", { status });
}

export function recordWebhookLatency(route: string, durationMs: number): void {
  metrics.recordHistogram("webhook_duration_ms", durationMs, { route });
}

export function recordAIIterationLatency(durationMs: number): void {
  metrics.recordHistogram("ai_triage_duration_ms", durationMs, { phase: "llm_call" });
}

export function recordReconciliationLatency(durationMs: number): void {
  metrics.recordHistogram("reconciliation_duration_ms", durationMs);
}

export function incrementReconciliationAnomaly(): void {
  metrics.incrementCounter("reconciliation_anomalies_total");
}

export function incrementAlertCounter(severity: string): void {
  metrics.incrementCounter("alerts_fired_total", { severity });
}

export function incrementLedgerIntegrityAnomaly(): void {
  metrics.incrementCounter("ledger_integrity_anomalies_total");
}

/**
 * Snapshot for the admin /metrics endpoint.
 */
export function getMetricsSnapshot(): { prometheusText: string } {
  return { prometheusText: metrics.scrape() };
}
