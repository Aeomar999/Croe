# Croe — API Reference (`30-API-Reference.md`)

> Canonical REST contract. Schemas use the tables/enums from [`11-Data-Model.md`](11-Data-Model.md) and states from [`45-Glossary.md`](45-Glossary.md). Every endpoint referenced elsewhere appears here.

## 1. Conventions

- **Base:** `https://<croe-host>/v1` (final domain TBD).
- **Auth:** `Authorization: Bearer <access_token>` on all non-public endpoints.
- **Idempotency:** `Idempotency-Key: <uuidv4>` **required** on every `POST`/`PUT`/`DELETE` ([`24`](24-Webhooks-and-Idempotency.md)).
- **Forensic headers (injected by the app, [`31`](31-Frontend-React-Native.md)):** `X-Device-Fingerprint`, `X-Network-Type`, `X-App-Version`, `X-Client-Timestamp`.
- **Money in payloads:** decimal **string** + currency, e.g. `{ "amount": "450.00", "currency": "GHS" }`.
- **Versioning:** URL-prefixed (`/v1`). **Pagination:** `?limit=&cursor=`.
- **Error envelope:** `{ "error": "<CODE>", "message": "<human>", "details"?: {...} }`.

## 2. Endpoints by Domain

### Auth ([`20`](20-Identity-Auth.md))
| Method | Path | Actor | Body → Response |
| :--- | :--- | :--- | :--- |
| POST | `/auth/otp/request` | public | `{phone_number}` → `202` |
| POST | `/auth/otp/verify` | public | `{phone_number, code}` → `200 {access_token, refresh_token}` |
| POST | `/auth/refresh` | user | `{refresh_token}` → `200 {access_token, refresh_token}` |
| POST | `/auth/logout` | user | `{}` → `204` |

### KYC ([`21`](21-KYC-and-AML.md))
| POST | `/kyc/submit` | user | multipart `{id_type, id_image}` → `202 {kyc_id, status}` |
| GET | `/kyc/status` | user | → `200 {tier, status}` |

### Escrow ([`13`](13-Escrow-Lifecycle.md))
| POST | `/escrow` | vendor | `{item_description, amount, currency, delivery_terms}` → `201 {transaction_id, pay_url, current_status}` |
| GET | `/escrow/:id` | buyer/vendor | → `200 {transaction, current_status}` (Redis-cached) |
| POST | `/escrow/:id/deposit` | buyer | `{msisdn, carrier}` → `202 {collectionRef, status}` |
| POST | `/escrow/:id/ship` | vendor | `{}` → `200 {current_status: "SHIPPED"}` |
| POST | `/escrow/:id/confirm-delivery` | buyer | `{}` → `200 {current_status: "DELIVERED_CONFIRMED"}` |
| POST | `/escrow/:id/cancel` | vendor | `{}` → `200 {current_status: "CANCELLED"}` |

### Evidence ([`26`](26-Evidence-and-Forensics.md))
| POST | `/evidence/upload` | buyer/vendor | multipart `{file, transaction_id, artifact_type}` → `201 {artifact_id, sha256}` |

### Disputes ([`25`](25-Disputes-and-AI-Triage.md))
| POST | `/disputes` | buyer/vendor | `{transaction_id, reason_code, claim_description, evidence_artifact_ids[]}` → `202 {dispute_id, status}` |
| GET | `/disputes/:id/status` | party | → `200 {status, ai_recommended_action?, summary_for_users?}` |

### Payouts (internal/admin, [`23`](23-Payouts-Refunds.md))
| POST | `/admin/payouts/:transaction_id/retry` | ops | `{}` → `200 {payout_id, status}` |

### Webhooks ([`24`](24-Webhooks-and-Idempotency.md))
| POST | `/webhooks/momo-callback` | aggregator | signed raw body → `200 OK` (<500ms) |

### Admin ([`28`](28-Admin-Console.md))
| GET | `/admin/disputes/queue` | L3 | → `200 {items[]}` |
| POST | `/admin/disputes/:id/resolve` | L3 | `{action: "REFUND_BUYER"\|"RELEASE_VENDOR", reason}` → `200` |
| POST | `/admin/users/:id/freeze` | L3 | `{frozen, reason}` → `200` |
| GET | `/admin/reconciliation` | ops | `?from=&to=` → `200 ReconciliationReport` |

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

## 4. Acceptance Criteria

- Every endpoint referenced by any subsystem doc appears here with request/response and applicable error codes.
- All mutating endpoints document the `Idempotency-Key` requirement.
- Money fields are strings + currency, never numbers.
- Every error a client can receive is in the catalog.
