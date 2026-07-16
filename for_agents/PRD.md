# Social Commerce Escrow Platform — Product Requirements Document (PRD)

## 1. Executive Summary & Vision
The **Social Commerce Escrow Platform** is a lightweight, mobile-first trust and financial escrow service engineered specifically for informal social commerce across emerging markets (WhatsApp, Instagram DMs, TikTok, Facebook Marketplace). 

In social commerce, transactions suffer from a fundamental trust deficit:
- **Buyers** fear paying upfront for goods that may never arrive or arrive defective/counterfeit.
- **Vendors** fear dispatching inventory or hiring couriers for orders where payment never materializes.

**Our Solution**: A zero-friction payment link system that deep-integrates with local **Mobile Money (MoMo)** rails. Funds are held securely in escrow until delivery is verified. To operate sustainably with minimal operational overhead, the platform replaces expensive manual customer support with a **Three-Tier Forensic & Automated Triage Pipeline**:
1. **Immutable Forensic Logging**: Cryptographically verifiable audit trails and file hashing.
2. **Deterministic SQL Heuristics**: Sub-second automated security tripwires for high-velocity fraud and Sybil attacks.
3. **Local AI Dispute Arbitrator**: Structured JSON evaluation powered by local open-weights LLMs (Gemma 4) for nuanced dispute resolution.

---

## 2. Target Personas

### 2.1 Social Commerce Vendor ("The Merchant")
- **Profile**: Small-to-medium social media seller operating primarily on WhatsApp/Instagram.
- **Pain Points**: High rate of cash-on-delivery (COD) rejections, fake payment receipts, loss of time haggling over trust.
- **Goals**: Generate instant checkout links, receive immediate notification when buyer funds are secured, obtain guaranteed automated payouts upon delivery.

### 2.2 Social Commerce Buyer ("The Consumer")
- **Profile**: Mobile-first shopper purchasing clothes, electronics, and lifestyle goods via DM.
- **Pain Points**: Fear of being scammed by Instagram vendors after sending MoMo transfers upfront.
- **Goals**: Deposit funds securely via familiar MoMo USSD prompts, inspect goods upon arrival, trigger instant release or submit structured disputes if items are damaged/missing.

### 2.3 Platform Auditor & Human Reviewer ("Level 3 Escalation")
- **Profile**: Compliance and trust-and-safety officer reviewing edge-case disputes.
- **Goals**: Access complete forensic logs, IP/device metadata, SHA-256 verified photos, and AI reasoning logs to adjudicate inconclusive disputes within minutes.

---

## 3. Core Functional Requirements

### 3.1 Escrow Link Generation & Sharing
- **REQ-LINK-1**: Vendors shall be able to create a unique escrow contract specifying item description, amount (`NUMERIC(15,2)`), currency (`GHS`, `NGN`, `KES`), and delivery terms.
- **REQ-LINK-2**: The system shall output a shareable URL (`https://app.escrow.co/pay/trx_<UUID>`) optimized for instant rendering in chat applications (WhatsApp/Instagram OpenGraph preview cards).

### 3.2 Mobile Money Deposit & Escrow Locking
- **REQ-PAY-1**: Buyers accessing an escrow link shall be prompted to enter their MoMo phone number and carrier.
- **REQ-PAY-2**: The backend shall initiate a carrier USSD payment prompt on the buyer's handset via integration with MoMo gateways (MTN MoMo, Telecel, AirtelTigo, Paystack).
- **REQ-PAY-3**: Upon asynchronous webhook confirmation from the payment gateway, the platform shall immediately update the escrow contract status to `FUNDS_SECURED` and dispatch push notifications/SMS to both parties.

### 3.3 Delivery Dispatch & Buyer Confirmation
- **REQ-DEL-1**: Vendors shall be cleared to dispatch goods only after the contract transitions to `FUNDS_SECURED`.
- **REQ-DEL-2**: Buyers shall confirm delivery via an in-app "Confirm Delivery" button, which triggers an idempotent API request to instantly release funds to the vendor's MoMo wallet (less platform commission).

### 3.4 Automated Dispute Submission & Triage
- **REQ-DIS-1**: Either party may open a dispute within the designated dispute window (default: 24 hours post-delivery flag).
- **REQ-DIS-2**: Dispute submissions require a structured reason code (`ITEM_NOT_RECEIVED`, `ITEM_DAMAGED`, `WRONG_ITEM`) and optional media upload.
- **REQ-DIS-3**: Uploaded media shall be computed for SHA-256 hashes on the fly and cross-referenced against historical evidence to detect recycled scam photos.
- **REQ-DIS-4**: Disputes passing deterministic SQL security checks shall be evaluated autonomously by the local AI Arbitrator (Gemma 4), which outputs a structured JSON decision (`REFUND_BUYER`, `RELEASE_VENDOR`, or `ESCALATE_HUMAN`) with a confidence score.

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Financial Integrity & Idempotency
- **NFR-FIN-1**: Zero floating-point drift: All monetary calculations must use exact fixed-point or `NUMERIC(15,2)` database types.
- **NFR-FIN-2**: Double-spend immunity: Concurrent webhook arrivals must be serialized at the PostgreSQL engine layer via `SELECT FOR UPDATE` and partial unique constraints.
- **NFR-FIN-3**: Client network resilience: All mutating API endpoints must require client-generated `Idempotency-Key` UUIDv4 headers to handle spotty cellular retries safely.

### 4.2 Latency & Performance
- **NFR-PERF-1**: Deterministic SQL security heuristics must execute in `< 50ms` using connection pools and targeted B-Tree indexes.
- **NFR-PERF-2**: Local AI Arbitrator inference must complete in `< 5.0 seconds` per dispute.
- **NFR-PERF-3**: Webhook acknowledgment endpoints must respond with `200 OK` in `< 500ms` before background processing starts.

### 4.3 Auditability & Immutability
- **NFR-AUD-1**: The `transaction_ledger` table must be strictly append-only. Database users executing application code shall have `UPDATE` and `DELETE` privileges revoked.
- **NFR-AUD-2**: Every state change must record silent forensic artifacts: IP address (`INET`), device hardware ID, network type, and client timestamp.

---

## 5. End-to-End User Journeys

```
+-----------------------------------------------------------------------------------+
|                               HAPPY PATH WORKFLOW                                 |
+-----------------------------------------------------------------------------------+
  [Vendor] --(1. Generate Link)--> [API /v1/escrow] --(2. Share WhatsApp)--> [Buyer]
                                                                                |
  [Vendor] <--(4. Push: FUNDS_SECURED)-- [Webhook Handler] <--(3. Pay MoMo USSD)+
     |
  (5. Ship Item)
     |
     v
  [Buyer] --(6. Tap Confirm Delivery)--> [API /confirm-delivery] --> [Instant Payout]
```

```
+-----------------------------------------------------------------------------------+
|                            AUTOMATED DISPUTE WORKFLOW                             |
+-----------------------------------------------------------------------------------+
  [Buyer/Vendor] --(1. Open Dispute + Upload Photo)--> [API /v1/disputes]
                                                              |
                                                              v
                                              [2. Sub-Second SQL Heuristics]
                                                              |
                   +------------------------------------------+-------------------+
                   | (Fail: SHA-256 match / Sybil velocity)                       | (Pass)
                   v                                                              v
       [Instant Security Freeze]                                      [3. Local Gemma 4 AI]
       - Drop Trust Score -50                                                     |
       - Auto-Resolve / Ban                                                       v
                                                             +--------------------+--------------------+
                                                             | (Confidence >= 0.90)                    | (Confidence < 0.90)
                                                             v                                         v
                                                   [Automated Action]                          [Human Review Queue]
                                                   - REFUND_BUYER or                           - Admin Dashboard
                                                   - RELEASE_VENDOR
```

---

## 6. Key Performance Indicators (KPIs)
1. **Automated Triage Rate**: Target `>= 80%` of disputes resolved autonomously without human escalation.
2. **Dispute Resolution Time**: Target median resolution time `< 10 seconds` for automated triage (vs. industry average 3–5 business days).
3. **Double-Spend / Webhook Replay Incidents**: Exactly `0`.
4. **False Positive Fraud Lockouts**: Target `< 0.5%` of verified vendor accounts.
