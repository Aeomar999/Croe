# Croe

**Escrow for social commerce, on Mobile Money. Ghana-first.**

Croe holds a buyer's Mobile Money (MoMo) payment until delivery is confirmed, then automatically pays the vendor - turning the "you send first" standoff that kills WhatsApp, Instagram, and TikTok sales into completed revenue.

---

### The Problem

Social commerce in Ghana runs on trust that does not exist. A buyer finds a smartphone or designer sneakers on Instagram and is asked to send MoMo to an unknown individual. The vendor is asked to dispatch goods via courier to someone who may refuse to pay. **Both positions are completely rational, and the sale dies between them.** 

Vendors routinely lose 20%–30% of qualified orders to payment anxiety. Buyers who do pay upfront absorb recurring fraud with zero recourse - no enforceable receipt, no neutral arbiter, and no path to a refund.

### The Solution

| Step | Action | Customer Experience |
|---|---|---|
| **1. Link** | Vendor generates a Croe escrow link | Shared directly in the WhatsApp/Instagram chat where the customer already is |
| **2. Pay** | Buyer authorizes payment via MoMo | Standard USSD prompt (MTN, Telecel, AirtelTigo). Funds lock in escrow - visible to the vendor, but untouched |
| **3. Ship** | Vendor dispatches the order | Dispatched against locked, verified money rather than an empty promise |
| **4. Release** | Buyer confirms delivery | Vendor is paid out automatically, less a 2.5% commission. If an issue arises, a structured dispute opens |

### Why This Is Hard - And Why We Are Ahead

1. **Escrow is a regulated activity, not a feature.** Holding third-party funds in Ghana falls under the Bank of Ghana (BoG) and the Payment Systems and Services Act, 2019 (Act 987). Unlicensed platforms get shut down; full licences require millions in capital. Croe solves this through a **phased custody chain** (`CustodyProvider` abstraction): Croe never holds client funds on its own balance sheet. In pilot, funds settle via aggregator settlement; in production, via a licensed partner bank/EPSP pooled trust account. Moving from pilot to institutional custody is a configuration switch, not a code rewrite.
2. **Disputes destroy unit economics without automation.** Human arbitration on small tickets is unprofitable. Croe runs a 3-tier pipeline: cryptographic media hashing (SHA-256 catches recycled scam imagery across vendors), deterministic SQL fraud heuristics (velocity and Sybil tripwires), and a self-hosted open-weights LLM arbitrator that handles straightforward claims and escalates only ambiguous cases to a human reviewer. **Customer data never leaves self-hosted infrastructure.**

### Status: Built, Tested, and Proven

**Croe is built, not a concept.** The complete backend and React Native mobile application are finished:
- 14-state escrow machine with an append-only financial ledger (`UPDATE`/`DELETE` revoked at DB level).
- HMAC-verified webhooks, replay protection, and Redis idempotency gates.
- Tiered KYC (Tier 0 phone-only to Tier 2 enhanced due diligence), forensic header capture, and daily 3-way automated reconciliation.
- **354 automated tests passing** (275 backend + 79 frontend), including concurrent-webhook race conditions and financial precision tests. Currently running end-to-end on aggregator sandbox.

### Business Model & Unit Economics

We earn **4.0% all-in** per successfully released transaction: a **2.5% vendor commission** (deducted from payout) plus a **1.5% buyer protection fee** (shown at checkout). **No fees on refunds** - if a buyer is refunded, Croe takes nothing.

Why 4% and not 2%: MoMo collection through Paystack or Hubtel costs **1.95%**, and each payout costs **GHS 1.00**. At 2% Croe would lose GHS 4–7 on every order.

- **Net per released order** (after collection, payout, fraud reserve, ID checks, refunds, SMS and hosting):
  - Lead category (phones, electronics, sneakers), **GHS 1,200** order: **GHS 16.80**
  - Base-case blended order, **GHS 800**: **GHS 10.33** (1.29% of order value)
  - General retail, **GHS 450** order: **GHS 4.67**
- **Company break-even:** **~62,000 released orders/month** at a GHS 800 average order, against a fully staffed month-36 cost base of GHS 637,000/month. At a 5% fee, or with direct telco rails, this drops to about 35,000.

### Market & Regional Scalability

Mobile Money is the financial backbone of Ghana (20M+ active accounts across MTN MoMo, Telecel Cash, and AirtelTigo). By placing payments and currency behind clean interfaces, **Kenya (M-Pesa) and Nigeria (NIP/Cards) are modular `PaymentRail` additions, not system rebuilds.**

### The Ask - Pre-Seed to a Licensed Launch

We are raising a **US$387k pre-seed** (range US$189k–713k; GHS 4.48M base) to take Croe from sandbox to a licensed, partner-held launch in **18 months**. Figures include 15% contingency and working capital. FX: US$1 = GHS 11.60.

| Stage | Months | Net need (base) | What it buys | Gate to next stage |
|---|---|---|---|---|
| **1 · Legal pilot** | 1–6 | **US$26k** | Company, DPC registration, lawyer's custody opinion, written aggregator approval, BoG sandbox or partner LOI, 10–50 vendors, ~500 capped live orders | Written aggregator or partner yes; measured buyer drop-off, order value and dispute rate |
| **2 · Compliant launch** | 7–18 | **US$360k** | BoG PFTSP licence, partner-bank trust account, the BoG management team (~12 staff), external pentest, ISO 27001, Accra + Kumasi, ~5,000 orders/month | Clean daily reconciliation, disputes under 8%, vendor retention |

A **seed round of ~US$916k** around month 15 funds stage 3: ~25 staff and ~30,000 orders/month by month 36. The total over 36 months is **US$1.30M**. Full line items: [`FINANCIAL-MODEL.md`](FINANCIAL-MODEL.md).

---

**Founding Team** · Croe Technologies · Accra, Ghana  
**Contact:** `founders@croe.app` · **Demo:** Live Sandbox Walkthrough Available
