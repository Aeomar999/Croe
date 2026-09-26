import { describe, it, expect, afterAll, beforeEach } from "vitest";
import crypto from "crypto";
import { pool } from "../db/pool.js";
import { closeRedis } from "../config/redis.js";
import { adminLogin } from "./auth.js";
import { createStaffAccount, staffPasswordProblems } from "./staff.js";

const EMAIL = "reviewer.test@croe.example";
const PHONE = "+233200000777";

/**
 * Fixture passwords are generated per run so no credential-like literal is
 * committed (secret scanners flag them). Each satisfies the staff policy:
 * 12+ characters mixing upper, lower, digits and a symbol.
 */
function strongPassword(): string {
  return `Aa9-${crypto.randomBytes(9).toString("hex")}`;
}
const PASSWORD = strongPassword();

async function clean(): Promise<void> {
  await pool.query(
    "DELETE FROM auth_sessions WHERE user_id IN (SELECT user_id FROM users WHERE email = $1 OR phone_number = $2)",
    [EMAIL, PHONE],
  );
  await pool.query("DELETE FROM users WHERE email = $1 OR phone_number = $2", [EMAIL, PHONE]);
}

beforeEach(clean);

afterAll(async () => {
  await clean();
  await pool.end();
  await closeRedis();
});

describe("staff provisioning on a migrations-only database (task.md T7.3/T7.4)", () => {
  it("users.password_hash exists from migrations alone", async () => {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("creates a reviewer who can then log in to the admin console", async () => {
    const { userId } = await createStaffAccount({
      email: EMAIL,
      phoneNumber: PHONE,
      fullName: "Test Reviewer",
      role: "reviewer",
      password: PASSWORD,
    });

    const session = await adminLogin(EMAIL, PASSWORD);
    expect(session.userId).toBe(userId);
    expect(session.accessToken).toBeTruthy();
  });

  it("rejects a wrong password for the new account", async () => {
    await createStaffAccount({ email: EMAIL, phoneNumber: PHONE, fullName: "Test Reviewer", role: "reviewer", password: PASSWORD });
    await expect(adminLogin(EMAIL, strongPassword())).rejects.toMatchObject({ statusCode: 401 });
  });

  it("refuses a duplicate email with 409", async () => {
    await createStaffAccount({ email: EMAIL, phoneNumber: PHONE, fullName: "Test Reviewer", role: "reviewer", password: PASSWORD });
    await expect(
      createStaffAccount({ email: EMAIL, phoneNumber: "+233200000778", fullName: "Dup", role: "ops", password: PASSWORD }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("refuses non-staff roles and weak passwords", async () => {
    await expect(
      createStaffAccount({ email: EMAIL, phoneNumber: PHONE, fullName: "X", role: "consumer", password: PASSWORD }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      createStaffAccount({ email: EMAIL, phoneNumber: PHONE, fullName: "X", role: "admin", password: "a".repeat(8) }),
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD" });
  });
});

describe("staffPasswordProblems", () => {
  it("accepts a long mixed password", () => {
    expect(staffPasswordProblems(strongPassword(), EMAIL)).toEqual([]);
  });

  it("flags short, single-class and email-derived passwords", () => {
    expect(staffPasswordProblems(strongPassword().slice(0, 8), EMAIL).join()).toMatch(/at least 12/);
    expect(staffPasswordProblems("x".repeat(20), EMAIL).join()).toMatch(/three of/);
    const emailName = EMAIL.split("@")[0]!;
    expect(staffPasswordProblems(`${emailName.toUpperCase()}-${strongPassword()}`, EMAIL).join()).toMatch(/email name/);
  });
});
