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
| **4. Release** | Buyer confirms delivery | Vendor is paid out automatically, less a flat commission. If an issue arises, a structured dispute opens |

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

We earn a standard **2.0% commission** per successfully released transaction, deducted from vendor payout. **0% commission on refunds** - if a buyer is refunded, Croe takes nothing.

- **Lead Launch Category (Electronics, Smartphones, Streetwear):**
  - Average Order Value (AOV): **GHS 1,200.00**
  - Gross Commission (2.0%): **GHS 24.00**
  - Net Margin (after ~GHS 1.00 MoMo disbursement & SMS fees): **≈ GHS 22.50 – 23.00** per transaction
- **Baseline General Retail Comparison:**
  - AOV: GHS 450.00 → Gross Commission: GHS 9.00 → Net Margin: **≈ GHS 7.50 – 8.00**
- **Break-Even Volume:**
  - Against our target lean pilot fixed overhead of **< GHS 500/month**, break-even is achieved at just **~22 transactions/month** in our lead category (~63 transactions/month in general retail).

### Market & Regional Scalability

Mobile Money is the financial backbone of Ghana (20M+ active accounts across MTN MoMo, Telecel Cash, and AirtelTigo). By placing payments and currency behind clean interfaces, **Kenya (M-Pesa) and Nigeria (NIP/Cards) are modular `PaymentRail` additions, not system rebuilds.**

### The Ask - Dual-Track Pilot Funding

We are raising funding to transition Croe from sandbox completion to a live, supervised 60-day pilot with **10–20 hand-recruited high-ticket vendors**:

| Funding Track | Amount | Target Allocation | Milestone Funded |
|---|---|---|---|
| **Track A: Lean Bootstrap** | **GHS 30,000**<br>*(~$2,500 USD)* | Entity incorporation (ORC + TIN), DPC registration, T+2 working capital float, base hosting/SMS, 60-day pilot ops. | First 100+ live transactions on compliant rails, measured conversion, and baseline dispute rate. |
| **Track B: Institutional / Angel** | **GHS 150,000**<br>*(~$12,500 USD)* | Track A + formal fintech legal counsel (BoG PFTSP opinion & custody trust structuring), external penetration test, managed production infrastructure, and funded loss reserve. | Complete de-risking for institutional P2 partner bank onboarding and seed accelerator applications. |

---

**Founding Team** · Croe Technologies · Accra, Ghana  
**Contact:** `founders@croe.app` · **Demo:** Live Sandbox Walkthrough Available
