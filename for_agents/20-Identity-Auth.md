# Croe — Identity, Auth & Sessions (`20-Identity-Auth.md`)

> Tables: `users`, `otp_challenges`, `auth_sessions` ([`11-Data-Model.md`](11-Data-Model.md)). No passwords — phone-OTP only. Custody phase: all.

## 1. Purpose & Boundaries

Establish who a user is (phone-number-first), issue sessions, and bind devices for forensics. **Does not** do KYC/identity verification (that's [`21`](21-KYC-and-AML.md)) — a session only proves control of a phone number.

## 2. Auth Model

- **Identifier:** E.164 phone number (same one used for MoMo).
- **Credential:** one-time password (OTP) sent by SMS. No stored passwords.
- **Session:** short-lived **access token** (JWT, ~15 min) + long-lived **refresh token** (opaque, hashed in `auth_sessions`, ~30 days). Access token carries `user_id`, `kyc_tier`, `session_id`.
- **Device binding:** every session records `device_id` (from `X-Device-Fingerprint`); mismatch on refresh is flagged (SIM-swap/hijack signal).

## 3. Endpoints (contracts in [`30-API-Reference.md`](30-API-Reference.md))

| Endpoint | Purpose |
| :--- | :--- |
| `POST /v1/auth/otp/request` | Body `{ phone_number }`. Creates `otp_challenges` row (hashed code, 5-min expiry), sends SMS. Rate-limited. Always returns `202` (don't leak whether the number exists). |
| `POST /v1/auth/otp/verify` | Body `{ phone_number, code }`. On match: upsert `users`, create `auth_sessions`, return `{ access_token, refresh_token }`. |
| `POST /v1/auth/refresh` | Body `{ refresh_token }`. Rotates refresh token; returns new pair. |
| `POST /v1/auth/logout` | Revokes the current session (`revoked_at`). |

## 4. OTP Flow

```mermaid
sequenceDiagram
    actor U as User (RN app)
    participant API as Croe API
    participant SMS as SMS Provider
    U->>API: POST /auth/otp/request {phone}
    API->>API: rate-limit check; generate 6-digit code; store hash + expiry
    API->>SMS: send code
    API-->>U: 202 Accepted
    U->>API: POST /auth/otp/verify {phone, code}
    API->>API: hash(code) == stored, not expired, not consumed, attempts < 5
    API->>API: mark consumed; upsert user; create session
    API-->>U: 200 {access_token, refresh_token}
```

## 5. Error & Edge Cases

| Case | Handling |
| :--- | :--- |
| OTP expired (`> expires_at`) | `401 OTP_EXPIRED`; user must re-request. |
| OTP reuse (already `consumed_at`) | `401 OTP_INVALID`. Never accept a consumed code. |
| Brute force (`attempts ≥ 5`) | Lock the challenge; `429 OTP_LOCKED`; require re-request after cooldown. |
| Request flooding | Per-phone + per-IP rate limit (Redis); `429 RATE_LIMITED`. |
| SIM-swap signal | Refresh from a new `device_id` → flag, require fresh OTP, notify the old device/number. |
| Frozen user (`is_frozen`) | Allow login but block money actions; surface a calm banner. |
| Unknown number on request | Still `202` (no enumeration); only `verify` creates the user. |

## 6. Security Notes

- OTP codes are stored **hashed** (`code_hash`), never plaintext; compared in constant time.
- Refresh tokens stored hashed; rotated on every use (reuse of an old refresh token → revoke the whole chain).
- Access-token secret and OTP pepper come from env/secrets ([`40-Security-Threat-Model.md`](40-Security-Threat-Model.md)); never in code.
- All auth mutations write forensic headers to the ledger where they touch a transaction.

## 7. Acceptance Criteria

- A user can register and log in with only a phone number + SMS code.
- A consumed or expired OTP can never mint a session.
- Every session is revocable; logout invalidates the refresh token.
- Device mismatch on refresh is detectable and flagged.
- No plaintext OTP or token is ever stored or logged.
