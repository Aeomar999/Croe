import { env } from "../../config/env.js";
import type { SmsProvider } from "./sms-provider.js";
import { MockSmsProvider } from "./mock-provider.js";
import { ArkeselSmsProvider } from "./arkesel-provider.js";

/**
 * Pick the SMS provider (task.md T7.9):
 *   - tests always use the mock;
 *   - Arkesel whenever ARKESEL_SMS_API_KEY is set (required outside P0);
 *   - otherwise the mock, which prints the code only in development/test.
 */
export function selectSmsProvider(config: { NODE_ENV: string; ARKESEL_SMS_API_KEY: string } = env): SmsProvider {
  if (config.NODE_ENV === "test" || !config.ARKESEL_SMS_API_KEY) {
    return new MockSmsProvider(config.NODE_ENV);
  }
  return new ArkeselSmsProvider();
}
