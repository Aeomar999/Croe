# Croe — API Reference (`18-API-Reference.md`)

> Canonical REST contract. Schemas use the tables/enums from [`05-Data-Model.md`](05-Data-Model.md) and states from [`26-Glossary.md`](26-Glossary.md). Every endpoint referenced elsewhere appears here.

## 1. Conventions

- **Base:** `https://<croe-host>/v1` (final domain TBD).
- **Auth:** `Authorization: Bearer <access_token>` on all non-public endpoints.
- **Idempotency:** `Idempotency-Key: <uuidv4>` **required** on every `POST`/`PUT`/`DELETE` ([`24`](12-Webhooks-and-Idempotency.md)).
- **Forensic headers (injected by the app, [`31`](19-Frontend-React-Native.md)):** `X-Device-Fingerprint`, `X-Network-Type`, `X-App-Version`, `X-Client-Timestamp`.
- **Money in payloads:** decimal **string** + currency, e.g. `{ "amount": "450.00", "currency": "GHS" }`.
- **Versioning:** URL-prefixed (`/v1`). **Pagination:** `?limit=&cursor=`.
- **Error envelope:** `{ "error": "<CODE>", "message": "<human>", "details"?: {...} }`.

## 2. Endpoints by Domain

### Auth & User Management ([`20`](08-Identity-Auth.md))
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| POST | `/auth/otp/request` | public | `{phone_number}` → `202` |
| POST | `/auth/otp/verify` | public | `{phone_number, code}` → `200 {access_token, refresh_token}` |
| POST | `/auth/login` | admin | `{email, password}` → `200 {access_token, refresh_token, user}` |
| POST | `/auth/refresh` | user | `{refresh_token}` → `200 {access_token, refresh_token}` |
| POST | `/auth/logout` | user | `{}` → `204` |
| GET | `/auth/me` | user | → `200 {user}` |
| POST | `/auth/pin` | user | `{pin}` → `200` |
| GET | `/auth/sessions` | user | → `200 {sessions[]}` |
| POST | `/auth/sessions/revoke-other` | user | `{}` → `204` |
| GET | `/users/me/preferences` | user | → `200 {preferences}` |
| PUT | `/users/me/preferences` | user | `{preferences}` → `200` |

### KYC ([`21`](09-KYC-and-AML.md))
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| POST | `/kyc/submit` | user | multipart `{id_type, id_image}` → `202 {kyc_id, status}` |
| GET | `/kyc/status` | user | → `200 {tier, status}` |

### Escrow ([`13`](07-Escrow-Lifecycle.md))
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| POST | `/escrow` | vendor | `{item_description, amount, currency, delivery_terms}` → `201 {transaction_id, pay_url, current_status}` |
| GET | `/escrow/:id` | buyer/vendor | → `200 {transaction, current_status}` (Redis-cached) |
| POST | `/escrow/:id/deposit` | buyer | `{msisdn, carrier}` → `202 {collectionRef, status}` |
| POST | `/escrow/:id/ship` | vendor | `{}` → `200 {current_status: "SHIPPED"}` |
| POST | `/escrow/:id/confirm-delivery` | buyer | `{}` → `200 {current_status: "DELIVERED_CONFIRMED"}` |
| POST | `/escrow/:id/cancel` | vendor | `{}` → `200 {current_status: "CANCELLED"}` |
| POST | `/escrow/:id/release` | ops/admin | `{}` → `200 {current_status: "FUNDS_RELEASED"}` |
| POST | `/escrow/:id/refund` | ops/admin | `{}` → `200 {current_status: "FUNDS_REFUNDED"}` |

### Evidence ([`26`](14-Evidence-and-Forensics.md))
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| POST | `/evidence/upload` | buyer/vendor | multipart `{file, transaction_id, artifact_type}` → `201 {artifact_id, sha256}` |

### Disputes ([`25`](13-Disputes-and-AI-Triage.md))
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| POST | `/disputes` | buyer/vendor | `{transaction_id, reason_code, claim_description, evidence_artifact_ids[]}` → `202 {dispute_id, status}` |
| GET | `/disputes/:id/status` | party | → `200 {status, ai_recommended_action?, summary_for_users?}` |

### Payouts (internal/admin, [`23`](11-Payouts-Refunds.md))
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| POST | `/admin/payouts/:transaction_id/retry` | ops | `{}` → `200 {status}` |

### Webhooks ([`24`](12-Webhooks-and-Idempotency.md))
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| POST | `/webhooks/momo-callback` | aggregator | signed raw body → `200 OK` (<500ms) |

### Admin Console ([`28`](16-Admin-Console.md))
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| GET | `/admin/disputes/queue` | L3 | → `200 {items[]}` |
| GET | `/admin/disputes/:id` | L3 | → `200 DisputeCaseDetail` |
| POST | `/admin/disputes/:id/resolve` | L3 | `{action: "REFUND_BUYER"\|"RELEASE_VENDOR", reason}` → `200` |
| GET | `/admin/kyc/queue` | ops/L3 | → `200 {items[]}` |
| POST | `/admin/kyc/:id/review` | ops/L3 | `{approved: boolean, reason: string}` → `200` |
| POST | `/admin/users/:id/freeze` | L3 | `{frozen, reason}` → `200` |
| POST | `/admin/users/:id/trust-score`| ops/admin | `{trust_score, reason}` → `200` |
| GET | `/admin/reconciliation` | ops | `?from=&to=` → `200 ReconciliationReport` |
| GET | `/admin/metrics` | admin | → `200 text/plain` (Prometheus) |
| GET | `/admin/scheduler-status` | ops/admin | → `200 SchedulerStatus` |

### Infrastructure
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| GET | `/health` | system | → `200 OK` |

## 3. Global Error Catalog

| Code | HTTP | Meaning |
| :--- | :--- | :--- |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Mutating request missing the key. |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | Same key, different body. |
| `UNAUTHENTICATED` | 401 | Missing/invalid session. |
| `OTP_EXPIRED` / `OTP_INVALID` / `OTP_LOCKED` | 401/401/429 | Auth OTP failures. |
| `RATE_LIMITED` | 429 | Too many requests. |
| `KYC_LIMIT_EXCEEDED` | 403 | Amount over tier cap. |
| `INVALID_STATE_TRANSITION` | 409 | Action illegal for current state. |
| `CURRENCY_MISMATCH` | 422 | Wrong/mixed currency. |
| `EVIDENCE_RECYCLED` | 409 | File hash used in another transaction. |
| `FILE_TOO_LARGE` / `UNSUPPORTED_MEDIA_TYPE` | 413/415 | Upload rejected. |
| `INVALID_SIGNATURE` / `REPLAY_WINDOW_EXPIRED` | 401 | Webhook security. |
| `PAYOUT_FAILED` | 502 | Disbursement provider error. |
| `INTERNAL` | 500 | Unexpected. |

## 4. Request Validation Schemas

Every endpoint MUST validate inputs at the edge before any business logic runs. Use Zod (or equivalent) for runtime schema enforcement. The rules below define format constraints — the actual implementation mirrors these as typed schemas.

### Auth & Users

| Endpoint | Field | Type | Constraints |
| :--- | :--- | :--- | :--- |
| `POST /auth/otp/request` | `phone_number` | `string` | E.164 format: `^\+[1-9]\d{6,14}$` |
| `POST /auth/otp/verify` | `phone_number` | `string` | E.164 format (same as above) |
| | `code` | `string` | Exactly 6 digits: `^\d{6}$` |
| `POST /auth/login` | `email` | `string` | Valid email |
| | `password` | `string` | Min 8 chars |
| `POST /auth/refresh` | `refresh_token` | `string` | Non-empty, max 512 chars |
| `POST /auth/pin` | `pin` | `string` | Exactly 4 digits |

### KYC

| Endpoint | Field | Type | Constraints |
| :--- | :--- | :--- | :--- |
| `POST /kyc/submit` | `id_type` | `enum` | `"NATIONAL_ID" \| "PASSPORT" \| "VOTER_ID"` |
| | `id_image` | `binary` | Max 10 MB; JPEG/PNG only |

### Escrow

| Endpoint | Field | Type | Constraints |
| :--- | :--- | :--- | :--- |
| `POST /escrow` | `item_description` | `string` | 10–500 chars, no control characters |
| | `amount` | `string` | Decimal `^\d{1,13}\.\d{2}$` (NUMERIC(15,2) wire format) |
| | `currency` | `enum` | `"GHS" \| "NGN" \| "KES"` |
| | `delivery_terms` | `string` | 10–500 chars |
| `GET /escrow/:id` | `id` | `string` | UUIDv4 |
| `POST /escrow/:id/deposit` | `id` | `string` | UUIDv4 |
| | `msisdn` | `string` | E.164 format |
| | `carrier` | `enum` | `"MTN" \| "TELECEL" \| "AIRTELTIGO"` |
| `POST /escrow/:id/ship` | `id` | `string` | UUIDv4 |
| `POST /escrow/:id/confirm-delivery` | `id` | `string` | UUIDv4 |
| `POST /escrow/:id/cancel` | `id` | `string` | UUIDv4 |
| `POST /escrow/:id/release` | `id` | `string` | UUIDv4 |
| `POST /escrow/:id/refund` | `id` | `string` | UUIDv4 |

### Evidence

| Endpoint | Field | Type | Constraints |
| :--- | :--- | :--- | :--- |
| `POST /evidence/upload` | `file` | `binary` | Max 25 MB; JPEG/PNG/MP4/PDF only |
| | `transaction_id` | `string` | UUIDv4 |
| | `artifact_type` | `enum` | `"PHOTO" \| "VIDEO" \| "DOCUMENT" \| "SCREENSHOT"` |

### Disputes

| Endpoint | Field | Type | Constraints |
| :--- | :--- | :--- | :--- |
| `POST /disputes` | `transaction_id` | `string` | UUIDv4 |
| | `reason_code` | `enum` | `"NOT_RECEIVED" \| "WRONG_ITEM" \| "DAMAGED" \| "NOT_AS_DESCRIBED" \| "OTHER"` |
| | `claim_description` | `string` | 20–1000 chars |
| | `evidence_artifact_ids` | `string[]` | 0–10 UUIDv4 values |
| `GET /disputes/:id/status` | `id` | `string` | UUIDv4 |

### Admin & Payouts

| Endpoint | Field | Type | Constraints |
| :--- | :--- | :--- | :--- |
| `GET /admin/disputes/:id` | `id` | `string` | UUIDv4 |
| `POST /admin/disputes/:id/resolve` | `id` | `string` | UUIDv4 |
| | `action` | `enum` | `"REFUND_BUYER" \| "RELEASE_VENDOR"` |
| | `reason` | `string` | 10–500 chars |
| `POST /admin/kyc/:id/review` | `id` | `string` | UUIDv4 |
| | `approved` | `boolean` | required |
| | `reason` | `string` | 10-500 chars (required if false) |
| `POST /admin/users/:id/freeze` | `id` | `string` | UUIDv4 |
| | `frozen` | `boolean` | required |
| | `reason` | `string` | 10–500 chars |
| `POST /admin/users/:id/trust-score` | `id` | `string` | UUIDv4 |
| | `trust_score` | `number` | 0-100 |
| | `reason` | `string` | 10–500 chars |
| `POST /admin/payouts/:transaction_id/retry`| `transaction_id` | `string` | UUIDv4 |
| `GET /admin/reconciliation` | `from` | `string` | ISO 8601 datetime |
| | `to` | `string` | ISO 8601 datetime; must be > `from` |

### Global Rules

- Reject with `400` + `{ error: "VALIDATION_ERROR", details: {...} }` if any field fails validation.
- `phone_number` and `msisdn` MUST be E.164 — no dashes, no spaces, no leading zeros.
- `amount` is always a decimal string with exactly 2 decimal places — never an integer, never a float.
- `Idempotency-Key` header is validated as UUIDv4 on all `POST`/`PUT`/`DELETE`.

## 5. Acceptance Criteria

- Every endpoint referenced by any subsystem doc appears here with request/response and applicable error codes.
- All mutating endpoints document the `Idempotency-Key` requirement.
- Money fields are strings + currency, never numbers.
- Every error a client can receive is in the catalog.
- Every endpoint has a validation schema with field-level constraints (§4).
