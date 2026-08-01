# Croe

**Escrow for social commerce, on Mobile Money. Ghana-first.**

Croe holds a buyer's MoMo payment until delivery is confirmed, then pays the vendor automatically — turning the "you send first" standoff that kills WhatsApp and Instagram sales into a completed transaction.

---

### The problem

Social commerce in Ghana runs on trust that doesn't exist. A buyer finds a phone on Instagram and is asked to send MoMo to a stranger. The vendor is asked to ship goods to someone who may never pay. **Both positions are rational, and the sale dies between them.** Vendors lose orders they should have closed; buyers who do pay get scammed with no recourse — no receipt that means anything, no arbiter, no way to get money back.

### The solution

| | |
|---|---|
| **1. Link** | Vendor generates a Croe payment link, shares it in the chat where the sale is already happening |
| **2. Pay** | Buyer pays through the familiar MoMo USSD prompt. Funds are locked in escrow — vendor can see they're secured, but cannot touch them |
| **3. Ship** | Vendor ships against confirmed money instead of a promise |
| **4. Release** | Buyer confirms delivery; the vendor is paid automatically, less commission. If something goes wrong, a structured dispute opens instead of an argument |

### Why this is hard — and why we're ahead

**Escrow is a regulated activity, not a feature.** Holding third-party funds in Ghana falls under the Bank of Ghana and the Payment Systems and Services Act, 2019 (Act 987). Most attempts at this either ignore that and get shut down, or stall waiting for a licence that requires millions of GHS in capital.

Croe is built around a **phased custody chain** — the platform never holds funds on its own account. A licensed entity always holds the float, and the software's `CustodyProvider` abstraction means moving from an aggregator-settled pilot to a bank-held trust account is a configuration change, not a rewrite. The compliance path is designed in, not retrofitted.

**Disputes are the second hard problem.** Escrow only works if disagreements get resolved fairly and cheaply. Croe runs a three-tier pipeline: cryptographically hashed forensic evidence (SHA-256 media hashing catches recycled scam photos), sub-second SQL fraud heuristics, and a self-hosted LLM arbitrator that escalates only genuinely ambiguous cases to a human. **Customer data never leaves our infrastructure.**

### Status

**The product is built, not planned.** A complete backend and React Native mobile app: 14-state escrow machine, append-only financial ledger, HMAC-verified webhooks with idempotency, tiered KYC, forensic evidence capture, AI dispute triage, admin console, and daily reconciliation. **354 automated tests passing**, including concurrent-webhook race, money-precision, and fraud tests. Running end-to-end on aggregator sandbox.

Currently pre-launch: entity formation and the licensed-custody pilot arrangement are in progress.

### Business model

Commission of **[FILL: 1.5–2.5]%** per successfully released transaction. No commission on refunds — if the buyer gets their money back, we earn nothing. Revenue scales directly with completed, satisfied trades.

*Unit economics on a GHS 450 order, pending confirmed aggregator pricing: commission GHS ~9.00, net ~GHS 8.00 after disbursement fees. Break-even at roughly 63 released transactions per month against target fixed costs.*

### Market

Mobile Money is the dominant payment rail in Ghana — MTN MoMo, Telecel Cash, AirtelTigo Money — and social commerce runs on top of it with no trust layer. The architecture keeps currency and payment rails behind abstractions, so **Kenya (M-Pesa) and Nigeria are additional implementations, not rebuilds.**

### The ask

**[FILL: amount]** to fund: legal and regulatory setup for a supervised pilot, licensed-custody partner onboarding, and a 60-day pilot with **[FILL: N]** hand-recruited vendors in high-ticket categories (electronics, sneakers, thrift).

**Milestone this funds:** first real transactions on licensed rails, with measured dispute rate, adjudication accuracy, and vendor retention.

---

**[FILL: Name]** · Founder · **[FILL: email]** · **[FILL: phone]** · **[FILL: link to demo]**
