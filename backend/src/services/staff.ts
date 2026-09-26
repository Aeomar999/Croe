import { getTransactionClient } from "../db/pool.js";
import { AppError } from "../middleware/error-handler.js";
import { hashPassword } from "./auth.js";

/**
 * Staff account provisioning (task.md T7.4). Reviewer, ops and admin roles
 * move money (dispute resolution, payout retry, KYC approval), so they are
 * created only through this service — never through the dev seed.
 */
export const STAFF_ROLES = ["reviewer", "ops", "admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const MIN_STAFF_PASSWORD_LENGTH = 12;

const E164_RE = /^\+[1-9]\d{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns the reasons a password is too weak, or an empty list. */
export function staffPasswordProblems(password: string, email: string): string[] {
  const problems: string[] = [];
  if (password.length < MIN_STAFF_PASSWORD_LENGTH) {
    problems.push(`must be at least ${MIN_STAFF_PASSWORD_LENGTH} characters`);
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) {
    problems.push("must mix at least three of: lowercase, uppercase, digits, symbols");
  }
  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  if (localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
    problems.push("must not contain the email name");
  }
  return problems;
}

export async function createStaffAccount(p: {
  email: string;
  phoneNumber: string;
  fullName: string;
  role: string;
  password: string;
}): Promise<{ userId: string }> {
  const email = p.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new AppError(400, "A valid staff email is required", "VALIDATION_ERROR");
  }
  if (!E164_RE.test(p.phoneNumber)) {
    throw new AppError(400, "phone number must be E.164 format (e.g. +233240000000)", "VALIDATION_ERROR");
  }
  if (!(STAFF_ROLES as readonly string[]).includes(p.role)) {
    throw new AppError(400, `role must be one of ${STAFF_ROLES.join(", ")}`, "VALIDATION_ERROR");
  }
  if (!p.fullName.trim()) {
    throw new AppError(400, "full name is required", "VALIDATION_ERROR");
  }
  const weak = staffPasswordProblems(p.password, email);
  if (weak.length > 0) {
    throw new AppError(400, `Password ${weak.join("; ")}`, "WEAK_PASSWORD");
  }

  const client = await getTransactionClient();
  try {
    const { rows } = await client.query<{ user_id: string }>(
      `INSERT INTO users (email, phone_number, full_name, role, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [email, p.phoneNumber, p.fullName.trim(), p.role, hashPassword(p.password)],
    );
    return { userId: rows[0]!.user_id };
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new AppError(409, "A user with this email or phone number already exists", "STAFF_EXISTS");
    }
    throw err;
  } finally {
    client.release();
  }
}
