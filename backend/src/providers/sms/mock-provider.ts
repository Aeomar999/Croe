import { logger } from "../../config/logger.js";
import { SmsProvider } from "./sms-provider.js";

export class MockSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    logger.info({ phone, code }, "OTP sent (Mock Provider)");
  }
}
