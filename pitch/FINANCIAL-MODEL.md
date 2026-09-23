# Croe - Financial Model & Unit Economics Reference

> **Stakeholder Reference Document.** This document provides the mathematical foundation, unit economics, sensitivity models, and itemized capital requirements for Croe.
> All monetary calculations conform to rule **FIN-01** (exact 2-decimal precision, no floating-point distortion) and rule **FIN-02** (explicit currency codes: GHS, USD).

---

## 1. Executive Summary of Numbers

| Metric | Lead Launch Vertical (Electronics & Streetwear) | Baseline General Commerce |
| :--- | :--- | :--- |
| **Target Average Order Value (AOV)** | **GHS 1,200.00** | **GHS 450.00** |
| **Croe Commission Rate** | **2.0%** (deducted from vendor payout) | **2.0%** |
| **Gross Commission per Order** | **GHS 24.00** | **GHS 9.00** |
| **Disbursement & Transaction Cost** | ~GHS 1.50 (GHS 1.00 MoMo B2C + GHS 0.50 SMS) | ~GHS 1.50 |
| **Croe Net Margin per Order (`C`)** | **≈ GHS 22.50 – 23.00** | **≈ GHS 7.50 – 8.00** |
| **Monthly Fixed Overhead (`F`, Lean)** | **< GHS 500.00 / month** | **< GHS 500.00 / month** |
| **Break-Even Monthly Volume (`F / C`)** | **~22 transactions / month** | **~63 transactions / month** |
| **Break-Even Monthly GMV** | **GHS 26,400.00** | **GHS 28,350.00** |

---

## 2. Unit Economics Across Commercial Tiers

Croe charges a flat **2.0% commission** on released funds. A `FUNDS_REFUNDED` transaction earns Croe GHS 0.00 (buyer is made whole).

The table below breaks down the full money flow across three representative basket sizes:

| Financial Line | Tier 1: General Retail | Tier 2: Curated Thrift & Beauty | Tier 3: Electronics & Streetwear *(Lead)* |
| :--- | :--- | :--- | :--- |
| **Buyer Escrow Deposit** | **GHS 450.00** | **GHS 700.00** | **GHS 1,200.00** |
| Aggregator Collection Cost (1.5%)* | *(GHS 6.75)* | *(GHS 10.50)* | *(GHS 18.00)* |
| **Croe Gross Commission (2.0%)** | **+GHS 9.00** | **+GHS 14.00** | **+GHS 24.00** |
| MoMo B2C Payout / Disbursement Fee | −GHS 1.00 | −GHS 1.00 | −GHS 1.00 |
| Allocated SMS & Variable Tech Cost | −GHS 0.50 | −GHS 0.50 | −GHS 0.50 |
| **Croe Net Profit per Transaction (`C`)** | **≈ GHS 7.50** | **≈ GHS 12.50** | **≈ GHS 22.50** |
| **Net Vendor Payout (Less Commission)** | **GHS 441.00** | **GHS 686.00** | **GHS 1,176.00** |
| **Croe Net Take Rate** | **1.67%** | **1.79%** | **1.88%** |

*\*Note: Aggregator collection fee is a cost of goods settled against the pool or merchant account. Under the standard P1 model, the collection fee is absorbed or passed through depending on aggregator contract terms.*

---

## 3. Fixed Operating Cost Architecture

### 3.1 Tier A: Lean Pilot Infrastructure (Target: < GHS 500 / month)
Optimized for the 60-day supervised pilot (10–20 vendors, CPU-only local LLM inference, manual L3 escalation):

| Item | Monthly Cost (GHS) | Monthly Cost (USD @ 12:1) | Notes |
| :--- | :--- | :--- | :--- |
| App API Hosting (Render / Railway / VPS) | GHS 150.00 | $12.50 | Node.js 20 LTS API |
| Managed PostgreSQL 16+ | GHS 150.00 | $12.50 | Dedicated connection pooling |
| Managed Redis 7.2+ | GHS 75.00 | $6.25 | Fast dedup and rate limiting |
| Object Storage (Cloudflare R2 / S3) | GHS 30.00 | $2.50 | Content-addressed evidence media |
| AI Arbitrator (CPU / Local Ollama) | **GHS 0.00** | $0.00 | Handled on host CPU / manual L3 review |
| Notification Matrix (SMS sender base + OTPs) | GHS 60.00 | $5.00 | Pay-as-you-go via Hubtel / Twilio |
| Domain, TLS & Health Monitoring | GHS 35.00 | $3.00 | BetterStack / Uptime Kuma |
| **Total Monthly Fixed Costs (`F_lean`)** | **GHS 500.00** | **$41.75** | **Highly disciplined student-budget baseline** |

### 3.2 Tier B: High-Availability Institutional Scale (Target: ~GHS 3,000 / month)
Required when transaction volumes justify continuous self-hosted GPU inference and multi-AZ failover:

| Item | Monthly Cost (GHS) | Monthly Cost (USD @ 12:1) | Notes |
| :--- | :--- | :--- | :--- |
| Multi-AZ Compute Cluster | GHS 600.00 | $50.00 | Redundant API containers |
| High-Availability PostgreSQL with PITR | GHS 500.00 | $41.70 | Continuous archiving for financial ledger |
| Redundant Redis Cluster | GHS 250.00 | $20.80 | High-throughput session & idempotency cache |
| Dedicated GPU Instance (vLLM / Ollama) | **GHS 1,200.00** | $100.00 | Autonomous dispute triage (sub-second) |
| Enterprise SMS & WhatsApp Business API | GHS 300.00 | $25.00 | High-deliverability transactional messaging |
| Datadog / Sentry / CloudWatch Logging | GHS 150.00 | $12.50 | Full forensic audit log retention |
| **Total Monthly Fixed Costs (`F_scale`)** | **GHS 3,000.00** | **$250.00** | **Institutional production posture** |

---

## 4. Break-Even Sensitivity & Ticket-Size Leverage

The equation governing monthly break-even is:
$$\text{Break-Even Transactions } (N) = \frac{\text{Monthly Fixed Overhead } (F)}{\text{Net Margin per Transaction } (C)}$$

| Monthly Fixed Overhead (`F`) | Baseline General (AOV GHS 450, `C` ≈ GHS 7.50) | Mid-Ticket (AOV GHS 700, `C` ≈ GHS 12.50) | Lead Vertical (AOV GHS 1,200, `C` ≈ GHS 22.50) |
| :--- | :--- | :--- | :--- |
| **GHS 500 / mo (Lean Pilot)** | **67 txns / mo** | **40 txns / mo** | **22 txns / mo** |
| **GHS 1,500 / mo** | 200 txns / mo | 120 txns / mo | **67 txns / mo** |
| **GHS 3,000 / mo (GPU Scale)** | 400 txns / mo | 240 txns / mo | **133 txns / mo** |

### Strategic Insight
Moving from general low-ticket retail to our **lead vertical (electronics & streetwear resellers)** delivers a **3× reduction in break-even transaction volume**. A pilot cohort of just 10 vendors doing 3 sales per month clears the break-even hurdle immediately.

---

## 5. Working Capital, Settlement Lag & Float

### The Settlement Lag Reality
When an aggregator settles funds to Croe at **T+2** (standard settlement cycle in Ghana), but Croe releases funds to a vendor at **T+0** upon delivery confirmation, Croe must bridge the settlement lag with working capital.

$$\text{Required Float} = \text{Daily Released GMV} \times \text{Settlement Days } (2)$$

| Monthly Released Transactions | Monthly GMV (AOV GHS 1,200) | Daily Released GMV | Required T+2 Float | Recommended Loss Reserve (2% GMV) |
| :--- | :--- | :--- | :--- | :--- |
| **25 txns / mo (Early Pilot)** | GHS 30,000.00 | GHS 1,000.00 | **GHS 2,000.00** | GHS 600.00 |
| **100 txns / mo (Target Pilot)** | GHS 120,000.00 | GHS 4,000.00 | **GHS 8,000.00** | GHS 2,400.00 |
| **300 txns / mo (Post-Pilot)** | GHS 360,000.00 | GHS 12,000.00 | **GHS 24,000.00** | GHS 7,200.00 |
| **1,000 txns / mo (Growth Scale)**| GHS 1,200,000.00 | GHS 40,000.00 | **GHS 80,000.00** | GHS 24,000.00 |

*Policy option in pilot:* If working capital is constrained, vendor disbursement timing can match the aggregator settlement cycle (T+1/T+2) with zero float requirement, though T+0 instant payout provides superior vendor retention.

---

## 6. Itemized Capital Requirements: Dual Funding Tracks

### Track A: Lean Bootstrap Pilot Budget (GHS 30,000 / ~$2,500 USD)
*Objective: Reach live, supervised trading with 10–20 vendors at absolute minimum cash outlay.*

| Category | Line Item | Budget (GHS) | USD Equiv. |
| :--- | :--- | :--- | :--- |
| **Corporate Setup** | Limited Company Registration (ORC) + GRA TIN | GHS 800.00 | $67.00 |
| **Compliance** | Data Protection Commission (DPC) Registration | GHS 600.00 | $50.00 |
| **Banking** | Corporate Bank Account Opening & Minimum Deposit | GHS 1,000.00 | $83.00 |
| **Developer Accounts**| Apple Developer ($99) + Google Play Developer ($25) | GHS 1,500.00 | $125.00 |
| **Legal Review** | Targeted review of Terms of Service & escrow disclosure | GHS 6,000.00 | $500.00 |
| **Treasury & Float** | Initial T+2 Working Capital Float & Loss Buffer | GHS 5,000.00 | $417.00 |
| **Infrastructure** | 3 Months Managed Hosting, SMS Base & Storage | GHS 2,500.00 | $208.00 |
| **Pilot Operations** | Vendor Onboarding, WhatsApp SIM, Field Materials | GHS 2,600.00 | $217.00 |
| **Contingency Buffer**| Unforeseen operational or transaction variance | GHS 10,000.00 | $833.00 |
| **Total Track A** | | **GHS 30,000.00** | **~$2,500.00** |

---

### Track B: Institutional / Accelerated Pilot Budget (GHS 150,000 / ~$12,500 USD)
*Objective: Complete institutional de-risking, Bank partner P2 trust structuring, external security audit, and 6 months runway for venture accelerator entry.*

| Category | Line Item | Budget (GHS) | USD Equiv. |
| :--- | :--- | :--- | :--- |
| **Legal & Regulatory** | Specialist Fintech Legal Counsel (BoG PFTSP opinion, P2 partner trust-account contract structuring, custom ToS & liability caps) | GHS 45,000.00 | $3,750.00 |
| **Security Audit** | Independent External Penetration Test & Code Audit | GHS 35,000.00 | $2,917.00 |
| **Entity & Compliance**| Company formation via agent, DPC registration, IP assignment, corporate trademark filing | GHS 8,000.00 | $667.00 |
| **Treasury & Float** | Dedicated T+2 Working Capital Float | GHS 15,000.00 | $1,250.00 |
| **Loss Reserve** | Ring-fenced customer dispute / fraud reserve | GHS 10,000.00 | $833.00 |
| **Infrastructure** | 6 Months Multi-AZ Hosting, Postgres PITR, S3, SMS | GHS 15,000.00 | $1,250.00 |
| **Developer Accounts**| Apple ($99), Google ($25), Production SSL, Domain | GHS 2,000.00 | $166.00 |
| **Field Acquisition** | High-touch pilot vendor onboarding & collateral | GHS 5,000.00 | $417.00 |
| **Contingency / Buffer**| Operational runway & banking fees buffer | GHS 15,000.00 | $1,250.00 |
| **Total Track B** | | **GHS 150,000.00** | **~$12,500.00** |

---

## 7. Pilot Success Validation Thresholds

During the 60-day supervised pilot, capital deployment is governed by the following strict performance gates:

1. **Transaction Velocity:** Minimum 63 completed transactions across the cohort.
2. **Net Unit Margin:** Verified $\ge$ GHS 22.00 in lead vertical ($\ge$ GHS 7.50 in baseline).
3. **Dispute Rate:** Maintained below 8% of total volume.
4. **Adjudication Accuracy:** Over 95% of claims resolved without appeal or merchant dissatisfaction.
5. **Reconciliation Variance:** 0.00 GHS variance across daily 3-way balance checks.
