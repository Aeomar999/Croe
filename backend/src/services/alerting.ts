/**
 * Alerting service — structured alert emission for ops dashboards.
 * Logs alert events at ERROR/WARN level; can be extended to send
 * webhooks/Slack/email in P2.
 *
 * 23-Observability-and-Reconciliation.md §3 (alerting hooks).
 */
import { logger } from "../config/logger.js";
import { incrementAlertCounter } from "./metrics.js";

export type AlertSeverity = "critical" | "warning" | "info";

interface AlertPayload {
  severity: AlertSeverity;
  source: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const activeAlerts = new Map<string, AlertPayload>();

/**
 * Fire an alert. Deduplicates by source key within a cooldown window.
 */
export function fireAlert(
  severity: AlertSeverity,
  source: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  const existing = activeAlerts.get(source);
  if (existing) {
    // Already firing — don't spam
    return;
  }

  const alert: AlertPayload = {
    severity,
    source,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  activeAlerts.set(source, alert);
  incrementAlertCounter(severity);

  const logFn = severity === "critical" ? logger.error : severity === "warning" ? logger.warn : logger.info;
  logFn({ alert }, `ALERT: ${source} — ${message}`);

  // Auto-clear after 5 minutes
  setTimeout(() => {
    activeAlerts.delete(source);
  }, 5 * 60 * 1000);
}

/**
 * Clear an active alert (e.g., when the condition resolves).
 */
export function clearAlert(source: string): void {
  activeAlerts.delete(source);
}

/**
 * Get all currently active alerts.
 */
export function getActiveAlerts(): AlertPayload[] {
  return Array.from(activeAlerts.values());
}

/**
 * Convenience alerters for common Phase 8 scenarios.
 */
export function alertReconciliationAnomaly(gap: string, currency: string): void {
  fireAlert(
    "critical",
    "reconciliation_gap",
    `Reconciliation gap detected: ${gap} ${currency} discrepancy between ledger and custody`,
    { gap, currency },
  );
}

export function alertLedgerIntegrityFailure(failureCount: number): void {
  fireAlert(
    "critical",
    "ledger_integrity",
    `Ledger integrity check failed: ${failureCount} anomalies detected`,
    { failureCount },
  );
}

export function alertHighErrorRate(route: string, errorRate: number): void {
  fireAlert(
    "warning",
    `error_rate:${route}`,
    `High error rate on ${route}: ${(errorRate * 100).toFixed(1)}%`,
    { route, errorRate },
  );
}

export function alertDiskRetentionFailure(messageCount: number): void {
  fireAlert(
    "warning",
    "retention_cleanup",
    `Retention cleanup skipped ${messageCount} messages due to active disputes`,
    { messageCount },
  );
}
