/**
 * Create a staff (reviewer/ops/admin) account (task.md T7.4).
 *
 *   Local:   pnpm --filter croe-backend staff:create
 *   Deploy:  node dist/db/create-staff.js   (Render shell, env already set)
 *
 * Reads STAFF_EMAIL, STAFF_PHONE, STAFF_NAME and STAFF_ROLE from the
 * environment. The password is prompted for without echo when run in a
 * terminal; otherwise it is read from STAFF_PASSWORD. Never pass it as a
 * command-line argument (it would land in shell history).
 */
import { pool } from "./pool.js";
import { closeRedis } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { createStaffAccount, MIN_STAFF_PASSWORD_LENGTH } from "../services/staff.js";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          stdin.setRawMode(false);
          reject(new Error("Cancelled"));
          return;
        }
        if (char === "\u007f") {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  const email = process.env.STAFF_EMAIL ?? "";
  const phoneNumber = process.env.STAFF_PHONE ?? "";
  const fullName = process.env.STAFF_NAME ?? "";
  const role = process.env.STAFF_ROLE ?? "reviewer";

  let password = process.env.STAFF_PASSWORD ?? "";
  if (!password && process.stdin.isTTY) {
    password = await promptHidden(`Password for ${email} (min ${MIN_STAFF_PASSWORD_LENGTH} chars): `);
    const confirm = await promptHidden("Confirm password: ");
    if (confirm !== password) throw new Error("Passwords do not match");
  }

  const { userId } = await createStaffAccount({ email, phoneNumber, fullName, role, password });
  logger.info({ userId, role }, "Staff account created");
}

main()
  .catch((err: Error) => {
    logger.error({ err: { message: err.message } }, "Staff account was not created");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await closeRedis();
  });
