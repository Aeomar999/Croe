import { logger } from "../../config/logger.js";
import { SmsProvider } from "./sms-provider.js";

/** Environments where printing the OTP to the log is acceptable. */
const CODE_VISIBLE_ENVS = new Set(["development", "test"]);

/**
 * Logs OTPs instead of sending them. The code itself is only logged in
 * development and test; on staging or production the entry is redacted so
 * OTPs never reach shared logs (task.md T7.9).
 */
export class MockSmsProvider implements SmsProvider {
  constructor(private readonly nodeEnv: string) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    if (CODE_VISIBLE_ENVS.has(this.nodeEnv)) {
      logger.info({ phone, otp: code }, "OTP sent (Mock Provider)");
      return;
    }
    logger.warn(
      { phone: `${phone.slice(0, 4)}****${phone.slice(-2)}` },
      "OTP not delivered: no SMS provider configured (code withheld from logs)",
    );
  }
}
