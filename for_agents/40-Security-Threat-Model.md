# Croe — Security & Threat Model (`40-Security-Threat-Model.md`)

> STRIDE-based. Cross-refs the concrete mitigations in other docs (webhooks [`24`](24-Webhooks-and-Idempotency.md), auth [`20`](20-Identity-Auth.md), disputes [`25`](25-Disputes-and-AI-Triage.md)). Custody phase: all.

## 1. STRIDE Threat Matrix

| Threat | Attack vector in Croe | Mitigation | Owning doc |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forged MoMo callback claiming a fake deposit | HMAC-SHA256 over raw buffer + constant-time compare | [`24`](24-Webhooks-and-Idempotency.md) |
| **Spoofing** | Session/OTP hijack | Hashed OTP, rotating refresh tokens, device binding | [`20`](20-Identity-Auth.md) |
| **Tampering** | Reused photo of a broken item across disputes | SHA-256 recycled-evidence trap | [`26`](26-Evidence-and-Forensics.md) |
| **Tampering** | Altering ledger history | Append-only ledger; `REVOKE UPDATE,DELETE` | [`11`](11-Data-Model.md) |
| **Repudiation** | "My account was hacked" | Immutable forensic capture (IP/device/network) per action | [`26`](26-Evidence-and-Forensics.md) |
| **Information disclosure** | Leaking chats/financials to external AI | Self-hosted local LLM; no third-party API | [`25`](25-Disputes-and-AI-Triage.md) |
| **Information disclosure** | Raw ID numbers stored | Hash IDs; restricted storage | [`21`](21-KYC-and-AML.md) |
| **Denial of service** | Webhook flooding / Sybil disputes | Redis rate limits + sub-second SQL velocity checks | [`24`](24-Webhooks-and-Idempotency.md)/[`25`](25-Disputes-and-AI-Triage.md) |
| **Elevation of privilege** | Prompt injection in a claim | Deterministic pre-filter; schema-locked JSON output | [`25`](25-Disputes-and-AI-Triage.md) |
| **Elevation of privilege** | Admin action abuse | RBAC, audited actions, separate admin auth | [`28`](28-Admin-Console.md) |

## 2. Secrets Management

- **No secret literals** in code, docs, or logs. All secrets (`MOMO_WEBHOOK_SECRET`, aggregator API keys, JWT signing key, OTP pepper, DB creds) come from environment / a secrets manager.
- Rotate the webhook HMAC secret and signing keys on a schedule; support dual-key rotation windows.
- `.env` is git-ignored; production uses the platform's secret store ([`41`](41-Infra-and-Deployment.md)).

## 3. Encryption & Key Management

- **In transit:** TLS everywhere (client, aggregator webhooks, admin).
- **At rest:** DB and object storage encryption (provider-managed); ID hashes and token hashes never reversible.
- **Keys:** HMAC/JWT keys are high-entropy, stored in the secret store, never in the repo.

## 4. Application Security

- Input validation on every endpoint; parameterized SQL only (no string interpolation).
- Helmet/security headers; CORS locked to known origins.
- Rate limiting per IP/device/phone (Redis) on auth, deposit, dispute, upload.
- Least-privilege DB role (`app_user`) — notably no `UPDATE`/`DELETE` on `transaction_ledger`.

## 5. AI-Specific Hardening

Prompt-injection defense is layered: deterministic SQL pre-filter runs first, user text is isolated in JSON fields, and output must pass strict schema validation before any action. The model's text can never directly trigger a payout — only a validated `recommended_action` + confidence gate + code can ([`25`](25-Disputes-and-AI-Triage.md)).

## 6. Data Protection & Retention

Forensic data and media are minimized, access-restricted (L3/ops only), and retained per Ghana's Data Protection Act and BoG/partner rules ([`02`](02-Market-and-Regulatory.md)) — durations **[verify]**. A deletion/retention job enforces the policy ([`42`](42-Observability-and-Reconciliation.md)).

## 7. Pen-Test / Audit Scope (pre-launch)

Webhook forgery & replay, auth/OTP brute force, IDOR on `/escrow/:id`, idempotency bypass, SQL injection, prompt injection, admin RBAC, secret exposure. Findings gate the P1→P2 launch.

## 8. Acceptance Criteria

- Every STRIDE row has a mitigation with an owning doc.
- No secret appears in any doc or code sample.
- The LLM cannot move money without the confidence gate + code path.
- Append-only enforcement is verified (app role lacks ledger `UPDATE`/`DELETE`).
