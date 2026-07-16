# Croe — Market & Regulatory Landscape (`02-Market-and-Regulatory.md`)

> **This is not legal advice.** It is an architecture-shaping summary. Every figure or license detail marked **[verify]** must be confirmed with a Ghanaian fintech lawyer or directly with the Bank of Ghana before handling real money. Custody phases (P0–P3) are defined in [`45-Glossary.md`](45-Glossary.md).

## 1. Market Context — Ghana First

- **Mobile Money is the dominant rail.** The primary networks are **MTN MoMo** (largest), **Telecel Cash**, and **AirtelTigo Money**. Most buyers and vendors already transact via MoMo, so Croe meets users where they are.
- **Aggregators** that expose these rails via API: **Paystack (Ghana)**, **Flutterwave**, **Hubtel**. Croe integrates one or more behind the `PaymentRail` abstraction ([`10-Architecture.md`](10-Architecture.md)).
- **Currency:** `GHS`. Architecture keeps currency explicit so Kenya (`KES`/M-Pesa) and Nigeria (`NGN`) can be added later as additional `PaymentRail` implementations.

## 2. Why Escrow Is a Regulated Activity

Holding a buyer's money between deposit and release is **custody of third-party funds**. In Ghana this is governed by the **Bank of Ghana (BoG)** under the **Payment Systems and Services Act, 2019 (Act 987)**. A platform that receives, holds, and disburses customer funds generally cannot do so on its own account without either:
- a relevant BoG licence (e.g. a **Payment Service Provider** tier or **Dedicated Electronic Money Issuer**), **[verify exact category]**, or
- operating on top of an already-licensed partner (bank / EPSP / DEMI) that holds the funds.

**Consequence for Croe:** the current "the platform holds funds in a secure escrow account" framing is not legal as-is. Croe's money architecture is therefore built as a **phased custody chain** where a licensed entity always holds the float.

## 3. The Phased-Custody Legal Path

| Phase | What Croe is, legally | Who holds the float | Legal standing |
| :--- | :--- | :--- | :--- |
| **P0 — Build** | A developer testing against sandboxes | Nobody (test money) | N/A — development only |
| **P1 — Pilot** | A merchant using an aggregator's settlement + delayed payout | The aggregator's settlement account | Interim/thin at scale — **keep pilot volumes low and supervised**; disclose to users |
| **P2 — Partner-held** | A tech/orchestration provider (likely registered as a **PFTSP** **[verify]**) riding a licensed partner's licence | Licensed bank / EPSP / DEMI partner, in a **pooled trust account** | Compliant — the "real and legal" launch milestone |
| **P3 — Own licence** | A BoG-licensed **EPSP / DEMI** | Croe | Fully licensed — later, volume-justified only |

**Minimum capital for P3 is in the millions of GHS [verify exact tier and amount]** and approval takes many months to years — out of scope for launch. See cost detail in [`03-Business-Model-and-Costs.md`](03-Business-Model-and-Costs.md).

## 4. KYC / AML Obligations

Even riding a partner's licence, Croe must operate KYC/AML controls (the partner will require it):

- **Customer Due Diligence (CDD):** verify identity proportionate to risk. Croe uses **tiered KYC** (Tier 0 phone-only → Tier 2 enhanced) with per-tier transaction limits — see [`21-KYC-and-AML.md`](21-KYC-and-AML.md). Threshold amounts are **[verify]** against BoG/partner requirements.
- **Record-keeping:** retain transaction and identity records for the statutory period **[verify duration]**. Croe's append-only `transaction_ledger` and forensic capture support this.
- **Suspicious-activity handling:** detect and (where required) report suspicious transactions to the **Financial Intelligence Centre (FIC)** **[verify process]**. v1 surfaces flags to the L3 console for manual handling.
- **Sanctions / PEP screening:** v1 manual; automated screening is future work.

## 5. Data Protection

Croe captures forensic artifacts (IP, device id, network type, media). Ghana's **Data Protection Act, 2012 (Act 843)** applies:
- Capture only what's needed for fraud prevention and dispute resolution; document the lawful basis.
- Secure storage; access limited to L3 review and reconciliation.
- A retention/deletion policy is defined in [`40-Security-Threat-Model.md`](40-Security-Threat-Model.md) and [`42-Observability-and-Reconciliation.md`](42-Observability-and-Reconciliation.md). Specific obligations **[verify]**.

## 6. Global Expansion Notes (post-Ghana)

The regulatory + rail layer is per-country and sits behind abstractions so escrow logic never changes:

| Market | Regulator | Dominant rail | Note |
| :--- | :--- | :--- | :--- |
| **Kenya** | Central Bank of Kenya | **M-Pesa** (Safaricom Daraja API) | New `PaymentRail` + custody-partner arrangement. |
| **Nigeria** | Central Bank of Nigeria | Cards, bank transfer, USSD, NIP | MoMo less dominant; different KYC (BVN/NIN). |

Each new market repeats the custody-phase evaluation and adds a `PaymentRail`/`CustodyProvider` implementation.

## 7. Required Action Before Real-Money Launch

> **Engage a Ghanaian fintech lawyer** (or a compliance consultant) to: confirm the correct BoG registration/licence category for the P1→P2 model, confirm KYC thresholds and record-keeping duration, and structure the partner trust-account agreement. Do not process real third-party funds at scale until P2 is in place.
