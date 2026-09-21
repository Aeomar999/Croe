import axios from "axios";
import { SmsProvider } from "./sms-provider.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../middleware/error-handler.js";

export class ArkeselSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    if (!env.ARKESEL_SMS_API_KEY) {
      logger.warn("ARKESEL_SMS_API_KEY is not set. OTP will not be delivered.");
      return;
    }

    try {
      // Auto-read formatting requires a specific format in some cases, 
      // but usually just '<#> Your code is: 123456\nAppHash' which is handled on frontend.
      // We will just send the standard message, and optionally append the AppHash if passed.
      const message = `Your Croe verification code is: ${code}. Do not share this code with anyone.`;
      
      const response = await axios.post(
        "https://sms.arkesel.com/api/v2/sms/send",
        {
          sender: "CROE",
          message,
          recipients: [phone.replace(/^\+/, "")],
        },
        {
          headers: {
            "api-key": env.ARKESEL_SMS_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      logger.info({ data: response.data }, "Arkesel SMS response");

      if (response.data?.status !== "success") {
        throw new Error(`Unexpected Arkesel response: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      logger.error({ 
        error: error.message, 
        phone,
        arkeselError: error.response?.data 
      }, "Failed to send SMS via Arkesel");
      // Throw 502 Bad Gateway if the external provider fails
      throw new AppError(502, "Failed to deliver SMS", "SMS_DELIVERY_FAILED");
    }
  }
}
