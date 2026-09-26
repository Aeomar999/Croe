import { describe, it, expect, afterEach } from "vitest";
import { fireAlert, clearAlert, getActiveAlerts } from "./alerting.js";

/**
 * Uses the real pino logger (alerting.test.ts mocks it). pino methods throw
 * when called detached from the logger, which silently broke every alert.
 */
describe("fireAlert with the real logger", () => {
  afterEach(() => {
    for (const source of ["real-logger-critical", "real-logger-warning", "real-logger-info"]) clearAlert(source);
  });

  it.each([
    ["critical", "real-logger-critical"],
    ["warning", "real-logger-warning"],
    ["info", "real-logger-info"],
  ] as const)("logs a %s alert without throwing", (severity, source) => {
    expect(() => fireAlert(severity, source, "test alert")).not.toThrow();
    expect(getActiveAlerts().some((a) => a.source === source)).toBe(true);
  });
});
